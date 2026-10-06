import multer from "multer";
import { createEventPhotoMulterStorage } from "../services/createEventPhotoStorage.js";

// Create Event photos are streamed straight into MongoDB GridFS (see
// services/createEventPhotoStorage.js), owned by req.userId — so
// authMiddleware must run first. Each stored file carries its
// "/api/create-events/photos/<id>" url as file.url.
const storage = createEventPhotoMulterStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

// Matches the "up to 25 MB each" shown in the dashboard's upload screens.
const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 50;

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

// Event gallery photos (field "photos").
export const uploadCreateEventPhotos = withJsonErrors(
  multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_PHOTOS_PER_UPLOAD },
  }).array("photos", MAX_PHOTOS_PER_UPLOAD)
);

// Single cover photo (field "cover") — on create and on change cover. A JSON
// (non-multipart) request passes straight through untouched.
export const uploadCreateEventCover = withJsonErrors(
  multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  }).single("cover")
);
