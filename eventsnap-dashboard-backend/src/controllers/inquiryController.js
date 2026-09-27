import Inquiry from "../models/Inquiry.js";
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";
import { sendInquiryEmail } from "../services/emailservice.js";
import { whatsAppLink } from "../utils/whatsapp.js";

// ================= SUBMIT INQUIRY (Public Portfolio Contact form) =================
// Hit by the anonymous "Contact" / "Send Inquiry" form on a photographer's
// public portfolio (eventsnap.ai/p/:slug) — no login. The slug in the URL is
// the only thing that decides which photographer this belongs to; the
// visitor never supplies (and could never spoof) an owner id directly.
export const submitInquiry = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, email, phone, eventType, message } = req.body;

    const requiredFields = { name, email };
    const missingFields = Object.keys(requiredFields).filter((key) => {
      const value = requiredFields[key];
      return (
        value === undefined || value === null || String(value).trim() === ""
      );
    });
    if (missingFields.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missingFields.join(", ")}`,
      });
    }

    const portfolio = await Portfolio.findOne({ slug: String(slug || "").trim() }).select(
      "user"
    );
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    const inquiry = await Inquiry.create({
      user: portfolio.user,
      name,
      email,
      phone: phone || "",
      eventType: eventType || "",
      message: message || "",
    });

    // The photographer's contact details come only from the slug-resolved
    // owner's registered account — never from the request body.
    const owner = await User.findById(portfolio.user).select(
      "name businessName email phone"
    );

    // Email the owner's registered account email. Fire-and-forget: the
    // visitor's response doesn't wait on SMTP, and an email failure never
    // undoes the saved inquiry (it's still in the photographer's Notifications).
    if (owner?.email) {
      sendInquiryEmail({
        to: owner.email,
        photographerName: owner.name || owner.businessName,
        inquiry,
      }).catch((err) => console.error("Inquiry email failed:", err.message));
    }

    // wa.me link to the owner's registered (signup) phone, pre-filled with
    // this enquiry. It only opens WhatsApp — the visitor still presses Send.
    const whatsappUrl = whatsAppLink(
      owner?.phone,
      [
        `Hi ${owner?.businessName || owner?.name || ""}, I just sent an enquiry from your EventSnap portfolio:`,
        `Name: ${inquiry.name}`,
        `Email: ${inquiry.email}`,
        inquiry.phone && `Phone: ${inquiry.phone}`,
        inquiry.eventType && `Event Type: ${inquiry.eventType}`,
        inquiry.message && `Message: ${inquiry.message}`,
      ]
        .filter(Boolean)
        .join("\n")
    );

    // The owner's user id stays private (same as the public portfolio
    // response, which strips `user`), so only the visitor's own data is echoed.
    const { user: _owner, ...publicInquiry } = inquiry.toObject();
    res.status(201).json({
      success: true,
      message: "Inquiry sent successfully",
      inquiry: publicInquiry,
      whatsappUrl,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

// ================= VIEW MY INQUIRIES (Dashboard Notifications) =================
export const viewInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ user: req.userId }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      message: "Inquiries retrieved successfully",
      inquiries,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};
