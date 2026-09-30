import multer from "multer";
import path from "path";

// Profile and business photos are kept in memory here and then stored in
// MongoDB by services/accountPhotoStorage.js — never on the server's disk,
// which is wiped on every container restart. The User record only keeps the
// resulting URL.
//
// Folder of photos uploaded before that change ("/uploads/profile/<file>");
// only read to move them into MongoDB, and to clean them up.
export const PROFILE_UPLOAD_DIR = path.join(
  process.cwd(),
  "uploads",
  "profile"
);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

// One photo, same 20MB per-photo limit as Portfolio uploads.
const parser = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
}).single("photo");

// Wrap multer so upload errors return clean JSON instead of an HTML stack.
export const uploadProfilePhoto = (req, res, next) => {
  parser(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Photo upload failed",
      });
    }
    next();
  });
};
