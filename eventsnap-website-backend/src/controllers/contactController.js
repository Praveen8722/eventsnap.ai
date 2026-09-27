import ContactMessage from "../models/ContactMessage.js";
import { notifyNewContactMessage } from "../services/mailService.js";

// ================= SUBMIT CONTACT MESSAGE =================
export const submitContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    const requiredFields = { name, email, subject, message };
    const missingFields = Object.keys(requiredFields).filter((key) => {
      const value = requiredFields[key];
      return value === undefined || value === null || String(value).trim() === "";
    });
    if (missingFields.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missingFields.join(", ")}`,
      });
    }

    const contactMessage = new ContactMessage({ name, email, subject, message });
    await contactMessage.save();

    // A notification failure must not block the submission from succeeding.
    try {
      await notifyNewContactMessage({ name, email, subject, message });
    } catch (notifyError) {
      console.error("Contact notification failed:", notifyError.message);
    }

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      contactMessage,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

// ================= VIEW CONTACT MESSAGES =================
export const viewContactMessages = async (req, res) => {
  try {
    const contactMessages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Contact messages retrieved successfully",
      contactMessages,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};
