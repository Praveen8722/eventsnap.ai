import path from "path";
import mongoose from "mongoose";
import { createPhotoStore } from "./photoStorage.js";

// Create Event cover + gallery photos, stored in MongoDB GridFS bucket
// "createEventPhotos" — see services/photoStorage.js. The CreateEvent
// document keeps only the URL, "/api/create-events/photos/<fileId>".
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
});

export const createEventPhotoMulterStorage = store.multerStorage;
export const streamCreateEventPhoto = store.stream;

// Every stored photo URL an event references (cover + gallery photos).
const referencedUrls = (event) =>
  new Set([event?.coverPhoto, ...(event?.photos || []).map((p) => p.url)].filter(Boolean));

// Deletes each of the user's photos in `urls` that the (already saved) event
// no longer references — so a gallery photo that is also the cover (or vice
// versa) is kept until neither uses it. Pass event = null to delete them all.
export const removeUnreferencedPhotos = async (urls, event, userId) => {
  const stillUsed = referencedUrls(event);
  await Promise.all(
    [...new Set(urls)]
      .filter((url) => store.isStoredUrl(url) && !stillUsed.has(url))
      .map((url) => store.remove(url, { userId }))
  );
};

// Deletes photos stored during a request that then failed.
export const discardPhotos = (urls) => Promise.all(urls.filter(Boolean).map((url) => store.remove(url)));

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
export const sendPhotoDownload = async (url, res, name) => {
  const fileId = fileIdFromUrl(url);
  if (!fileId) return "missing";
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
  const file = await bucket.find({ _id: fileId }).next();
  if (!file) return "missing";

  const contentType = file.metadata?.contentType || "application/octet-stream";
  res.set({
    "Content-Type": contentType,
    "Content-Length": file.length,
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
    bucket
      .openDownloadStream(fileId)
      .once("error", () => {
        done("failed");
        res.destroy();
      })
      .pipe(res);
  });
};
