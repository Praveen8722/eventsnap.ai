import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  disableDirectCamera,
  enableDirectCamera,
  getDirectCamera,
  regenerateDirectCameraPassword,
} from "../controllers/directCameraController.js";

// Mounted at /api/direct-camera (Create Event → Direct Camera Auto Upload).
// Owner only — every route checks the event belongs to the signed-in user.
const router = express.Router();

router.get("/:eventId", authMiddleware, getDirectCamera);
router.post("/:eventId/enable", authMiddleware, enableDirectCamera);
router.post("/:eventId/disable", authMiddleware, disableDirectCamera);
router.post("/:eventId/credentials", authMiddleware, regenerateDirectCameraPassword);

export default router;
