import crypto from "crypto";
import mongoose from "mongoose";
import CreateEvent from "../models/CreateEvent.js";
import { PendingPhotoDeletion, StorageUsage } from "../models/StorageUsage.js";
import * as s3 from "./s3Storage.js";

// Per-photographer storage quota for Create Event photos (gallery photos and
// covers, in S3 or MongoDB GridFS), always for the authenticated req.userId.
//
// Usage = the stored size of each distinct photo file the photographer's
// events reference (a file used as both gallery photo and cover counts
// once), plus files whose deletion hasn't been confirmed yet. It's kept in a
// per-photographer ledger (models/StorageUsage.js):
//   reserve → before a file is accepted: holds its bytes only if
//             used + bytes held by other uploads + bytes <= limit (atomic);
//   commit  → once the photo is saved to its event: hold becomes `used`;
//   release → upload failed: hold dropped;
//   free    → only after the stored file is confirmed deleted.
// The ledger starts from the photographer's existing photos (GridFS and S3)
// the first time it's needed.

const GB = 1024 ** 3;
export const DEFAULT_QUOTA_GB = 3;
// An upload request holding bytes longer than this is treated as dead (e.g.
// the server restarted mid-upload) and no longer counts.
const HOLD_TTL_MS = 60 * 60 * 1000;

// The photographer's limit in bytes: STORAGE_QUOTA_GB (default 3) for
// everyone today. Per-plan limits (Free 3 GB, Basic 5 GB, Pro 10 GB, …) would
// be looked up here — the one place the limit comes from.
export const quotaBytesFor = (/* userId */) => {
  const gb = Number(process.env.STORAGE_QUOTA_GB);
  return Math.round((gb > 0 ? gb : DEFAULT_QUOTA_GB) * GB);
};

const formatGB = (bytes) => `${Number((bytes / GB).toFixed(2))} GB`;

export class StorageQuotaError extends Error {
  constructor(limit) {
    super(`Storage limit reached. Your plan includes ${formatGB(limit)}. Delete some photos to upload more.`);
    this.code = "STORAGE_QUOTA_EXCEEDED";
  }
}

const GRIDFS_URL = /^\/api\/create-events\/photos\/([0-9a-f]{24})$/i;

// Actual stored sizes (bytes) of the given photo URLs; 0 when not found.
// Throws if storage can't be reached (so usage is never under-counted).
export const storedSizes = async (urls) => {
  const sizes = new Map(urls.map((u) => [u, 0]));
  const gridIds = urls.map((u) => GRIDFS_URL.exec(u)?.[1]).filter(Boolean).map((id) => new mongoose.Types.ObjectId(id));
  if (gridIds.length) {
    const files = await mongoose.connection.collection("createEventPhotos.files").find({ _id: { $in: gridIds } }).project({ length: 1 }).toArray();
    for (const f of files) sizes.set(`/api/create-events/photos/${f._id}`, f.length || 0);
  }
  // (S3 switched off on this server: those objects can't be measured → 0.)
  const keys = s3.s3Enabled() ? urls.map((u) => [u, s3.keyFromUrl(u)]).filter(([, k]) => k) : [];
  for (let i = 0; i < keys.length; i += 8) {
    await Promise.all(keys.slice(i, i + 8).map(async ([u, k]) => sizes.set(u, (await s3.headObjectSize(k)) || 0)));
  }
  return sizes;
};

// Recomputed from what's stored: every distinct file the user's events
// reference + files still waiting to be deleted.
export const calculateUsage = async (userId) => {
  const events = await CreateEvent.find({ user: userId }).select("coverPhoto photos.url photos.size photos.thumbUrl photos.thumbSize").lean();
  const known = new Map();
  const unknown = new Set();
  const count = (url, size) => {
    if (!url) return;
    if (size > 0) known.set(url, Math.max(known.get(url) || 0, size));
    else unknown.add(url);
  };
  for (const ev of events) {
    for (const p of ev.photos || []) {
      count(p.url, p.size);
      count(p.thumbUrl, p.thumbSize); // thumbnails are stored files too
    }
    if (ev.coverPhoto) unknown.add(ev.coverPhoto);
  }
  for (const d of await PendingPhotoDeletion.find({ user: userId }).lean()) {
    if (!known.has(d.url)) known.set(d.url, d.bytes || 0);
  }
  const lookup = [...unknown].filter((u) => !known.has(u));
  if (lookup.length) for (const [u, b] of await storedSizes(lookup)) known.set(u, b);
  let total = 0;
  for (const b of known.values()) total += b;
  return total;
};

// Ledgers are created once and never deleted, so once a photographer's is
// known to exist this process stops asking MongoDB (saves a round trip per
// uploaded photo). If one is removed anyway (by hand, or a test database is
// dropped), reserve() notices the missing ledger, forgets it here and
// recreates it.
const knownLedgers = new Set();
const ensureLedger = async (userId) => {
  const key = String(userId);
  if (knownLedgers.has(key)) return;
  if (!(await StorageUsage.exists({ user: userId }))) {
    const used = await calculateUsage(userId);
    await StorageUsage.updateOne(
      { user: userId },
      { $setOnInsert: { used, holds: [], version: 0, reconciledAt: new Date() } },
      { upsert: true }
    ).catch((err) => {
      if (err?.code !== 11000) throw err; // created by a parallel request
    });
  }
  knownLedgers.add(key);
};

const cutoff = () => new Date(Date.now() - HOLD_TTL_MS);
const heldBytes = (since) => ({
  $sum: { $map: { input: { $filter: { input: "$holds", as: "h", cond: { $gt: ["$$h.at", since] } } }, as: "h", in: "$$h.bytes" } },
});
// Pulls the given holds and any expired ones.
const pullHolds = (ids) => ({ holds: { $or: [{ _id: { $in: ids } }, { at: { $lt: cutoff() } }] } });

