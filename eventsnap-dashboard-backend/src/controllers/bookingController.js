import Booking from "../models/Booking.js";
import Portfolio from "../models/Portfolio.js";
import Gallery from "../models/Gallery.js";
import Invoice from "../models/Invoice.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import { ensureGalleryForBooking } from "./galleryController.js";
import {
  sendBookingClientEmail,
  sendBookingOwnerEmail,
  sendPaymentReminderEmail,
} from "../services/emailservice.js";
import { isValidPhoneNumber } from "../utils/phone.js";

const bookingNumber = (bookingId) =>
  parseInt(String(bookingId || "").replace(/[^0-9]/g, ""), 10);

// Next "BK00N" id, based on the most recently created booking for this
// photographer only. Booking ids are independent per owner, just like
// gallery ids (see galleryController.nextGalleryId).
//
// Deleted bookings leave their galleries, invoices and events behind, still
// pointing at the old id — so an id is never handed out again while any of
// those records reference it (e.g. a new booking must not inherit a deleted
// booking's client gallery via ensureGalleryForBooking).
const nextBookingId = async (userId) => {
  const last = await Booking.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .select("bookingId");
  let next = 1;
  if (last && last.bookingId) {
    const num = bookingNumber(last.bookingId);
    if (!Number.isNaN(num)) next = num + 1;
  }
  const referenced = await Promise.all(
    [Gallery, Invoice, Event].map((Model) => Model.distinct("bookingId", { user: userId }))
  );
  for (const id of referenced.flat()) {
    const num = bookingNumber(id);
    if (!Number.isNaN(num) && num >= next) next = num + 1;
  }
  return `BK${next.toString().padStart(3, "0")}`;
};

// Validates and cleans the optional "Event Days" list (New / Edit Booking).
// Returns { days } sorted by date, or { error } for a 400 response. Only
// name, date, location and notes are kept; location and notes are optional.
const MAX_EVENT_DAYS = 50;
const normalizeEventDays = (raw) => {
  if (raw === undefined || raw === null) return { days: [] };
  if (!Array.isArray(raw)) return { error: "eventDays must be a list" };
  if (raw.length > MAX_EVENT_DAYS) {
    return { error: `A booking can have at most ${MAX_EVENT_DAYS} event days` };
  }
  const text = (v) => (typeof v === "string" ? v.trim() : "");
  const days = [];
  for (let i = 0; i < raw.length; i++) {
    const d = raw[i] || {};
    const name = text(d.name);
    const date = new Date(d.date);
    if (!name || !d.date || Number.isNaN(date.getTime())) {
      return { error: `Event day ${i + 1}: event name and date are required` };
    }
    days.push({
      name,
      date,
      location: text(d.location),
      notes: text(d.notes),
    });
  }
  days.sort((a, b) => a.date - b.date);
  return { days };
};

