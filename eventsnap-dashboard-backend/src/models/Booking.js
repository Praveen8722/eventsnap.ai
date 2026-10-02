import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
      bookingId: {
      type: String,
    },
    // The photographer this booking belongs to. Set server-side only — from
    // the authenticated session (Dashboard "+ New Booking") or resolved from
    // the portfolio slug (public "Book Now" form). Never trusted from the
    // client. Left unset on legacy bookings created before ownership existed.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    clientName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    packageSelected: {
      type: String,
      required: true,
    },
    // Optional — an empty price is saved as 0 (see bookingController).
    packegPrice: {
      type: Number,
      required: false,
      default: 0,
    },
    advancePayment: {
      type: Number,
      required: false,
      default: 0,
    },
    additionalNotes: {
      type: String,
      required: false,
    },
    // Payments added after booking (Payment Details → Add Payment), each with
    // the date it was actually added. Written only by bookingController's
    // `addPayment` update (date set server-side). Total paid everywhere is
    // advancePayment + the sum of these amounts.
    payments: {
      type: [
        {
          amount: { type: Number, required: true, min: 0 },
          date: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    // Optional multi-day schedule for this one booking (e.g. Pooja, Pre-wedding,
    // Wedding on separate, non-consecutive dates). Name and date are required
    // per day; location and notes are optional. When present, eventDate is the
    // earliest day's date (set in bookingController create/update). Each day
    // is shown separately in Scheduling — it never creates extra bookings.
    eventDays: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          date: { type: Date, required: true },
          location: { type: String, default: "" },
          notes: { type: String, default: "" },
        },
      ],
      default: [],
    },
    // Where the booking came from — set server-side only (see
    // bookingController.createBooking). "portfolio" bookings get the single
    // "New Booking" notification (dashboard lib/notifications.js).
    source: {
      type: String,
      enum: ["portfolio", "internal"],
      default: "internal",
    },
    status: {
      type: String,
      enum: ["Inquiry", "Confirmed", "In Progress", "Editing", "Ready for Delivery", "Delivered", "Cancelled"],
      default: "Inquiry",
    },
    // Every status the booking has been in, oldest first — written only by
    // bookingController (on create and on each status change), never taken
    // from the client. Drives "Booking Status Updated" notifications and the
    // Booking Details timeline.
    statusHistory: {
      type: [
        {
          _id: false,
          status: { type: String, required: true },
          date: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Booking ids (like "BK001") are generated per photographer, just like
// Gallery ids — so they only need to be unique within one owner's bookings.
bookingSchema.index(
  { user: 1, bookingId: 1 },
  { unique: true }
);

export default mongoose.model("Booking", bookingSchema);
