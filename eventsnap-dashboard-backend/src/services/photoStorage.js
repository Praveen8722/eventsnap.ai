import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

// Photos are stored in MongoDB GridFS, not on the server's disk: the hosted
// backend runs in a container whose filesystem is wiped on every
// restart/redeploy. Records keep only the photo's URL,
// "<urlPrefix><fileId>", which `stream` serves.
//
// Each store also understands the disk URLs used before that change
// ("<legacyPrefix><file>" in legacyDir), so old photos can be cleaned up and
// migrated.
const LEGACY_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
};

const toObjectId = (value) =>
  /^[0-9a-f]{24}$/i.test(String(value)) ? new mongoose.Types.ObjectId(String(value)) : null;

// randomIds: give stored files random, unguessable ids (default ObjectIds are
// a timestamp + counter, so a photo's neighbours can be guessed from its URL).
// Opt-in, so stores that don't set it behave exactly as before.
export const createPhotoStore = ({ bucketName, urlPrefix, legacyPrefix, legacyDir, randomIds = false }) => {
  const bucket = () =>
    new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName });

  const fileIdFromUrl = (url) =>
    typeof url === "string" && url.startsWith(urlPrefix)
      ? toObjectId(url.slice(urlPrefix.length))
      : null;

  const isLegacyUrl = (url) => typeof url === "string" && url.startsWith(legacyPrefix);

  const findFile = (fileId) => bucket().find({ _id: fileId }).next();

  const openUpload = (filename, options) =>
    randomIds
      ? bucket().openUploadStreamWithId(new mongoose.Types.ObjectId(crypto.randomBytes(12)), filename, options)
      : bucket().openUploadStream(filename, options);

  // True for a photo URL this store manages — in GridFS or a legacy disk file.
  const isStoredUrl = (url) => !!fileIdFromUrl(url) || isLegacyUrl(url);

  // Stores one photo, owned by userId, and resolves to its URL.
  const save = (buffer, { contentType, filename, userId }) =>
    new Promise((resolve, reject) => {
      const upload = openUpload(filename || "photo", {
        metadata: { contentType, user: String(userId) },
      });
      upload.once("error", reject);
      upload.once("finish", () => resolve(`${urlPrefix}${upload.id}`));
      upload.end(buffer);
    });

  // Whether url is an existing GridFS photo belonging to userId.
  const isOwnedBy = async (url, userId) => {
    const fileId = fileIdFromUrl(url);
    if (!fileId) return false;
    const file = await findFile(fileId);
    return !!file && String(file.metadata?.user) === String(userId);
  };

  // Deletes the photo behind url (GridFS file, or legacy disk file). Only
  // ever touches a photo this store created — never an arbitrary path — and,
  // when userId is given, only that user's own GridFS photo. Never throws.
  const remove = async (url, { userId } = {}) => {
    try {
      const fileId = fileIdFromUrl(url);
      if (fileId) {
        if (userId !== undefined && !(await isOwnedBy(url, userId))) return;
        await bucket().delete(fileId);
      } else if (isLegacyUrl(url)) {
        await fs.promises.unlink(path.join(legacyDir, path.basename(url)));
      }
    } catch {
      // Already gone.
    }
  };

  // GET <urlPrefix>:fileId — public, since <img> tags can't send the JWT.
  // Each upload gets a new id, so the response can be cached forever.
  const stream = async (req, res) => {
    const fileId = toObjectId(req.params.fileId);
    if (!fileId) return res.status(404).json({ message: "Photo not found" });
    try {
      const file = await findFile(fileId);
      if (!file) return res.status(404).json({ message: "Photo not found" });

      res.set({
        "Content-Type": file.metadata?.contentType || "application/octet-stream",
        "Content-Length": file.length,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        // Uploaded images (e.g. SVG) must never run script if opened directly.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        // Loaded cross-origin by the dashboard (GitHub Pages / localhost:3000).
        "Cross-Origin-Resource-Policy": "cross-origin",
      });
      bucket()
        .openDownloadStream(fileId)
        .once("error", () => res.destroy())
        .pipe(res);
    } catch {
      res.status(500).json({ message: "Server Error" });
    }
  };

  // Moves one legacy disk photo into GridFS. Resolves to the new URL, or
  // null when the file isn't on this machine (it may be on another machine
  // sharing the database). The disk file is kept; the caller swaps the
  // reference and, if that loses a race, removes the new copy.
  const importLegacy = async (url, userId) => {
    if (!isLegacyUrl(url)) return null;
    const filename = path.basename(url);
    let buffer;
    try {
      buffer = await fs.promises.readFile(path.join(legacyDir, filename));
    } catch {
      return null;
    }
    if (!buffer.length) return null;
    return save(buffer, {
      contentType: LEGACY_TYPES[path.extname(filename).toLowerCase()] || "application/octet-stream",
      filename,
      userId,
    });
  };

  // multer storage engine that streams each upload straight into GridFS
  // (never buffered whole in memory, never written to disk), owned by the
  // authenticated req.userId. Sets file.url and file.size. multer calls
  // _removeFile for every stored file when the request fails (e.g. a file
  // over the size limit), so nothing is left behind.
  const multerStorage = () => ({
    _handleFile(req, file, cb) {
      const upload = openUpload(file.originalname || "photo", {
        metadata: { contentType: file.mimetype, user: String(req.userId) },
      });
      upload.once("error", cb);
      upload.once("finish", () => cb(null, { url: `${urlPrefix}${upload.id}`, size: upload.length }));
      file.stream.pipe(upload);
    },
    _removeFile(req, file, cb) {
      remove(file.url).then(() => cb(null));
    },
  });

  return { save, remove, stream, isStoredUrl, isOwnedBy, isLegacyUrl, importLegacy, multerStorage };
};
