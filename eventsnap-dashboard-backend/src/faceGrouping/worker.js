import crypto from "crypto";
import mongoose from "mongoose";
import CreateEvent from "../models/CreateEvent.js";
import { FaceGrouping, FacePhoto, FaceRecord, toDescriptorBuffer } from "../models/FaceGrouping.js";
import { readStoredPhoto } from "../services/createEventPhotoStorage.js";
import { UnsupportedImageError, processingImage } from "./processingImage.js";
import { detectFaces, matcher } from "./faceEngine.js";
import { faceGroupingAvailable, matchThreshold } from "./config.js";

// Background worker for "People" grouping, inside the API process (no extra
// infrastructure). Jobs are FacePhoto records in MongoDB, so queued work
// survives restarts / Render sleep and resumes when the app starts again.
// Each tick:
//   1. events turned off or deleted → their grouping data is deleted;
//   2. grouped events → new photos queued, deleted photos' faces removed
//      (works for every upload path without touching them);
//   3. queued photos are processed one at a time (bounded memory), each
//      claimed with a lease so it never runs twice at once.

const MAX_ATTEMPTS = 5;
const PER_TICK = 5;
const LEASE_MS = 2 * 60 * 1000; // a photo takes seconds; a crashed run's job is picked up after this
const log = (...args) => console.log("[face-grouping]", ...args);

// Retry delay: 30 s, 1 min, 2 min, … (capped at 30 min).
const retryBaseMs = () => Number(process.env.FACE_GROUPING_RETRY_BASE_MS) || 30000;
const backoff = (attempts) => new Date(Date.now() + Math.min(retryBaseMs() * 2 ** (attempts - 1), 30 * 60 * 1000));

class MissingPhotoError extends Error {}

const descriptorOf = (stored) => {
  const bytes = stored?.buffer && stored._bsontype === "Binary" ? stored.buffer : stored;
  return new Float32Array(Uint8Array.from(bytes).buffer);
};

// Per-event cache of known faces { photoId, person, descriptor } — the worker
// is the only writer, so it's kept in step; dropped on deletions/merges.
const cache = new Map();
const knownFaces = async (eventId) => {
  const key = String(eventId);
  if (!cache.has(key)) {
    const rows = await FaceRecord.find({ event: eventId }).select("photoId person descriptor").lean();
    cache.set(key, rows.map((r) => ({ photoId: String(r.photoId), person: String(r.person), descriptor: descriptorOf(r.descriptor) })));
  }
  return cache.get(key);
};
const forget = (eventId) => cache.delete(String(eventId));

// 1. Turned off or event deleted → delete all grouping data for the event.
const cleanUp = async (group) => {
  await Promise.all([
    FaceRecord.deleteMany({ event: group.event }),
    FacePhoto.deleteMany({ event: group.event }),
    FaceGrouping.deleteOne({ _id: group._id }),
  ]);
  forget(group.event);
  log(`removed grouping data for event ${group.event}`);
};

// 2. Keep FacePhoto in step with the event's photos.
const sync = async (group, event) => {
  const current = new Set(event.photos.map((p) => String(p._id)));
  const known = await FacePhoto.find({ event: group.event }).select("photoId").lean();
  const knownIds = new Set(known.map((k) => String(k.photoId)));
  const added = [...current].filter((id) => !knownIds.has(id));
  if (added.length) {
    await FacePhoto.insertMany(
      added.map((id) => ({ event: group.event, user: group.user, photoId: id })),
      { ordered: false }
    ).catch((err) => {
      // Already queued (duplicate request / parallel tick) is fine.
      if (err?.code !== 11000 && !err?.writeErrors?.every((e) => e.code === 11000)) throw err;
    });
  }
  const gone = known.filter((k) => !current.has(String(k.photoId))).map((k) => k.photoId);
  if (gone.length) {
    await FaceRecord.deleteMany({ event: group.event, photoId: { $in: gone } });
    await FacePhoto.deleteMany({ event: group.event, photoId: { $in: gone } });
    forget(group.event); // empty person groups disappear with their last face
  }
};

// The person a new face belongs to: the most similar known person at or above
// the threshold (merging other people it also matches — they're the same
// person); otherwise a new person. Faces in the same photo never match each
// other (one person appears once per photo).
const assignPerson = async (eventId, faces, face, photoId, similar, threshold) => {
  const best = new Map(); // person → best similarity
  for (const known of faces) {
    if (known.photoId === photoId) continue;
    const s = similar(face.descriptor, known.descriptor);
    if (s >= threshold && s > (best.get(known.person) ?? -1)) best.set(known.person, s);
  }
  if (!best.size) return new mongoose.Types.ObjectId().toString();
  const ranked = [...best.entries()].sort((a, b) => b[1] - a[1]);
  const person = ranked[0][0];
  const others = ranked.slice(1).map(([p]) => p);
  if (others.length) {
    await FaceRecord.updateMany({ event: eventId, person: { $in: others } }, { $set: { person } });
    for (const f of faces) if (others.includes(f.person)) f.person = person;
  }
  return person;
};

