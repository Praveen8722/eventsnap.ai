import multer from "multer";
import fs from "fs";
import path from "path";

// Photos are stored on the server disk and served statically from /uploads.
export const GALLERY_UPLOAD_DIR = path.join(
  process.cwd(),
  "uploads",
  "galleries"
);
fs.mkdirSync(GALLERY_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, GALLERY_UPLOAD_DIR),
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

const parser = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024, files: 100 },
}).array("photos", 100);

// Wrap multer so upload errors return clean JSON instead of an HTML stack.
export const uploadGalleryPhotos = (req, res, next) => {
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
