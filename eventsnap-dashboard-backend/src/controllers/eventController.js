import Event from "../models/Event.js";
import Booking from "../models/Booking.js";

const REQUIRED_FIELDS = ["title", "date", "startTime", "endTime"];

const findMissing = (body) =>
  REQUIRED_FIELDS.filter(
    (key) =>
      body[key] === undefined ||
      body[key] === null ||
      String(body[key]).trim() === ""
  );

//================== CREATE EVENT =================
export const createEvent = async (req, res) => {
  try {
    const missing = findMissing(req.body);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(", ")}`,
      });
    }

    const {
      title,
      type,
      date,
      startTime,
      endTime,
      location,
      bookingId,
      color,
      notes,
    } = req.body;

    // A linked booking must actually be one of yours — never pulls another
    // photographer's booking into your calendar.
    if (bookingId) {
      const booking = await Booking.findOne({ bookingId, user: req.userId }).select("_id");
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }
    }

    const event = await Event.create({
      user: req.userId,
      title,
      type: type || "Booking / Shoot",
      date,
      startTime: startTime || "",
      endTime: endTime || "",
      location: location || "",
      bookingId: bookingId || "",
      color: color || "#6C63FF",
      notes: notes || "",
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== VIEW EVENTS =================
export const viewEvents = async (req, res) => {
  try {
    const events = await Event.find({ user: req.userId }).sort({ date: 1, startTime: 1 });
    res.status(200).json({
      success: true,
      message: "Events retrieved successfully",
      events,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== UPDATE EVENT =================
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = [
      "title",
      "type",
      "date",
      "startTime",
      "endTime",
      "location",
      "bookingId",
      "color",
      "notes",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const event = await Event.findOneAndUpdate(
      { _id: id, user: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== DELETE EVENT =================
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOneAndDelete({ _id: id, user: req.userId });
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    res.status(200).json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};
