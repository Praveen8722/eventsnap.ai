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
    // "/uploads/profile/<file>.jpg". The image itself lives on disk (see
    // middleware/uploadProfile.js); only this reference is stored here. Set
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
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
