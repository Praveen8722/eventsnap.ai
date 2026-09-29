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
//
// A portfolioSlug always wins over the session: the dashboard's axios
// instance attaches the JWT to every request, so a photographer who is
// logged in and books from someone else's public portfolio must not end up
// owning that booking.
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

    let ownerId = null;
    const slug = String(portfolioSlug || "").trim();

    if (!slug) {
      ownerId = req.userId || null;
      if (!ownerId) {
        return res.status(401).json({
          success: false,
          message: "Login required, or a portfolioSlug must be provided",
        });
      }
    } else {
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
      // Derived from the resolved path, never from the client's `source`.
      source: slug ? "portfolio" : "internal",
      status: "Inquiry", // default status
      statusHistory: [{ status: "Inquiry", date: new Date() }],
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

    // Record a real status change in statusHistory (server-side only). A
    // legacy booking with no history first gets its previous status as the
    // opening entry, so the change itself is never mistaken for creation.
    const update = { $set: updates };
    if (updates.status !== undefined) {
      const current = await Booking.findOne({ bookingId, user: req.userId }).select(
        "status statusHistory createdAt"
      );
      if (current && current.status !== updates.status) {
        const entries = current.statusHistory?.length
          ? []
          : [{ status: current.status, date: current.createdAt || new Date() }];
        entries.push({ status: updates.status, date: new Date() });
        update.$push = { statusHistory: { $each: entries } };
      }
    }

    const booking = await Booking.findOneAndUpdate(
      { bookingId, user: req.userId },
      update,
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