// 3. Processes one photo.
const processPhoto = async (group, event, job) => {
  const photo = event.photos.find((p) => String(p._id) === String(job.photoId));
  if (!photo) return FacePhoto.deleteOne({ _id: job._id });
  const stored = await readStoredPhoto(photo.url);
  if (!stored) throw new MissingPhotoError("The photo file is missing");
  const sha256 = crypto.createHash("sha256").update(stored.bytes).digest("hex");
  const photoId = String(job.photoId);

  // An identical photo already processed in this event: reuse its result.
  const twin = await FacePhoto.findOne({ event: group.event, sha256, status: { $in: ["indexed", "noFaces"] }, _id: { $ne: job._id } }).lean();
  if (twin) {
    const faces = await FaceRecord.find({ event: group.event, photoId: twin.photoId }).lean();
    if (faces.length) {
      await FaceRecord.insertMany(
        faces.map((f) => ({ event: group.event, user: group.user, photoId: job.photoId, descriptor: f.descriptor, box: f.box, score: f.score, person: f.person }))
      );
      forget(group.event);
    }
    return FacePhoto.updateOne({ _id: job._id }, { $set: { sha256, status: twin.status, faceCount: faces.length, error: "", leaseUntil: null } });
  }

  let detected;
  {
    const image = await processingImage(stored.bytes); // throws UnsupportedImageError
    detected = await detectFaces(image);
  } // the decoded image is released here

  const faces = await knownFaces(group.event);
  const similar = await matcher();
  const threshold = matchThreshold();
  await FaceRecord.deleteMany({ event: group.event, photoId: job.photoId }); // leftovers of an interrupted run
  try {
    for (const face of detected) {
      const person = await assignPerson(group.event, faces, face, photoId, similar, threshold);
      await FaceRecord.create({
        event: group.event,
        user: group.user,
        photoId: job.photoId,
        descriptor: toDescriptorBuffer(face.descriptor),
        box: face.box,
        score: face.score,
        person,
      });
      faces.push({ photoId, person, descriptor: face.descriptor });
    }
  } catch (err) {
    await FaceRecord.deleteMany({ event: group.event, photoId: job.photoId });
    forget(group.event);
    throw err;
  }
  await FacePhoto.updateOne(
    { _id: job._id },
    { $set: { sha256, status: detected.length ? "indexed" : "noFaces", faceCount: detected.length, error: "", leaseUntil: null } }
  );
};

const processOne = async () => {
  const now = new Date();
  // Claim one job (lease): never processed by two runs at once; a lease left
  // by a crashed/restarted process expires and the job is picked up again.
  const job = await FacePhoto.findOneAndUpdate(
    { $or: [{ status: "pending", nextAttemptAt: { $lte: now } }, { status: "processing", leaseUntil: { $lt: now } }] },
    { $set: { status: "processing", leaseUntil: new Date(Date.now() + LEASE_MS) } },
    { sort: { nextAttemptAt: 1 }, returnDocument: "after" }
  );
  if (!job) return false;
  const group = await FaceGrouping.findOne({ event: job.event, enabled: true }).lean();
  const event = group && (await CreateEvent.findOne({ _id: job.event, user: group.user }).select("photos._id photos.url").lean());
  if (!group || !event) {
    await FacePhoto.updateOne({ _id: job._id }, { $set: { status: "pending", leaseUntil: null, nextAttemptAt: new Date(Date.now() + 60000) } });
    return true;
  }
  try {
    await processPhoto(group, event, job);
  } catch (err) {
    const attempts = job.attempts + 1;
    const unsupported = err instanceof UnsupportedImageError;
    const permanent = unsupported || err instanceof MissingPhotoError;
    const retry = !permanent && attempts < MAX_ATTEMPTS;
    await FacePhoto.updateOne(
      { _id: job._id },
      {
        $set: {
          status: unsupported ? "unsupported" : retry ? "pending" : "failed",
          attempts,
          nextAttemptAt: backoff(attempts),
          error: permanent ? err.message : "Processing failed",
          leaseUntil: null,
        },
      }
    );
    // No descriptors, URLs or photo data in logs.
    log(`photo ${job.photoId}: ${unsupported ? "unsupported format" : err?.name || "error"} (attempt ${attempts}${retry ? ", will retry" : ""})`);
  }
  return true;
};

export const runOnce = async () => {
  if (!faceGroupingAvailable() || mongoose.connection.readyState !== 1) return;
  for (const group of await FaceGrouping.find({}).lean()) {
    try {
      const event = await CreateEvent.findOne({ _id: group.event, user: group.user }).select("photos._id").lean();
      if (!group.enabled || !event) await cleanUp(group);
      else await sync(group, event);
    } catch (err) {
      log(`event ${group.event}: ${err?.name || "error"}`);
    }
  }
  for (let i = 0; i < PER_TICK; i++) {
    if (!(await processOne())) break;
  }
};

let timer = null;
let running = false;
export const startFaceGroupingWorker = () => {
  if (timer || !faceGroupingAvailable()) return;
  const interval = Number(process.env.FACE_GROUPING_INTERVAL_MS) || 15000;
  timer = setInterval(async () => {
    if (running) return; // never overlap ticks
    running = true;
    try {
      await runOnce();
    } catch (err) {
      log(`tick failed: ${err?.name || "error"}`);
    } finally {
      running = false;
    }
  }, interval);
  timer.unref();
  log(`worker started (every ${Math.round(interval / 1000)}s, match threshold ${matchThreshold()})`);
};
