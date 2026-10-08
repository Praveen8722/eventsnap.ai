import mongoose from "mongoose";

// Create Event → Guest Registration: a guest who registered on an event's
// public page (/share/<shareId>) before seeing its photos, while the event's
// guestAccess.guestRegistration setting is on. Its own collection, so the
// CreateEvent document is unchanged. One record per event + phone number
// (registering again updates the name/email).
const createEventGuestRegistrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "CreateEvent", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 16 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
  },
  { timestamps: true }
);

createEventGuestRegistrationSchema.index({ event: 1, phone: 1 }, { unique: true });

export default mongoose.model("CreateEventGuestRegistration", createEventGuestRegistrationSchema);
