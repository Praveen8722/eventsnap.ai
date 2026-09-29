import multer from "multer";
import fs from "fs";
import path from "path";

// Profile and business photos are stored on the server disk and served statically from
// /uploads, exactly like Client Gallery and Portfolio photos (see
// uploadGallery.js / uploadPortfolio.js) — in their own subfolder. The User
// record only keeps the resulting URL.
export const PROFILE_UPLOAD_DIR = path.join(
  process.cwd(),
  "uploads",
  "profile"
);
fs.mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PROFILE_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

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
