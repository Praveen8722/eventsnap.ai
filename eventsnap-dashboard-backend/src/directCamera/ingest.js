import crypto from "crypto";
import { once } from "events";
import path from "path";
import mongoose from "mongoose";
import CreateEvent from "../models/CreateEvent.js";
import { DirectCameraConfig, DirectCameraFingerprint, DirectCameraUpload } from "../models/DirectCamera.js";
import { verifyPassword } from "./credentials.js";
import * as quota from "../services/storageQuota.js";

// Direct Camera Auto Upload — turns one uploaded file into an event photo.
// Stored exactly like the dashboard's own uploads: the original bytes in the
// "createEventPhotos" GridFS bucket (random id, metadata contentType + user)
// and a photos[] entry on the CreateEvent with its
// "/api/create-events/photos/<fileId>" url, so the gallery, guest page,
// downloads and deletion all work unchanged.

const BUCKET = "createEventPhotos";
const URL_PREFIX = "/api/create-events/photos/";
const MAX_PHOTOS_PER_EVENT = 10000; // as controllers/createEventController.js

export const maxUploadBytes = () => (Number(process.env.DIRECT_CAMERA_MAX_MB) || 25) * 1024 * 1024;

// Accepted formats: checked from the file's first bytes, and the file name's
// extension must match. (RAW files can't be shown in a web gallery.)
const FORMATS = {
  jpeg: { mime: "image/jpeg", exts: [".jpg", ".jpeg"] },
  png: { mime: "image/png", exts: [".png"] },
  heif: { mime: "image/heif", exts: [".heic", ".heif", ".hif"] },
};
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

const sniff = (head) => {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpeg";
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (head.subarray(4, 8).toString("latin1") === "ftyp" && HEIF_BRANDS.has(head.subarray(8, 12).toString("latin1"))) return "heif";
  return null;
};

export const safeFileName = (name) =>
  path.posix
    .basename(String(name || "").replace(/\\/g, "/"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 200) || "photo.jpg";

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET });

const record = (config, entry, statsKey, extra = {}) =>
  Promise.all([
    DirectCameraUpload.create({ event: config.event, ...entry }),
    DirectCameraConfig.updateOne(
      { _id: config._id },
      { $inc: { [`stats.${statsKey}`]: 1 }, ...(Object.keys(extra).length ? { $set: extra } : {}) }
    ),
  ]).catch(() => {});

// Constant-ish time login check (a missing user still costs one scrypt).
const DUMMY = { passwordHash: "00".repeat(32), passwordSalt: "00" };

// → { config } on success, or { error: "invalid" | "disabled" | "event-missing" }.
export const authenticate = async (username, password) => {
  const config = typeof username === "string" && username.length <= 64
    ? await DirectCameraConfig.findOne({ username }).lean()
    : null;
  const ok = verifyPassword(password, config || DUMMY);
  if (!config || !ok) {
    if (config) await DirectCameraConfig.updateOne({ _id: config._id }, { $set: { lastFailedLoginAt: new Date() } }).catch(() => {});
    return { error: "invalid" };
  }
  if (!config.enabled) return { error: "disabled" };
  if (!(await CreateEvent.exists({ _id: config.event, user: config.user }))) return { error: "event-missing" };
  await DirectCameraConfig.updateOne({ _id: config._id }, { $set: { lastLoginAt: new Date() } });
  return { config };
};

// The login is still valid: enabled, and the password hasn't been
// regenerated since this session signed in.
export const stillAuthorized = async (config) =>
  !!(await DirectCameraConfig.exists({ _id: config._id, enabled: true, credentialsCreatedAt: config.credentialsCreatedAt }));

