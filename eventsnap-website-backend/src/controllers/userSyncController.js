import SyncedUser from "../models/SyncedUser.js";

// Non-sensitive fields the EventSnap backend is allowed to sync. Anything
// else in the request body (there should never be a password/token) is
// ignored, not stored.
const SYNC_FIELDS = [
  "name",
  "businessName",
  "email",
  "phone",
  "location",
  "website",
  "businessDescription",
];

// ================= SYNC USER (create or update) =================
// Called server-to-server by the EventSnap backend right after a successful
// signup/login. Upserts by eventSnapUserId so an existing account is always
// updated in place instead of duplicated.
export const syncUser = async (req, res) => {
  try {
    const { eventSnapUserId } = req.body;
    if (!eventSnapUserId || !String(eventSnapUserId).trim()) {
      return res.status(400).json({
        success: false,
        message: "eventSnapUserId is required",
      });
    }

    const updates = { lastSyncedAt: new Date() };
    for (const field of SYNC_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const syncedUser = await SyncedUser.findOneAndUpdate(
      { eventSnapUserId: String(eventSnapUserId).trim() },
      updates,
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "User synced successfully",
      syncedUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

// ================= GET SYNCED USER =================
// Lets you verify a given EventSnap account made it across.
export const getSyncedUser = async (req, res) => {
  try {
    const { eventSnapUserId } = req.params;
    const syncedUser = await SyncedUser.findOne({ eventSnapUserId });
    if (!syncedUser) {
      return res
        .status(404)
        .json({ success: false, message: "Synced user not found" });
    }
    res.status(200).json({ success: true, syncedUser });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};
