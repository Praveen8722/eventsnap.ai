import multer from "multer";
import { portfolioPhotoMulterStorage } from "../services/portfolioPhotoStorage.js";

// Portfolio photos are streamed straight into MongoDB GridFS (see
// services/portfolioPhotoStorage.js) — never saved on the server's disk,
// which is wiped on every container restart. Each stored file carries its
// "/api/portfolio/photos/<id>" url as file.url. authMiddleware must run
// first: the photos are owned by req.userId.
const storage = portfolioPhotoMulterStorage();

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
const withJsonErrors = (handler) => (req, res, next) => {
  handler(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Photo upload failed",
      });
    }
    next();
  });
};

export const uploadPortfolioPhotos = withJsonErrors(parser);

// Single profile / cover photo (Edit Portfolio → "Profile & Cover Photo").
// Same storage, filter and 20MB limit as gallery photos.
export const uploadPortfolioSinglePhoto = withJsonErrors(
  multer({
    storage,
    fileFilter,
    limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  }).single("photo")
);
