import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  disableFaceGroups,
  enableFaceGroups,
  getFaceGroups,
  getPersonPhotos,
  retryFaceGroups,
} from "../controllers/faceGroupingController.js";

// Mounted at /api/face-groups (Create Event → People). Owner only — every
// route checks the event belongs to the signed-in user. Nothing public.
const router = express.Router();

router.get("/:eventId", authMiddleware, getFaceGroups);
router.get("/:eventId/people/:personId", authMiddleware, getPersonPhotos);
router.post("/:eventId/enable", authMiddleware, enableFaceGroups);
router.post("/:eventId/disable", authMiddleware, disableFaceGroups);
router.post("/:eventId/retry", authMiddleware, retryFaceGroups);

export default router;
