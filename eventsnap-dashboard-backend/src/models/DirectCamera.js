import mongoose from "mongoose";

// Create Event → Direct Camera Auto Upload: a compatible camera uploads new
// photos straight to EventSnap over FTPS (see src/directCamera/). Separate
// collections, so the CreateEvent model and the folder-based Camera Auto
// Upload feature are untouched.

// One per event: the camera's event-scoped login and what it has done.
// The password is never stored — only a salted scrypt hash.
const directCameraConfigSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "CreateEvent", required: true, unique: true },
    // Owner of the event (photos are stored under this user).
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    enabled: { type: Boolean, default: false },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    credentialsCreatedAt: { type: Date, default: Date.now },
    // Evidence of real communication (never set just by enabling).
    lastLoginAt: { type: Date, default: null },
    lastFailedLoginAt: { type: Date, default: null },
    lastUploadAt: { type: Date, default: null },
    lastError: { message: { type: String, default: "" }, at: { type: Date, default: null } },
    stats: {
      received: { type: Number, default: 0 },
      duplicates: { type: Number, default: 0 },
      rejected: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Upload history (kept 30 days).
const directCameraUploadSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "CreateEvent", required: true },
    fileName: { type: String, default: "" },
    size: { type: Number, default: 0 },
    status: { type: String, enum: ["stored", "duplicate", "rejected", "failed"], required: true },
    reason: { type: String, default: "" },
    photoId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
directCameraUploadSchema.index({ event: 1, createdAt: -1 });
directCameraUploadSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Content fingerprints of photos received for an event: a camera re-sending
// the same file (retry after a dropped connection) is recognised and not
// stored twice. Kept after a photo is deleted, so a retry can't bring a
// deleted photo back.
const directCameraFingerprintSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "CreateEvent", required: true },
    sha256: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
directCameraFingerprintSchema.index({ event: 1, sha256: 1 }, { unique: true });

export const DirectCameraConfig = mongoose.model("DirectCameraConfig", directCameraConfigSchema);
export const DirectCameraUpload = mongoose.model("DirectCameraUpload", directCameraUploadSchema);
export const DirectCameraFingerprint = mongoose.model("DirectCameraFingerprint", directCameraFingerprintSchema);

// Removes everything Direct Camera kept for an event (when it's deleted).
export const removeDirectCameraData = (eventId) =>
  Promise.all([
    DirectCameraConfig.deleteMany({ event: eventId }),
    DirectCameraUpload.deleteMany({ event: eventId }),
    DirectCameraFingerprint.deleteMany({ event: eventId }),
  ]);
