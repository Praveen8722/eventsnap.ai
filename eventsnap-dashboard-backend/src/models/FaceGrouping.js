import mongoose from "mongoose";

// Create Event → "People": photos grouped by person, computed on this server
// with a free local library (faceGrouping/). Photographer-only; guests never
// see any of it, and face descriptors never leave the backend. Separate
// collections, so the CreateEvent model is unchanged. No face images are
// stored — only each face's descriptor, its position in its photo, and the
// group ("person") it belongs to.

const { ObjectId } = mongoose.Schema.Types;

// One per event with grouping turned on.
const faceGroupingSchema = new mongoose.Schema(
  {
    event: { type: ObjectId, ref: "CreateEvent", required: true, unique: true },
    user: { type: ObjectId, ref: "User", required: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);
faceGroupingSchema.index({ user: 1 });

// One per photo of a grouped event — a persistent job record: survives
// restarts (Render sleep), never processed twice once done.
//   pending / processing → not processed yet
//   indexed              → faces found
//   noFaces              → processed, no faces
//   unsupported          → format can't be read (e.g. HEIC); original untouched
//   failed               → gave up after bounded retries (can be retried)
const facePhotoSchema = new mongoose.Schema(
  {
    event: { type: ObjectId, ref: "CreateEvent", required: true },
    user: { type: ObjectId, ref: "User", required: true },
    photoId: { type: ObjectId, required: true },
    sha256: { type: String, default: "" },
    status: { type: String, enum: ["pending", "processing", "indexed", "noFaces", "unsupported", "failed"], default: "pending" },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: () => new Date() },
    leaseUntil: { type: Date, default: null },
    faceCount: { type: Number, default: 0 },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);
facePhotoSchema.index({ event: 1, photoId: 1 }, { unique: true });
facePhotoSchema.index({ status: 1, nextAttemptAt: 1 });
facePhotoSchema.index({ event: 1, sha256: 1 });

// One per detected face: its descriptor (Float32 values as bytes), position
// in the photo (fractions of width/height) and person group.
const faceRecordSchema = new mongoose.Schema(
  {
    event: { type: ObjectId, ref: "CreateEvent", required: true },
    user: { type: ObjectId, ref: "User", required: true },
    photoId: { type: ObjectId, required: true },
    descriptor: { type: Buffer, required: true },
    box: { left: Number, top: Number, width: Number, height: Number },
    score: { type: Number, default: 0 },
    person: { type: ObjectId, required: true },
  },
  { timestamps: true }
);
faceRecordSchema.index({ event: 1, person: 1 });
faceRecordSchema.index({ event: 1, photoId: 1 });
faceRecordSchema.index({ user: 1, event: 1 });

export const FaceGrouping = mongoose.model("FaceGrouping", faceGroupingSchema);
export const FacePhoto = mongoose.model("FacePhoto", facePhotoSchema);
export const FaceRecord = mongoose.model("FaceRecord", faceRecordSchema);

export const toDescriptorBuffer = (descriptor) => Buffer.from(Float32Array.from(descriptor).buffer);
export const fromDescriptorBuffer = (buf) => new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
