import mongoose from "mongoose";

// Create Event storage quota — see services/storageQuota.js.

// One per photographer: bytes of stored photos counted against their quota
// (`used`), plus bytes held by uploads still in progress (`holds`). Checked
// and changed only with single atomic updates, so parallel uploads can't
// together go over the limit.
const storageUsageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    used: { type: Number, default: 0, min: 0 },
    // Bumped by every change, so a recount (reconcileStorageUsage) only
    // applies if nothing changed while it was counting.
    version: { type: Number, default: 0 },
    reconciledAt: { type: Date, default: null },
    holds: [
      {
        _id: { type: String, required: true },
        bytes: { type: Number, required: true },
        at: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true }
);

// A stored file being deleted. Recorded BEFORE the photo/cover is removed
// from its event (so a crash can't lose track of the file), kept until the
// file is confirmed deleted, and retried in the background. Its bytes stay
// counted until then. claimedAt: set by the one process that frees the bytes
// (never freed twice).
const pendingPhotoDeletionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, required: true },
    bytes: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: () => new Date() },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
pendingPhotoDeletionSchema.index({ user: 1, url: 1 }, { unique: true });
pendingPhotoDeletionSchema.index({ nextAttemptAt: 1 });
storageUsageSchema.index({ reconciledAt: 1 });

export const StorageUsage = mongoose.model("StorageUsage", storageUsageSchema);
export const PendingPhotoDeletion = mongoose.model("PendingPhotoDeletion", pendingPhotoDeletionSchema);
