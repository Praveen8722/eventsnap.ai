import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    businessName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    // URL of the photographer's own profile photo, e.g.
    // "/api/auth/photos/<fileId>". The image itself is stored in MongoDB
    // GridFS (see services/accountPhotoStorage.js); only this reference is
    // stored here. Set
    // only through /api/auth/profile-photo for the authenticated user.
    profilePhoto: {
      type: String,
      default: "",
    },
    // Same as profilePhoto, for the business/studio photo shown beside the
    // Business Name. Set only through /api/auth/business-photo.
    businessPhoto: {
      type: String,
      default: "",
    },
    // Ids of notifications this photographer has deleted. Notifications are
    // derived on the fly (from bookings/galleries/inquiries/profile — see
    // dashboard-ui lib/notifications.js), so there are no notification rows to
    // delete; a deleted notification is instead recorded here and filtered out
    // of the built feed permanently. Owner-scoped: only ever the signed-in
    // user's own, set through /api/auth/notifications/dismiss.
    dismissedNotifications: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
