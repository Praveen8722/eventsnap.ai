import express from "express";
import {
  createGallery,
  viewGalleries,
  getGallery,
  getSharedGallery,
  updateGallery,
  addGalleryPhotos,
  deleteGalleryPhoto,
  deleteGalleryPhotos,
  trackDownload,
  deleteGallery,
} from "../controllers/galleryController.js";
import { uploadGalleryPhotos } from "../middleware/uploadGallery.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Dashboard-only (Client Galleries / Booking Details / Notifications) —
// always the logged-in photographer's own galleries.
router.post("/", authMiddleware, uploadGalleryPhotos, createGallery);
router.get("/", authMiddleware, viewGalleries);
router.post("/:id/photos", authMiddleware, uploadGalleryPhotos, addGalleryPhotos);
router.post("/:id/photos/delete", authMiddleware, deleteGalleryPhotos);
router.delete("/:id/photos/:photoId", authMiddleware, deleteGalleryPhoto);
router.put("/:id", authMiddleware, updateGallery);
router.delete("/:id", authMiddleware, deleteGallery);
router.get("/:id", authMiddleware, getGallery);

// Public — the client-facing shared gallery link (/g/:slug) and download/view
// tracking. No login: the unguessable share link/id is the access control here.
router.get("/share/:slug", getSharedGallery);
router.patch("/:id/download", trackDownload);

export default router;
