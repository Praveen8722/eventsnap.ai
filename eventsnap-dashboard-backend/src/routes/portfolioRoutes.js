import express from "express";
import {
  getMyPortfolio,
  updateMyPortfolio,
  getPublicPortfolio,
  addPortfolioGalleryPhotos,
  deletePortfolioGalleryPhoto,
  uploadPortfolioPhoto,
} from "../controllers/portfolioController.js";
import {
  uploadPortfolioPhotos,
  uploadPortfolioSinglePhoto,
} from "../middleware/uploadPortfolio.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { streamPortfolioPhoto } from "../services/portfolioPhotoStorage.js";

const router = express.Router();

// Public — used by the shareable portfolio link (eventsnap.ai/p/:slug).
router.get("/public/:slug", getPublicPortfolio);
// Serves a stored portfolio photo (public: shown on the shared portfolio).
router.get("/photos/:fileId", streamPortfolioPhoto);

// Logged-in photographer's own portfolio.
router.get("/me", authMiddleware, getMyPortfolio);
router.put("/me", authMiddleware, updateMyPortfolio);

// Portfolio → Gallery tab photo uploads (stored in MongoDB GridFS).
router.post(
  "/me/gallery",
  authMiddleware,
  uploadPortfolioPhotos,
  addPortfolioGalleryPhotos
);
router.delete("/me/gallery/:photoId", authMiddleware, deletePortfolioGalleryPhoto);

// Edit Portfolio → profile / cover / navbar photo upload
// (:kind is "profile", "cover" or "navbar").
router.post(
  "/me/photo/:kind",
  authMiddleware,
  uploadPortfolioSinglePhoto,
  uploadPortfolioPhoto
);

export default router;
