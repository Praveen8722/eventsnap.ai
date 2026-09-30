import User from "../models/User.js";
import { PROFILE_UPLOAD_DIR } from "../middleware/uploadProfile.js";
import { createPhotoStore } from "./photoStorage.js";

// Profile and business photos (My Profile), stored in MongoDB GridFS bucket
// "accountPhotos" — see services/photoStorage.js. The User record keeps only
// the URL, "/api/auth/photos/<fileId>".
const store = createPhotoStore({
  bucketName: "accountPhotos",
  urlPrefix: "/api/auth/photos/",
  legacyPrefix: "/uploads/profile/",
  legacyDir: PROFILE_UPLOAD_DIR,
});

export const savePhoto = store.save;
export const removePhoto = store.remove;
export const streamPhoto = store.stream;

// One-time, idempotent move of disk-stored photos into MongoDB, run at
// startup.
export const migrateLegacyPhotos = async () => {
  let moved = 0;
  const users = await User.find({
    $or: [
      { profilePhoto: { $regex: "^/uploads/profile/" } },
      { businessPhoto: { $regex: "^/uploads/profile/" } },
    ],
  }).select("profilePhoto businessPhoto");

  for (const user of users) {
    for (const field of ["profilePhoto", "businessPhoto"]) {
      const oldUrl = user[field];
      const newUrl = await store.importLegacy(oldUrl, user._id);
      if (!newUrl) continue;
      // Only if the photo hasn't changed meanwhile (e.g. another instance).
      const { modifiedCount } = await User.updateOne(
        { _id: user._id, [field]: oldUrl },
        { [field]: newUrl }
      );
      if (modifiedCount) moved++;
      else await store.remove(newUrl);
    }
  }
  if (moved) console.log(`Moved ${moved} account photo(s) from disk into MongoDB`);
};
