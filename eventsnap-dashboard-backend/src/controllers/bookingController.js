import Booking from "../models/Booking.js";
import Portfolio from "../models/Portfolio.js";
import { ensureGalleryForBooking } from "./galleryController.js";

// Next "BK00N" id, based on the most recently created booking for this
// photographer only. Booking ids are independent per owner, just like
// gallery ids (see galleryController.nextGalleryId).
const nextBookingId = async (userId) => {
  const last = await Booking.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .select("bookingId");
  let next = 1;
  if (last && last.bookingId) {
    const num = parseInt(String(last.bookingId).replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(num)) next = num + 1;
  }
  return `BK${next.toString().padStart(3, "0")}`;
};

// ================= CREATE BOOKING =================
// Hit both by the logged-in photographer's own Dashboard "+ New Booking"
// (a real session — req.userId set by optionalAuthMiddleware) and by the
// public Portfolio "Book Now" form (no login — the owner is resolved from
// portfolioSlug, exactly like inquiryController.submitInquiry). Never trusts
// a client-sent owner id.
export const createBooking = async (req, res) => {
  try {
    const {
      clientName,
      email,
      phone,
      eventType,
      eventDate,
      packageSelected,
      packegPrice,
      advancePayment,
      additionalNotes,
      portfolioSlug,
    } = req.body;

    let ownerId = req.userId || null;

    if (!ownerId) {
      const slug = String(portfolioSlug || "").trim();
      if (!slug) {
        return res.status(401).json({
          success: false,
          message: "Login required, or a portfolioSlug must be provided",
        });
      }
      const portfolio = await Portfolio.findOne({ slug }).select("user");
      if (!portfolio) {
        return res.status(404).json({
          success: false,
          message: "Portfolio not found",
        });
      }
      ownerId = portfolio.user;
    }

    const newBooking = new Booking({
      bookingId: await nextBookingId(ownerId),
      user: ownerId,
      clientName,
      email,
      phone,
      eventType,
      eventDate,
      packageSelected,
      packegPrice,
      advancePayment,
      additionalNotes,
      status: "Inquiry", // default status
    });

    await newBooking.save();

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking: newBooking,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== VIEW BOOKINGS =================
export const viewBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.userId }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      message: "Bookings retrieved successfully",
      bookings,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== GET BOOKING =================
export const getBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({
      bookingId,
      user: req.userId,
    });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Booking retrieved successfully",
      booking,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

const BOOKING_STATUSES = [
  "Inquiry",
  "Confirmed",
  "In Progress",
  "Editing",
  "Ready for Delivery",
  "Delivered",
  "Cancelled",
];

//================== UPDATE BOOKING (Edit / status) =================
export const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const allowed = [
      "clientName",
      "email",
      "phone",
      "eventType",
      "eventDate",
      "packageSelected",
      "packegPrice",
      "advancePayment",
      "additionalNotes",
      "status",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      updates[key] = req.body[key];
    }

    if (updates.packegPrice !== undefined) {
      if (isNaN(Number(updates.packegPrice))) {
        return res
          .status(400)
          .json({ success: false, message: "packegPrice must be a number" });
      }
      updates.packegPrice = Number(updates.packegPrice);
    }
    if (updates.advancePayment !== undefined) {
      if (isNaN(Number(updates.advancePayment))) {
        return res
          .status(400)
          .json({ success: false, message: "advancePayment must be a number" });
      }
      updates.advancePayment = Number(updates.advancePayment);
    }
    if (updates.status !== undefined && !BOOKING_STATUSES.includes(updates.status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const booking = await Booking.findOneAndUpdate(
      { bookingId, user: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Documented "Confirmed -> Gallery auto-created" flow (see
    // galleryController.ensureGalleryForBooking) — creates an empty gallery
    // for this booking the first time it's Confirmed; a no-op if it already
    // has one.
    if (updates.status === "Confirmed") {
      await ensureGalleryForBooking(booking);
    }

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      booking,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};
