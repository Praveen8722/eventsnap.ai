import express from "express";
import {
  createInvoice,
  viewInvoices,
  getInvoicesByBooking,
  updateInvoice,
} from "../controllers/invoiceController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();
router.post("/create-invoice", authMiddleware, createInvoice);
router.get("/view-invoices", authMiddleware, viewInvoices);
router.get("/booking/:bookingId", authMiddleware, getInvoicesByBooking);
router.put("/:id", authMiddleware, updateInvoice);

export default router;
