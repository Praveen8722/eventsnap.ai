import express from "express";
import {
  signup,
  login,
  getDashboard,
  editProfile,
  changePassword,
  deleteAccount,
} from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();
router.post("/signup", signup);
router.post("/login", login);

// Protected routes
router.put("/edit-profile", authMiddleware, editProfile);
router.put("/change-password", authMiddleware, changePassword);
router.delete("/delete-account", authMiddleware, deleteAccount);

// Resolves the signed-in user (see authController.getDashboard).
router.get("/dashboard", authMiddleware, getDashboard);
export default router;