// Streams one file from `source` (the FTP data connection) into storage.
// Resolves to { status, reason } where status is
//   "stored" | "duplicate"  → success reply to the camera
//   "rejected"               → permanent refusal (bad type / too large)
//   "failed"                 → temporary failure (camera may retry)
export const ingestPhoto = async ({ config, fileName, source }) => {
  const name = safeFileName(fileName);
  const limit = maxUploadBytes();
  const ext = path.extname(name).toLowerCase();
  const reject = (reason, size = 0) => {
    record(config, { fileName: name, size, status: "rejected", reason }, "rejected");
    return { status: "rejected", reason };
  };

  let upload = null;
  let fileId = null;
  let size = 0;
  const hash = crypto.createHash("sha256");
  let head = Buffer.alloc(0);

  const startUpload = (format) => {
    fileId = new mongoose.Types.ObjectId(crypto.randomBytes(12));
    upload = bucket().openUploadStreamWithId(fileId, name, {
      metadata: { contentType: FORMATS[format].mime, user: String(config.user), source: "direct-camera" },
    });
    upload.on("error", () => {});
  };
  const abortUpload = async () => {
    if (!upload) return;
    try {
      await upload.abort();
    } catch {}
    await bucket().delete(fileId).catch(() => {});
  };

  try {
    // Don't let the loop destroy the connection when the file ends: the FTPS
    // layer still has to close it cleanly (TLS close_notify) afterwards.
    for await (const chunk of source.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      if (size > limit) {
        source.destroy();
        await abortUpload();
        return reject(`Larger than ${Math.round(limit / 1024 / 1024)} MB`, size);
      }
      hash.update(chunk);
      if (!upload) {
        head = Buffer.concat([head, chunk]);
        if (head.length < 12) continue;
        const format = sniff(head);
        if (!format || !FORMATS[format].exts.includes(ext)) {
          source.destroy();
          return reject(format ? "File extension doesn't match its content" : "Not a JPEG, HEIF or PNG photo (RAW files aren't accepted)", size);
        }
        startUpload(format);
        if (!upload.write(head)) await once(upload, "drain");
        continue;
      }
      if (!upload.write(chunk)) await once(upload, "drain");
    }
    if (!upload) return reject(size ? "File too small to be a photo" : "Empty file", size);
    upload.end();
    await once(upload, "finish");
  } catch (error) {
    await abortUpload();
    record(config, { fileName: name, size, status: "failed", reason: "Transfer interrupted" }, "failed", {
      lastError: { message: "A transfer was interrupted", at: new Date() },
    });
    return { status: "failed", reason: error?.code === "ERR_STREAM_PREMATURE_CLOSE" ? "Transfer interrupted" : "Transfer failed" };
  }

  // The photographer's storage quota (services/storageQuota.js), as for
  // dashboard uploads.
  let quotaHold;
  try {
    quotaHold = await quota.reserve(config.user, size);
  } catch (error) {
    await bucket().delete(fileId).catch(() => {});
    if (error instanceof quota.StorageQuotaError) {
      record(config, { fileName: name, size, status: "rejected", reason: error.message }, "rejected", {
        lastError: { message: error.message, at: new Date() },
      });
      return { status: "rejected", reason: error.message };
    }
    record(config, { fileName: name, size, status: "failed", reason: "Database error" }, "failed", {
      lastError: { message: "Couldn't save a photo (database error)", at: new Date() },
    });
    return { status: "failed", reason: "Database error" };
  }
  const releaseQuota = () => quota.release(config.user, [quotaHold]).catch(() => {});

  const sha256 = hash.digest("hex");
  // Same photo already received for this event (camera retry) → keep one copy.
  try {
    await DirectCameraFingerprint.create({ event: config.event, sha256 });
  } catch (error) {
    await Promise.all([bucket().delete(fileId).catch(() => {}), releaseQuota()]);
    if (error?.code === 11000) {
      record(config, { fileName: name, size, status: "duplicate", reason: "Already received" }, "duplicates");
      return { status: "duplicate", reason: "Already received" };
    }
    record(config, { fileName: name, size, status: "failed", reason: "Database error" }, "failed", {
      lastError: { message: "Couldn't save a photo (database error)", at: new Date() },
    });
    return { status: "failed", reason: "Database error" };
  }

  const url = `${URL_PREFIX}${fileId}`;
  try {
    const event = await CreateEvent.findOneAndUpdate(
      { _id: config.event, user: config.user, [`photos.${MAX_PHOTOS_PER_EVENT - 1}`]: { $exists: false } },
      { $push: { photos: { url, originalName: name, size } }, $set: { status: "Live" } },
      { returnDocument: "after", runValidators: true, projection: { photos: { $slice: -1 } } }
    );
    if (!event) {
      await Promise.all([
        bucket().delete(fileId).catch(() => {}),
        DirectCameraFingerprint.deleteOne({ event: config.event, sha256 }),
        releaseQuota(),
      ]);
      const exists = await CreateEvent.exists({ _id: config.event, user: config.user });
      const reason = exists ? `This event already has ${MAX_PHOTOS_PER_EVENT} photos` : "The event no longer exists";
      record(config, { fileName: name, size, status: "rejected", reason }, "rejected", { lastError: { message: reason, at: new Date() } });
      return { status: "rejected", reason };
    }
    await quota.commit(config.user, [{ id: quotaHold, bytes: size }]).catch(() => {});
    const photo = event.photos?.find((p) => p.url === url);
    record(config, { fileName: name, size, status: "stored", photoId: photo?._id || null }, "received", { lastUploadAt: new Date() });
    return { status: "stored", reason: "", url };
  } catch {
    await Promise.all([
      bucket().delete(fileId).catch(() => {}),
      DirectCameraFingerprint.deleteOne({ event: config.event, sha256 }).catch(() => {}),
      releaseQuota(),
    ]);
    record(config, { fileName: name, size, status: "failed", reason: "Database error" }, "failed", {
      lastError: { message: "Couldn't save a photo (database error)", at: new Date() },
    });
    return { status: "failed", reason: "Database error" };
  }
};

// Updates the name of a photo this session stored (cameras that upload
// under a temporary name and then rename it). `url` identifies the photo.
export const renameStoredPhoto = async (config, url, toName) => {
  await CreateEvent.updateOne(
    { _id: config.event, user: config.user, "photos.url": url },
    { $set: { "photos.$.originalName": safeFileName(toName) } }
  ).catch(() => {});
};
