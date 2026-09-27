import Invoice from "../models/Invoice.js";
import Booking from "../models/Booking.js";

const nextInvoiceId = async (userId) => {
  const last = await Invoice.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .select("invoiceId");
  let n = 1;
  if (last && last.invoiceId) {
    const num = parseInt(String(last.invoiceId).replace("INV", ""), 10);
    if (!isNaN(num)) n = num + 1;
  }
  return `INV${n.toString().padStart(3, "0")}`;
};

//================== CREATE INVOICE =================
export const createInvoice = async (req, res) => {
  try {
    const { bookingId, clientName, email, amount, dueDate, description, notes, status } =
      req.body;

    if (!bookingId || String(bookingId).trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "bookingId is required" });
    }
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return res
        .status(400)    
        .json({ success: false, message: "amount must be a number" });
    }

    // Fill client details from the booking when the caller didn't send them
    // — only ever from one of your own bookings.
    const booking = await Booking.findOne({ bookingId, user: req.userId });
    const invoiceId = await nextInvoiceId(req.userId);

    const invoice = await Invoice.create({
      invoiceId,
      user: req.userId,
      bookingId,
      clientName: clientName || booking?.clientName || "Unknown",
      email: email || booking?.email || "",
      amount: Number(amount),
      dueDate: dueDate ? new Date(dueDate) : undefined, 
      description: description || "",
      notes: notes || "",
      status: ["Draft", "Sent", "Paid"].includes(status) ? status : "Draft",
    });

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      invoice,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== VIEW INVOICES =================
export const viewInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.userId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Invoices retrieved successfully",
      invoices,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== UPDATE INVOICE (Edit / status / Send) =================
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = [
      "clientName",
      "email",
      "amount",
      "dueDate",
      "description",
      "notes",
      "status",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      updates[key] = req.body[key];
    }

    if (updates.amount !== undefined) {
      if (isNaN(Number(updates.amount))) {
        return res
          .status(400)
          .json({ success: false, message: "amount must be a number" });
      }
      updates.amount = Number(updates.amount);
    }
    if (updates.dueDate !== undefined) {
      updates.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    }
    if (
      updates.status !== undefined &&
      !["Draft", "Sent", "Paid"].includes(updates.status)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, user: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }
    res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      invoice,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== INVOICES FOR A BOOKING =================
export const getInvoicesByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const invoices = await Invoice.find({ bookingId, user: req.userId }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      message: "Invoices retrieved successfully",
      invoices,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};
