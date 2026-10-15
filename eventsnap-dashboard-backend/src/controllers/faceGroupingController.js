import mongoose from "mongoose";
import CreateEvent from "../models/CreateEvent.js";
import { FaceGrouping, FacePhoto, FaceRecord } from "../models/FaceGrouping.js";
import { faceGroupingAvailable, matchThreshold } from "../faceGrouping/config.js";

// Create Event → "People": photos grouped by person, computed on this server
// (faceGrouping/worker.js). Owner only. Responses never include face
// descriptors — only group ids, photo ids/urls and face positions.

const notFound = (res) => res.status(404).json({ success: false, message: "Event not found" });
const serverError = (res) => res.status(500).json({ success: false, message: "Server Error" });
const unavailable = (res) =>
  res.status(501).json({ success: false, code: "FACE_GROUPING_UNAVAILABLE", message: "Grouping by person isn't set up on the server" });

const ownEvent = (req, fields = "_id user") =>
  /^[0-9a-f]{24}$/i.test(req.params.eventId)
    ? CreateEvent.findOne({ _id: req.params.eventId, user: req.userId }).select(fields).lean()
    : null;

const summary = async (event) => {
  const group = await FaceGrouping.findOne({ event: event._id }).lean();
  const base = { available: faceGroupingAvailable(), threshold: matchThreshold() };
  if (!group) return { ...base, enabled: false, people: [], progress: null };
  if (!group.enabled) return { ...base, enabled: false, removing: true, people: [], progress: null };

  const counts = await FacePhoto.aggregate([{ $match: { event: event._id } }, { $group: { _id: "$status", n: { $sum: 1 } } }]);
  const by = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  const total = event.photos.length;
  const urls = new Map(event.photos.map((p) => [String(p._id), p.url]));

  const people = await FaceRecord.aggregate([
    { $match: { event: event._id } },
    { $sort: { score: -1 } },
    { $group: { _id: "$person", photos: { $addToSet: "$photoId" }, cover: { $first: { photoId: "$photoId", box: "$box" } } } },
  ]);
  return {
    ...base,
    enabled: true,
    ready: true,
    progress: {
      total,
      indexed: by.indexed || 0,
      noFaces: by.noFaces || 0,
      unsupported: by.unsupported || 0,
      failed: by.failed || 0,
      waiting: Math.max(0, total - (by.indexed || 0) - (by.noFaces || 0) - (by.unsupported || 0) - (by.failed || 0)),
    },
    people: people
      .map((p) => ({
        id: String(p._id),
        photoCount: p.photos.filter((id) => urls.has(String(id))).length,
        cover: urls.has(String(p.cover.photoId)) ? { photoId: String(p.cover.photoId), url: urls.get(String(p.cover.photoId)), box: p.cover.box } : null,
      }))
      .filter((p) => p.photoCount > 0)
      .sort((a, b) => b.photoCount - a.photoCount),
  };
};

// GET /api/face-groups/:eventId
export const getFaceGroups = async (req, res) => {
  try {
    const event = await ownEvent(req, "_id user photos._id photos.url");
    if (!event) return notFound(res);
    res.status(200).json({ success: true, ...(await summary(event)) });
  } catch {
    serverError(res);
  }
};

// GET /api/face-groups/:eventId/people/:personId → that person's photos
export const getPersonPhotos = async (req, res) => {
  try {
    const event = await ownEvent(req, "_id user photos._id photos.url");
    if (!event) return notFound(res);
    if (!/^[0-9a-f]{24}$/i.test(req.params.personId)) return res.status(404).json({ success: false, message: "Person not found" });
    const ids = await FaceRecord.distinct("photoId", { event: event._id, person: new mongoose.Types.ObjectId(req.params.personId) });
    const wanted = new Set(ids.map(String));
    const photos = event.photos.filter((p) => wanted.has(String(p._id))).map((p) => ({ id: String(p._id), url: p.url }));
    if (!photos.length) return res.status(404).json({ success: false, message: "Person not found" });
    res.status(200).json({ success: true, photos });
  } catch {
    serverError(res);
  }
};

// POST /api/face-groups/:eventId/enable — starts grouping this event's photos
// (processing happens in the background).
export const enableFaceGroups = async (req, res) => {
  try {
    if (!faceGroupingAvailable()) return unavailable(res);
    const event = await ownEvent(req, "_id user photos._id photos.url");
    if (!event) return notFound(res);
    const existing = await FaceGrouping.findOne({ event: event._id }).lean();
    if (existing && !existing.enabled) {
      return res.status(409).json({ success: false, message: "Still removing the previous face data — try again in a minute" });
    }
    if (!existing) {
      await FaceGrouping.create({ event: event._id, user: event.user });
    }
    res.status(200).json({ success: true, ...(await summary(event)) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ success: false, message: "Already turning on — refresh in a moment" });
    serverError(res);
  }
};

// POST /api/face-groups/:eventId/disable — stops grouping and deletes this
// event's face data. Deleted right away; the worker removes anything a photo
// being processed at that moment adds, then the grouping record itself.
export const disableFaceGroups = async (req, res) => {
  try {
    const event = await ownEvent(req, "_id user photos._id photos.url");
    if (!event) return notFound(res);
    await FaceGrouping.updateOne({ event: event._id, user: req.userId }, { $set: { enabled: false } });
    await Promise.all([
      FaceRecord.deleteMany({ event: event._id, user: req.userId }),
      FacePhoto.deleteMany({ event: event._id, user: req.userId }),
    ]);
    // No worker running (feature off on the server) → nothing left to wait for.
    if (!faceGroupingAvailable()) await FaceGrouping.deleteOne({ event: event._id, user: req.userId });
    res.status(200).json({ success: true, ...(await summary(event)) });
  } catch {
    serverError(res);
  }
};

// POST /api/face-groups/:eventId/retry — tries failed photos again.
export const retryFaceGroups = async (req, res) => {
  try {
    const event = await ownEvent(req, "_id user photos._id photos.url");
    if (!event) return notFound(res);
    await FacePhoto.updateMany(
      { event: event._id, user: req.userId, status: "failed" },
      { $set: { status: "pending", attempts: 0, nextAttemptAt: new Date(), error: "" } }
    );
    res.status(200).json({ success: true, ...(await summary(event)) });
  } catch {
    serverError(res);
  }
};
