import path from "path";
import mongoose from "mongoose";
import { createPhotoStore } from "./photoStorage.js";
import * as s3 from "./s3Storage.js";
import * as quota from "./storageQuota.js";
import { PendingPhotoDeletion } from "../models/StorageUsage.js";
import CreateEvent from "../models/CreateEvent.js";

// Create Event cover + gallery photos, stored in MongoDB GridFS bucket
// "createEventPhotos" — see services/photoStorage.js. The CreateEvent
// document keeps only the URL, "/api/create-events/photos/<fileId>".
//
// When S3 is configured (S3_PHOTO_BUCKET, see services/s3Storage.js), NEW
// photos go to a private S3 bucket instead, with URL
// "/api/create-events/photos/s3/<key>". Photos already in GridFS stay there
// and keep working; both kinds are viewed, downloaded and deleted the same way.
//
// These photos were never stored on disk, so the legacy prefix/dir below
// never match anything; createPhotoStore just requires them.
const BUCKET_NAME = "createEventPhotos";
const URL_PREFIX = "/api/create-events/photos/";

const store = createPhotoStore({
  bucketName: BUCKET_NAME,
  urlPrefix: URL_PREFIX,
  legacyPrefix: "/uploads/create-events/",
  legacyDir: path.join(process.cwd(), "uploads", "create-events"),
  // Unguessable file ids: with Face Search on, guests must not be able to
  // reach other photos by guessing ids next to one they were shown.
  randomIds: true,
  // A deleted photo must stop showing straight away (no long-lived caching).
  revalidate: true,
});

// Optional cap on Create Event photos stored in S3 (S3_STORAGE_LIMIT_GB, e.g.
// 5); unset or 0 = no cap. Usage = sizes of S3 photos recorded in MongoDB,
// recounted at most once a minute plus this process's uploads since — a soft
// limit (parallel uploads can go slightly over), so the bucket never grows
// far past the target unnoticed.
const storageLimitBytes = () => (Number(process.env.S3_STORAGE_LIMIT_GB) || 0) * 1024 ** 3;
const usage = { bytes: 0, at: 0 };
const s3UsageBytes = async () => {
  if (Date.now() - usage.at > 60000) {
    const [row] = await mongoose.connection
      .collection("createevents")
      .aggregate([
        { $unwind: "$photos" },
        { $match: { "photos.url": { $regex: `^${s3.S3_URL_PREFIX.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}` } } },
        { $group: { _id: null, bytes: { $sum: "$photos.size" } } },
      ])
      .toArray();
    usage.bytes = row?.bytes || 0;
    usage.at = Date.now();
  }
  return usage.bytes;
};
const storageFull = async (size) => {
  const limit = storageLimitBytes();
  return limit > 0 && (await s3UsageBytes()) + size > limit;
};

const storeError = (error) => Object.assign(new Error("Couldn't store the photo — please try again"), { status: 503, cause: error });

// Holds the file's bytes against the photographer's storage quota
// (services/storageQuota.js) → hold id; a StorageQuotaError is passed on as
// is (its message is shown to the user), anything else as a storage error.
const reserveQuota = async (req, size) => {
  try {
    return await quota.reserve(req.userId, size);
  } catch (error) {
    throw error instanceof quota.StorageQuotaError ? error : storeError(error);
  }
};

