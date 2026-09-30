import express from "express";
import {
  signup,
  login,
  forgotPassword,
  dismissNotifications,
  getDashboard,
  editProfile,
  changePassword,
  deleteAccount,
  updateProfilePhoto,
  deleteProfilePhoto,
  updateBusinessPhoto,
  deleteBusinessPhoto,
} from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { uploadProfilePhoto } from "../middleware/uploadProfile.js";
import { streamPhoto } from "../services/accountPhotoStorage.js";

const router = express.Router();
router.post("/signup", signup);
router.post("/login", login);
// Public reset: email + new password, no OTP/link (see forgotPassword).
router.post("/forgot-password", forgotPassword);

// Protected routes
router.put("/edit-profile", authMiddleware, editProfile);
router.put("/change-password", authMiddleware, changePassword);
// Permanently delete (dismiss) notifications for the signed-in user.
router.post("/notifications/dismiss", authMiddleware, dismissNotifications);
router.delete("/delete-account", authMiddleware, deleteAccount);

// Signed-in user's own profile photo. authMiddleware runs first, so an
// unauthenticated request never stores a photo.
router.put("/profile-photo", authMiddleware, uploadProfilePhoto, updateProfilePhoto);
// Serves a stored profile/business photo (public: <img> can't send the JWT).
router.get("/photos/:fileId", streamPhoto);
router.delete("/profile-photo", authMiddleware, deleteProfilePhoto);
router.put("/business-photo", authMiddleware, uploadProfilePhoto, updateBusinessPhoto);
router.delete("/business-photo", authMiddleware, deleteBusinessPhoto);

// Resolves the signed-in user (see authController.getDashboard).
router.get("/dashboard", authMiddleware, getDashboard);
export default router;
