import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    // The photographer this calendar entry belongs to. Set server-side from
    // the authenticated user — never trusted from the client. Left unset on
    // legacy events created before ownership existed.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    title: {
      type: String,
      required: true,
    },
    // "Booking / Shoot" | "Meeting" | "Reminder" | "Task" | "Personal"
    type: {
      type: String,
      default: "Booking / Shoot",
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      default: "",
    },
    endTime: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    // Optional link to a Booking (bookingId like "BK001").
    bookingId: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "#6C63FF",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