// multer storage engine: S3 when configured, otherwise GridFS as before.
// Each file is at most 25 MB (multer's fileSize limit), so it's collected and
// sent to S3 in one PUT; the original bytes are stored unchanged. Objects go
// under the signed-in owner's prefix (the controller still checks the event
// belongs to them, and discards the upload otherwise).
// Every accepted file holds its size against the uploader's quota
// (file.quotaHold); the controller commits the holds once the photos are
// saved (commitUploads) or releases them (discardUploads). A file that
// doesn't fit fails the request; multer then removes the request's other
// files via _removeFile, which releases their holds too.
export const createEventPhotoMulterStorage = () => {
  const gridfs = store.multerStorage();
  return {
    _handleFile(req, file, cb) {
      if (!s3.s3Enabled()) {
        // GridFS streams the file in, so its size is known only afterwards.
        return gridfs._handleFile(req, file, (err, info) => {
          if (err) return cb(err);
          reserveQuota(req, info.size).then(
            (quotaHold) => cb(null, { ...info, quotaHold }),
            async (error) => {
              await store.remove(info.url);
              cb(error);
            }
          );
        });
      }
      const chunks = [];
      let size = 0;
      file.stream.on("data", (c) => {
        chunks.push(c);
        size += c.length;
      });
      file.stream.once("error", cb);
      file.stream.once("end", async () => {
        if (file.stream.truncated) return cb(Object.assign(new Error("File too large"), { code: "LIMIT_FILE_SIZE" }));
        try {
          if (await storageFull(size)) {
            return cb(Object.assign(new Error("Photo storage is full — delete some photos or raise the storage limit"), { status: 507 }));
          }
        } catch (error) {
          return cb(storeError(error));
        }
        let quotaHold;
        try {
          quotaHold = await reserveQuota(req, size);
        } catch (error) {
          return cb(error);
        }
        const key = s3.newKey(String(req.userId), req.params?.id, file.originalname);
        try {
          await s3.putObject(key, Buffer.concat(chunks, size), file.mimetype);
          usage.bytes += size;
          cb(null, { url: s3.keyToUrl(key), size, quotaHold });
        } catch (error) {
          await s3.deleteObject(key);
          await quota.release(req.userId, [quotaHold]).catch(() => {});
          cb(storeError(error));
        }
      });
    },
    _removeFile(req, file, cb) {
      Promise.all([
        file.quotaHold ? quota.release(req.userId, [file.quotaHold]).catch(() => {}) : null,
        removeStoredPhoto(file.url),
      ]).then(() => cb(null));
    },
  };
};

const requestFiles = (req) => [].concat(req.files || [], req.file || []).filter(Boolean);

// The request's uploaded files are now saved to an event: their bytes count
// as used storage. Never throws (the photos are saved either way; a missed
// count is fixed by reconcileStorageUsage).
export const commitUploads = (req) =>
  quota
    .commit(req.userId, requestFiles(req).filter((f) => f.quotaHold).map((f) => ({ id: f.quotaHold, bytes: f.size || 0 })))
    .catch((error) => console.error("Storage quota commit failed:", error?.name || "error"));

// The request failed after its files were stored: deletes them and releases
// their quota holds.
export const discardUploads = async (req) => {
  const files = requestFiles(req);
  await quota.release(req.userId, files.map((f) => f.quotaHold).filter(Boolean)).catch(() => {});
  await discardPhotos(files.map((f) => f.url));
};

export const streamCreateEventPhoto = store.stream;

