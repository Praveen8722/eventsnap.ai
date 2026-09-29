import express from "express";
import {
  submitContactMessage,
  viewContactMessages,
} from "../controllers/contactController.js";
import { requireApiKey } from "../middleware/requireApiKey.js";

const router = express.Router();
// Public: the website's Contact form.
router.post("/", submitContactMessage);
// Admin only: lists every visitor's name/email/message.
router.get("/", requireApiKey, viewContactMessages);

export default router;
