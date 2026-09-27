import multer from "multer";
import fs from "fs";
import path from "path";

// Portfolio gallery photos are stored on the server disk and served
// statically from /uploads, exactly like Client Gallery photos
// (see middleware/uploadGallery.js) — kept in their own subfolder so the two
// features never collide.
export const PORTFOLIO_UPLOAD_DIR = path.join(
  process.cwd(),
  "uploads",
  "portfolio"
);
fs.mkdirSync(PORTFOLIO_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PORTFOLIO_UPLOAD_DIR),
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

// Matches the 20MB per-photo limit already advertised on the Gallery
// Management screen ("Supports JPEG, PNG, WEBP up to 20MB each").
const parser = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
}).array("photos", 20);

// Wrap multer so upload errors return clean JSON instead of an HTML stack.
export const uploadPortfolioPhotos = (req, res, next) => {
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