// GET /api/create-events/photos/s3/<key> — public like the GridFS route
// (<img> tags can't send the JWT; keys are unguessable): redirects to a
// short-lived presigned URL, so the bucket stays private. Not cached, so a
// deleted photo stops showing straight away.
export const streamS3Photo = async (req, res) => {
  const key = [].concat(req.params.key || []).join("/");
  if (!s3.isS3Key(key)) return res.status(404).json({ message: "Photo not found" });
  if (!s3.s3Enabled()) return res.status(503).json({ message: "Photo storage is not available" });
  try {
    const url = await s3.presignGet(key, 600);
    res.set("Cache-Control", "no-cache");
    res.redirect(302, url);
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

const isStored = (url) => !!s3.keyFromUrl(url) || store.isStoredUrl(url);

// Deletes one stored photo (S3 object or GridFS file). Never throws. With a
// userId, only that owner's photos are deleted. Resolves to true once the
// file is gone, false if it couldn't be deleted.
const removeStoredPhoto = async (url, options = {}) => {
  const key = s3.keyFromUrl(url);
  if (!key) return store.remove(url, options);
  if (options.userId !== undefined && s3.ownerOfKey(key) !== String(options.userId)) return false;
  const deleted = await s3.deleteObject(key);
  usage.at = 0; // recount before the next upload: freed space is usable at once
  return deleted;
};

// Every stored photo URL an event references (cover + gallery photos).
const referencedUrls = (event) =>
  new Set([event?.coverPhoto, ...(event?.photos || []).map((p) => p.url)].filter(Boolean));

const FIRST_RETRY_MS = 5 * 60 * 1000;

// Step 1 of deleting stored files, BEFORE the photos/cover are removed from
// their event: records each file as pending deletion (its bytes stay counted
// until the file is confirmed gone). A crash after this point can't lose
// track of a file: the background sweeper finishes the job — or, if the
// event change never happened and the file is still used, just drops the
// record. sizes: optional Map url → bytes already known (gallery photos).
export const recordPendingDeletions = async (userId, urls, sizes = new Map()) => {
  const targets = [...new Set(urls)].filter((url) => isStored(url));
  if (!targets.length) return;
  const unknown = targets.filter((url) => !(sizes.get(url) > 0));
  const looked = unknown.length ? await quota.storedSizes(unknown).catch(() => new Map()) : new Map();
  await PendingPhotoDeletion.insertMany(
    targets.map((url) => ({
      user: userId,
      url,
      bytes: sizes.get(url) > 0 ? sizes.get(url) : looked.get(url) || 0,
      nextAttemptAt: new Date(Date.now() + FIRST_RETRY_MS),
    })),
    { ordered: false }
  ).catch((err) => {
    // Already pending (a retried request) is fine.
    if (err?.code !== 11000 && !err?.writeErrors?.every((e) => e.code === 11000)) throw err;
  });
  // A recount running right now must not use what it counted before this.
  await quota.touch(userId);
};

// Step 2, after the event was saved: deletes each of the user's photos in
// `urls` that the event no longer references — so a gallery photo that is
// also the cover (or vice versa) is kept until neither uses it. Pass event =
// null to delete them all. Files still referenced just lose their pending
// record. A file's bytes are freed only once it's confirmed deleted; if the
// delete fails it stays pending and is retried in the background.
export const removeUnreferencedPhotos = async (urls, event, userId, sizes = new Map()) => {
  const stillUsed = referencedUrls(event);
  const stored = [...new Set(urls)].filter((url) => isStored(url));
  const kept = stored.filter((url) => stillUsed.has(url));
  const targets = stored.filter((url) => !stillUsed.has(url));
  if (kept.length) await PendingPhotoDeletion.deleteMany({ user: userId, url: { $in: kept }, claimedAt: null });
  if (!targets.length) return;
  await recordPendingDeletions(userId, targets, sizes); // no-op for files already recorded in step 1
  await Promise.all(targets.map((url) => settleDeletion(userId, url)));
};

const retryBaseMs = () => Number(process.env.STORAGE_CLEANUP_RETRY_MS) || 60000;
// A claim older than this belongs to a process that died mid-way.
const CLAIM_TTL_MS = 10 * 60 * 1000;

// Tries to delete one pending file; frees its bytes once it's confirmed gone.
//   checkReferences (background retries): if any event of the user uses the
//   file again — or still does, because the event change never happened — it
//   is NOT deleted; only the pending record is dropped (its bytes are counted
//   through that event).
// Freeing: the pending record is first claimed (only one process can), then
// the bytes are freed, then the record is removed. A crash in between leaves
// a stale claim, which is dropped WITHOUT freeing again (at worst the bytes
// stay counted until the next recount) — never freed twice.
const settleDeletion = async (userId, url, { checkReferences = false } = {}) => {
  if (checkReferences && (await CreateEvent.exists({ user: userId, $or: [{ "photos.url": url }, { coverPhoto: url }] }))) {
    await PendingPhotoDeletion.deleteOne({ user: userId, url, claimedAt: null });
    return "kept";
  }
  if (!(await removeStoredPhoto(url, { userId }))) {
    const pending = await PendingPhotoDeletion.findOneAndUpdate(
      { user: userId, url, claimedAt: null },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" }
    );
    if (pending) {
      const delay = Math.min(retryBaseMs() * 2 ** Math.min(pending.attempts - 1, 10), 6 * 60 * 60 * 1000);
      await PendingPhotoDeletion.updateOne({ _id: pending._id }, { $set: { nextAttemptAt: new Date(Date.now() + delay) } });
    }
    return "failed";
  }
  const claimed = await PendingPhotoDeletion.findOneAndUpdate(
    { user: userId, url, claimedAt: null },
    { $set: { claimedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!claimed) return "deleted"; // freed by another process
  await quota.free(userId, claimed.bytes);
  await PendingPhotoDeletion.deleteOne({ _id: claimed._id });
  return "deleted";
};

// Background work (every STORAGE_CLEANUP_INTERVAL_MS, default 10 min):
//   • retries deletions that failed or were interrupted;
//   • drops stale claims (a process died between claiming and finishing) and
//     asks for a recount of that user;
//   • recounts ledgers that need it (reconcileStorageUsage — never while an
//     upload is in progress, never counting a file twice).
let sweeper = null;
export const runStorageMaintenance = async () => {
  const now = Date.now();
  const due = await PendingPhotoDeletion.find({ claimedAt: null, nextAttemptAt: { $lte: new Date(now) } })
    .sort({ nextAttemptAt: 1 })
    .limit(50)
    .lean();
  for (const d of due) await settleDeletion(d.user, d.url, { checkReferences: true });

  const stale = await PendingPhotoDeletion.find({ claimedAt: { $ne: null, $lt: new Date(now - CLAIM_TTL_MS) } }).limit(50).lean();
  for (const d of stale) {
    await PendingPhotoDeletion.deleteOne({ _id: d._id, claimedAt: d.claimedAt });
    await quota.requestReconcile(d.user);
  }

  for (const user of await quota.ledgersToReconcile()) {
    await quota.reconcileStorageUsage(user).catch((error) => console.error("Storage recount:", error?.name || "error"));
  }
};
export const startPendingDeletionSweeper = () => {
  if (sweeper) return;
  const interval = Number(process.env.STORAGE_CLEANUP_INTERVAL_MS) || 10 * 60 * 1000;
  let running = false;
  sweeper = setInterval(async () => {
    if (running || mongoose.connection.readyState !== 1) return;
    running = true;
    try {
      await runStorageMaintenance();
    } catch (error) {
      console.error("Storage maintenance:", error?.name || "error");
    } finally {
      running = false;
    }
  }, interval);
  sweeper.unref();
};

// Deletes photos stored during a request that then failed.
export const discardPhotos = (urls) => Promise.all(urls.filter(Boolean).map((url) => removeStoredPhoto(url)));

const fileIdFromUrl = (url) => {
  const id = typeof url === "string" && url.startsWith(URL_PREFIX) ? url.slice(URL_PREFIX.length) : "";
  return /^[0-9a-f]{24}$/i.test(id) ? new mongoose.Types.ObjectId(id) : null;
};

// A safe "<name>.<ext>" for the Content-Disposition header.
const downloadName = (name, contentType) => {
  const ext = (String(contentType).split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
  const base = String(name || "photo").replace(/\.[^.]*$/, "").replace(/[^\w.-]+/g, "_").slice(0, 80) || "photo";
  return `${base}.${ext}`;
};

// Sends one stored photo as a file download (Content-Disposition:
// attachment). Resolves to:
//   "missing"  — the file isn't in storage (nothing was sent)
//   "sent"     — every byte was handed to the client
//   "failed"   — the transfer broke off part-way (read error / client left)
// Where a stored photo's bytes come from: { length, contentType, stream() },
// or null if it isn't in storage.
const openStoredPhoto = async (url) => {
  const key = s3.keyFromUrl(url);
  if (key) {
    if (!s3.s3Enabled()) return null;
    const object = await s3.getObject(key);
    return object && { length: object.size, contentType: object.contentType, stream: () => object.body };
  }
  const fileId = fileIdFromUrl(url);
  if (!fileId) return null;
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
  const file = await bucket.find({ _id: fileId }).next();
  return file && { length: file.length, contentType: file.metadata?.contentType, stream: () => bucket.openDownloadStream(fileId) };
};

// A stored photo's original bytes (for server-side processing such as face
// grouping), or null if it isn't in storage. Photos are at most 25 MB.
export const readStoredPhoto = async (url) => {
  const source = await openStoredPhoto(url);
  if (!source) return null;
  const chunks = [];
  for await (const chunk of source.stream()) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  // A cut-off read is a storage error (retried), not a damaged photo.
  if (Number.isFinite(source.length) && bytes.length !== source.length) throw new Error("Incomplete read from photo storage");
  return { bytes, contentType: source.contentType || "" };
};

export const sendPhotoDownload = async (url, res, name) => {
  const source = await openStoredPhoto(url);
  if (!source) return "missing";

  const contentType = source.contentType || "application/octet-stream";
  res.set({
    "Content-Type": contentType,
    "Content-Length": source.length,
    "Content-Disposition": `attachment; filename="${downloadName(name, contentType)}"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });

  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    res.once("finish", () => done("sent"));
    res.once("close", () => done(res.writableFinished ? "sent" : "failed"));
    source
      .stream()
      .once("error", () => {
        done("failed");
        res.destroy();
      })
      .pipe(res);
  });
};
