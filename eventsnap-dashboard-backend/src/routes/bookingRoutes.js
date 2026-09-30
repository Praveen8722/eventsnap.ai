import express from "express";
import {
  createBooking,
  viewBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  deleteBookings,
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
router.post("/delete-bookings", authMiddleware, deleteBookings);
router.get("/:bookingId", authMiddleware, getBooking);
router.put("/:bookingId", authMiddleware, updateBooking);
router.delete("/:bookingId", authMiddleware, deleteBooking);

export default router;
