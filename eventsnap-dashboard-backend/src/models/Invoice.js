import mongoose from "mongoose";

// One invoice per photographer. Every invoice route requires a signed-in
// session (see invoiceRoutes.js — all authMiddleware-protected, no public
// path), so `user` is always set server-side from req.userId in
// invoiceController.js — never trusted from the client.
const invoiceSchema = new mongoose.Schema(
  {
    // "INV00N", generated per photographer (see
    // invoiceController.nextInvoiceId) — only needs to be unique within one
    // owner's invoices, exactly like Booking/Gallery ids.
    invoiceId: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The linked Booking's bookingId (like "BK001") — a snapshot reference,
    // not populated/validated against Booking here (see
    // invoiceController.createInvoice).
    bookingId: {
      type: String,
      required: true,
    },
    clientName: {
      type: String,
      default: "Unknown",
    },
    email: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
    },
    description: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Paid"],
      default: "Draft",
    },
  },
  { timestamps: true }
);

invoiceSchema.index(
  { user: 1, invoiceId: 1 },
  { unique: true }
);

export default mongoose.model("Invoice", invoiceSchema);
