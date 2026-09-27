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
      required: true,
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
    packegPrice: {
      type: Number,
      required: true,
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
    status: {
      type: String,
      enum: ["Inquiry", "Confirmed", "In Progress", "Editing", "Ready for Delivery", "Delivered", "Cancelled"],
      default: "Inquiry",
    }
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
