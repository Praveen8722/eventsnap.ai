import express from "express";
import {
  signup,
  login,
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

const router = express.Router();
router.post("/signup", signup);
router.post("/login", login);

// Protected routes
router.put("/edit-profile", authMiddleware, editProfile);
router.put("/change-password", authMiddleware, changePassword);
router.delete("/delete-account", authMiddleware, deleteAccount);

// Signed-in user's own profile photo. authMiddleware runs first, so an
// unauthenticated request never writes a file to disk.
router.put("/profile-photo", authMiddleware, uploadProfilePhoto, updateProfilePhoto);
router.delete("/profile-photo", authMiddleware, deleteProfilePhoto);
router.put("/business-photo", authMiddleware, uploadProfilePhoto, updateBusinessPhoto);
router.delete("/business-photo", authMiddleware, deleteBusinessPhoto);

// Resolves the signed-in user (see authController.getDashboard).
router.get("/dashboard", authMiddleware, getDashboard);
export default router;
