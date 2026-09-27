import express from "express";
import {
  submitContactMessage,
  viewContactMessages,
} from "../controllers/contactController.js";

const router = express.Router();
router.post("/", submitContactMessage);
router.get("/", viewContactMessages);

export default router;
