import express from "express";
import { submitInquiry, viewInquiries } from "../controllers/inquiryController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public — the Portfolio "Contact" / "Send Inquiry" form. No login: the
// portfolio slug in the URL identifies which photographer this belongs to.
router.post("/public/:slug", submitInquiry);

// Dashboard-only — the logged-in photographer's own inquiries (Notifications).
router.get("/", authMiddleware, viewInquiries);

export default router;
