import mongoose from "mongoose";

// One submission of a photographer's public Portfolio "Contact / Send
// Inquiry" form. Always owned by the photographer whose portfolio the
// visitor filled it out on — resolved server-side from the portfolio slug
// (see inquiryController.js), exactly like a Portfolio "Book Now" booking.
// Never trusted from the client.
const inquirySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Inquiry", inquirySchema);