// Optional money fields (package price / advance payment): empty or missing
// means 0; anything else must be a number. Returns { value } or { error }.
const optionalAmount = (raw, label) => {
  if (raw === undefined || raw === null || String(raw).trim() === "") return { value: 0 };
  const value = Number(raw);
  if (Number.isNaN(value)) return { error: `${label} must be a number` };
  return { value };
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

    // Same shared rule as the New Booking form: a 10-digit Indian mobile.
    if (!isValidPhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number.",
      });
    }

    const { days: eventDays, error: eventDaysError } = normalizeEventDays(
      req.body.eventDays
    );
    if (eventDaysError) {
      return res.status(400).json({ success: false, message: eventDaysError });
    }

    const price = optionalAmount(packegPrice, "packegPrice");
    const advance = optionalAmount(advancePayment, "advancePayment");
    if (price.error || advance.error) {
      return res
        .status(400)
        .json({ success: false, message: price.error || advance.error });
    }

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
      // With event days, the booking's date is its earliest day.
      eventDate: eventDays.length ? eventDays[0].date : eventDate,
      eventDays,
      packageSelected,
      packegPrice: price.value,
      advancePayment: advance.value,
      additionalNotes,
      // Derived from the resolved path, never from the client's `source`.
      source: slug ? "portfolio" : "internal",
      status: "Inquiry", // default status
      statusHistory: [{ status: "Inquiry", date: new Date() }],
    });

    await newBooking.save();

    // Booking confirmation emails — fire-and-forget and best-effort, so SMTP
    // never affects the saved booking or this response. The photographer's
    // address comes only from the resolved owner account (never the request
    // body), exactly like inquiryController.
    const owner = await User.findById(ownerId)
      .select("name businessName email")
      .catch(() => null);
    const photographerName = owner?.name || owner?.businessName || "";
    // Confirm to the client who booked (their email is optional).
    const clientEmail = String(newBooking.email || "").trim();
    if (clientEmail) {
      sendBookingClientEmail({
        to: clientEmail,
        clientName: newBooking.clientName,
        photographerName,
        booking: newBooking,
      }).catch((err) =>
        console.error("Booking client email failed:", err.message)
      );
    }
    // Notify the photographer for inbound bookings from their public portfolio
    // (for internal dashboard bookings the owner created it themselves).
    if (newBooking.source === "portfolio" && owner?.email) {
      sendBookingOwnerEmail({
        to: owner.email,
        photographerName,
        booking: newBooking,
      }).catch((err) =>
        console.error("Booking owner email failed:", err.message)
      );
    }

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

    // Edit Booking → Event Days: same rules as create. With days present the
    // booking's date follows the earliest day; an empty list clears them.
    if (req.body.eventDays !== undefined) {
      const { days, error } = normalizeEventDays(req.body.eventDays);
      if (error) {
        return res.status(400).json({ success: false, message: error });
      }
      updates.eventDays = days;
      if (days.length) updates.eventDate = days[0].date;
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

//================== DELETE BOOKING =================
// Only ever deletes the logged-in photographer's own booking — the owner
// filter means another user's bookingId simply isn't found. Linked
// galleries, invoices and events are left untouched.
export const deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOneAndDelete({
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
      message: "Booking deleted successfully",
      bookingId,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== DELETE BOOKINGS (bulk) =================
// Body: { bookingIds: ["BK001", "BK002", ...] }. Scoped to the logged-in
// photographer exactly like deleteBooking — ids belonging to anyone else are
// ignored, never deleted.
const MAX_BULK_DELETE = 500;
export const deleteBookings = async (req, res) => {
  try {
    const { bookingIds } = req.body;
    if (
      !Array.isArray(bookingIds) ||
      bookingIds.length === 0 ||
      !bookingIds.every((id) => typeof id === "string" && id.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "bookingIds must be a non-empty list of booking ids",
      });
    }
    if (bookingIds.length > MAX_BULK_DELETE) {
      return res.status(400).json({
        success: false,
        message: `At most ${MAX_BULK_DELETE} bookings can be deleted at once`,
      });
    }

    const result = await Booking.deleteMany({
      bookingId: { $in: bookingIds.map((id) => id.trim()) },
      user: req.userId,
    });
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} booking(s) deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

// ================= SEND PAYMENT REMINDER =================
// Emails the customer the outstanding-balance reminder for one of the
// logged-in photographer's own bookings. The booking is looked up scoped to
// req.userId (the JWT owner), so a photographer can only remind their own
// clients — this is also what enforces multi-user isolation. The recipient is
// read from the stored booking record (booking.email), never from the request
// body. The optional `message` is the photographer-authored body text only.
//
// Graceful by design: a customer with no saved email → 400, and an SMTP
// failure → 502, each with a clear message; neither throws, and nothing about
// the booking is changed.
export const sendPaymentReminder = async (req, res) => {
  try {
    const bookingId = String(req.params.bookingId || "").trim();
    const booking = await Booking.findOne({ bookingId, user: req.userId });
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    const to = String(booking.email || "").trim();
    if (!to) {
      return res.status(400).json({
        success: false,
        message: "This customer has no saved email address",
      });
    }

    // Photographer name for the message comes from the authenticated owner's
    // account, never the request body.
    const owner = await User.findById(req.userId).catch(() => null);
    const photographerName = owner?.name || owner?.businessName || "";

    const result = await sendPaymentReminderEmail({
      to,
      clientName: booking.clientName,
      photographerName,
      booking,
      message: req.body?.message,
    });

    if (!result?.sent) {
      // SMTP not configured or the send failed — surface the exact reason in
      // the server log (not-configured vs send-failed) so it's diagnosable,
      // and report a safe message to the client without 500ing. "not-configured"
      // means SMTP_HOST/SMTP_USER/SMTP_PASS are missing from the backend .env.
      console.warn(
        `Payment reminder not sent for booking ${bookingId}: ${result?.reason || "unknown"}`
      );
      return res.status(502).json({
        success: false,
        message:
          "Could not send the reminder email right now. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment reminder sent",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};