// Holds `bytes` for an upload → hold id. Throws StorageQuotaError if it
// doesn't fit in the remaining space.
export const reserve = async (userId, bytes) => {
  const limit = quotaBytesFor(userId);
  const id = crypto.randomUUID();
  const size = Math.max(0, Number(bytes) || 0);
  const tryHold = () =>
    StorageUsage.updateOne(
      { user: userId, $expr: { $lte: [{ $add: ["$used", heldBytes(cutoff()), size] }, limit] } },
      { $push: { holds: { _id: id, bytes: size, at: new Date() } }, $inc: { version: 1 } }
    );
  await ensureLedger(userId);
  let result = await tryHold();
  if (!result.modifiedCount && !(await StorageUsage.exists({ user: userId }))) {
    // The ledger was removed after this process saw it: recreate, try again.
    knownLedgers.delete(String(userId));
    await ensureLedger(userId);
    result = await tryHold();
  }
  if (!result.modifiedCount) throw new StorageQuotaError(limit);
  return id;
};

// holds: [{ id, bytes }] of uploads now saved to an event.
export const commit = async (userId, holds) => {
  if (!holds.length) return;
  const bytes = holds.reduce((sum, h) => sum + (h.bytes || 0), 0);
  await StorageUsage.updateOne({ user: userId }, { $pull: pullHolds(holds.map((h) => h.id)), $inc: { used: bytes, version: 1 } });
};

// ids of holds whose uploads failed.
export const release = async (userId, ids) => {
  if (!ids.length) return;
  await StorageUsage.updateOne({ user: userId }, { $pull: pullHolds(ids), $inc: { version: 1 } });
};

// A stored file was confirmed deleted. Never below zero.
export const free = async (userId, bytes) => {
  if (!(bytes > 0)) return;
  await StorageUsage.updateOne(
    { user: userId },
    [{ $set: { used: { $max: [0, { $subtract: ["$used", bytes] }] }, version: { $add: [{ $ifNull: ["$version", 0] }, 1] } } }],
    { updatePipeline: true }
  );
};

// Something that affects the count changed outside the ledger (a file is
// about to be deleted): makes a recount that is in progress start over.
export const touch = async (userId) => {
  await StorageUsage.updateOne({ user: userId }, { $inc: { version: 1 } });
};

// { usedBytes, reservedBytes, limitBytes, availableBytes }
export const getStorageUsage = async (userId) => {
  await ensureLedger(userId);
  let doc = await StorageUsage.findOne({ user: userId }).lean();
  if (!doc) {
    // Removed after this process cached it: recreate from what's stored.
    knownLedgers.delete(String(userId));
    await ensureLedger(userId);
    doc = await StorageUsage.findOne({ user: userId }).lean();
  }
  const since = cutoff();
  const reservedBytes = (doc?.holds || []).filter((h) => h.at > since).reduce((s, h) => s + h.bytes, 0);
  const usedBytes = doc?.used || 0;
  const limitBytes = quotaBytesFor(userId);
  return { usedBytes, reservedBytes, limitBytes, availableBytes: Math.max(0, limitBytes - usedBytes - reservedBytes) };
};

// Recovery: sets `used` to what is actually stored (calculateUsage: each
// distinct S3/GridFS file the user's events reference, covers included, plus
// files still pending deletion — never counted twice). Fixes drift left by a
// crash, e.g. between saving a photo and recording it.
//   • Never touches an upload in progress: if the user holds a live
//     reservation, nothing changes ("busy").
//   • Only applies if the ledger didn't change while counting (version
//     check); otherwise nothing changes ("changed" — try again later).
//   • Drops reservations older than an hour (uploads that died).
// → { status: "updated" | "busy" | "changed" | "created", before?, after? }
// hooks.afterCalculate: tests only (simulates a change mid-count).
export const reconcileStorageUsage = async (userId, hooks = {}) => {
  const doc = await StorageUsage.findOne({ user: userId }).lean();
  if (!doc) {
    knownLedgers.delete(String(userId)); // may be cached from before it was removed
    await ensureLedger(userId);
    return { status: "created" };
  }
  const since = cutoff();
  if ((doc.holds || []).some((h) => h.at > since)) return { status: "busy" };
  const used = await calculateUsage(userId);
  await hooks.afterCalculate?.();
  const version = doc.version ?? 0;
  const result = await StorageUsage.updateOne(
    {
      user: userId,
      ...(doc.version === undefined ? { version: { $exists: false } } : { version }),
      $expr: { $eq: [heldBytes(since), 0] },
    },
    { $set: { used, reconciledAt: new Date(), version: version + 1 }, $pull: { holds: { at: { $lte: since } } } }
  );
  if (!result.modifiedCount) return { status: "changed" };
  return { status: "updated", before: doc.used, after: used };
};

// Ledgers due a recount: never recounted, recounted over a day ago, or
// holding an expired reservation (an upload that died mid-way).
export const ledgersToReconcile = async (limit = 20) => {
  const since = cutoff();
  const rows = await StorageUsage.find({
    $or: [
      { reconciledAt: null },
      { reconciledAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      { holds: { $elemMatch: { at: { $lte: since } } } },
    ],
  })
    .select("user")
    .limit(limit)
    .lean();
  return rows.map((r) => r.user);
};

// Asks for a recount at the next background run (e.g. after a deletion was
// abandoned mid-way, so its bytes may still be counted).
export const requestReconcile = async (userId) => {
  await StorageUsage.updateOne({ user: userId }, { $set: { reconciledAt: null } });
};
