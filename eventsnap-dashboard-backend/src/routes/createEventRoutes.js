import express from "express";
import {
  createEvent,
  getMyEvents,
  getEvent,
  getPublicEvent,
  recordGuestView,
  faceSearch,
  saveFaceSignatures,
  downloadPublicPhoto,
  updateEvent,
  deleteEvent,
  uploadCover,
  removeCover,
  setCoverFromPhoto,
  uploadPhotos,
  getPhotos,
  deletePhoto,
  deletePhotos,
} from "../controllers/createEventController.js";
import {
  uploadCreateEventCover,
  uploadCreateEventPhotos,
} from "../middleware/uploadCreateEvent.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import optionalAuthMiddleware from "../middlewares/optionalAuthMiddleware.js";
import { streamCreateEventPhoto } from "../services/createEventPhotoStorage.js";

// Mounted at /api/create-events (Dashboard → "Create Event").
const router = express.Router();

// Serves a stored cover/gallery photo (public: <img> tags can't send the
// JWT; file ids are unguessable).
router.get("/photos/:fileId", streamCreateEventPhoto);
// Public guest page (/share/<shareId>), by the event's permanent share id.
// optionalAuthMiddleware only lets the owner's own visits/downloads be
// recognised (and not counted); guests need no login.
router.get("/public/:shareId", getPublicEvent);
router.post("/public/:shareId/view", optionalAuthMiddleware, recordGuestView);
// Guest selfie search (only when the event's Face Search setting is on).
router.post("/public/:shareId/face-search", faceSearch);
router.get(
  "/public/:shareId/photos/:photoId/download",
  optionalAuthMiddleware,
  downloadPublicPhoto
);

// Logged-in photographer's own events. authMiddleware always runs before an
// upload middleware, so photos are stored under the authenticated user.
router.post("/", authMiddleware, uploadCreateEventCover, createEvent);
router.get("/", authMiddleware, getMyEvents);
router.get("/:id", authMiddleware, getEvent);
router.put("/:id", authMiddleware, updateEvent);
router.delete("/:id", authMiddleware, deleteEvent);

// Cover photo: upload/change, set from a gallery photo, remove.
router.put("/:id/cover", authMiddleware, uploadCreateEventCover, uploadCover);
router.put("/:id/cover/photo", authMiddleware, setCoverFromPhoto);
router.delete("/:id/cover", authMiddleware, removeCover);

// Gallery photos.
router.post("/:id/photos", authMiddleware, uploadCreateEventPhotos, uploadPhotos);
router.get("/:id/photos", authMiddleware, getPhotos);
router.post("/:id/photos/delete", authMiddleware, deletePhotos);
// Face signatures for selfie search, computed in the photographer's browser.
router.put("/:id/photos/faces", authMiddleware, saveFaceSignatures);
router.delete("/:id/photos/:photoId", authMiddleware, deletePhoto);

export default router;
