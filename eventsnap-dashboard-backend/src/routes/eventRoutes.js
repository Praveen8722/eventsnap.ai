import express from "express";
import {
  createEvent,
  viewEvents,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();
router.post("/", authMiddleware, createEvent);
router.get("/", authMiddleware, viewEvents);
router.put("/:id", authMiddleware, updateEvent);
router.delete("/:id", authMiddleware, deleteEvent);

export default router;
