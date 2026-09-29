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

const router = express.Router();

// Public — used by the shareable portfolio link (eventsnap.ai/p/:slug).
router.get("/public/:slug", getPublicPortfolio);

// Logged-in photographer's own portfolio.
router.get("/me", authMiddleware, getMyPortfolio);
router.put("/me", authMiddleware, updateMyPortfolio);

// Portfolio → Gallery tab photo uploads (stored on disk, same as Client Galleries).
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
