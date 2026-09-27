import express from "express";
import {
  createBooking,
  viewBookings,
  getBooking,
  updateBooking,
} from "../controllers/bookingController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import optionalAuthMiddleware from "../middlewares/optionalAuthMiddleware.js";

const router = express.Router();

// Hit both by the public Portfolio "Book Now" form (no login — owner
// resolved from portfolioSlug) and the logged-in Dashboard "+ New Booking"
// (owner from the session). See bookingController.createBooking.
router.post("/create-booking", optionalAuthMiddleware, createBooking);

// Dashboard-only — always the logged-in photographer's own bookings.
router.get("/view-bookings", authMiddleware, viewBookings);
router.get("/:bookingId", authMiddleware, getBooking);
router.put("/:bookingId", authMiddleware, updateBooking);

export default router;
