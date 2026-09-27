import mongoose from "mongoose";

// A read-only mirror of an EventSnap product account's non-sensitive
// profile info, pushed here by the EventSnap backend after a signup/login.
// eventSnapDB + its JWT remain the single source of truth for
// authentication — this collection never stores a password, JWT, or auth
// secret, and cannot authenticate anyone on its own.
const syncedUserSchema = new mongoose.Schema(
  {
    // Stable reference to the account's _id in eventSnapDB.
    eventSnapUserId: {
      type: String,
      required: true,
      unique: true,
    },
    name: { type: String, default: "" },
    businessName: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    website: { type: String, default: "" },
    businessDescription: { type: String, default: "" },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("SyncedUser", syncedUserSchema);
