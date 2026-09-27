import crypto from "node:crypto";
import fs from "fs";
import path from "path";
import Gallery from "../models/Gallery.js";
import Booking from "../models/Booking.js";
import { GALLERY_UPLOAD_DIR } from "../middleware/uploadGallery.js";

// Next "GAL00N" id, based on the most recently created gallery for this
// photographer only. Gallery ids are independent per owner, just like booking
// numbers.
const nextGalleryId = async (userId) => {
  const last = await Gallery.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .select("galleryId");
  let next = 1;
  if (last && last.galleryId) {
    const num = parseInt(String(last.galleryId).replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(num)) next = num + 1;
  }
  return `GAL${next.toString().padStart(3, "0")}`;
};

const removePhotoFiles = (gallery) => {
  for (const photo of gallery.photos || []) {
    if (!photo.filename) continue;
    const filePath = path.join(GALLERY_UPLOAD_DIR, photo.filename);
    fs.promises.unlink(filePath).catch(() => {});
  }
};

// Multer file -> stored photo sub-document.
const toPhoto = (f) => ({
  filename: f.filename,
  originalName: f.originalname,
  url: `/uploads/galleries/${f.filename}`,
  size: f.size,
});

const randomSlug = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10);

// One gallery per booking. Creates an EMPTY gallery for a booking if it does
// not already have one, reusing the customer name, Booking ID and event
// details from the booking (no duplicate customer/booking data is stored).
// Used by the "Booking Confirmed -> Gallery auto-created" flow. Returns the
// existing or newly created gallery, or null if the booking has no id.
export const ensureGalleryForBooking = async (booking) => {
  if (!booking || !booking.bookingId) return null;

  const ownerId = booking.user ?? null;
  if (!ownerId) return null;

  const existing = await Gallery.findOne({
    bookingId: booking.bookingId,
    user: ownerId,
  });
  if (existing) return existing;

  const clientName = booking.clientName || "";
  const eventType = booking.eventType || "";
  return Gallery.create({
    galleryId: await nextGalleryId(ownerId),
    // Inherit the booking's owner — a gallery always stays within the same
    // photographer's account as the booking it was created for.
    user: ownerId,
    title: eventType
      ? `${clientName || "Client"} — ${eventType}`
      : `${clientName || "Client"} Gallery`,
    bookingId: booking.bookingId,
    clientName,
    eventType,
    photos: [],
    watermark: false,
    shareSlug: randomSlug(),
  });
};

//================== CREATE GALLERY =================
export const createGallery = async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Gallery title is required" });
    }

    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one photo",
      });
    }

    const bookingId = String(req.body.bookingId || "").trim();
    let clientName = String(req.body.clientName || "").trim();
    let eventType = String(req.body.eventType || "").trim();

    // One gallery per booking — never create a duplicate for a booking that
    // already has one (auto-created on "Confirmed" or created earlier).
    if (bookingId) {
      const existing = await Gallery.findOne({ bookingId, user: req.userId });
      if (existing) {
        return res.status(409).json({
          success: false,
          message:
            "This booking already has a gallery. Open it to upload photos.",
        });
      }

      // Snapshot client details from the linked booking — only ever your own.
      const booking = await Booking.findOne({
        bookingId,
        user: req.userId,
      }).select("clientName eventType");
      if (booking) {
        clientName = clientName || booking.clientName || "";
        eventType = eventType || booking.eventType || "";
      }
    }

    const photos = files.map(toPhoto);

    const watermark =
      req.body.watermark === true || req.body.watermark === "true";

    const gallery = await Gallery.create({
      galleryId: await nextGalleryId(req.userId),
      user: req.userId,
      title,
      bookingId,
      clientName,
      eventType,
      photos,
      watermark,
      shareSlug: randomSlug(),
    });

    res.status(201).json({
      success: true,
      message: "Gallery created successfully",
      gallery,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== VIEW GALLERIES =================
export const viewGalleries = async (req, res) => {
  try {
    // Optional ?bookingId=BK001 filter to fetch the gallery for one booking.
    const filter = { user: req.userId };
    if (req.query.bookingId) {
      filter.bookingId = String(req.query.bookingId).trim();
    }
    const galleries = await Gallery.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Galleries retrieved successfully",
      galleries,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== GET ONE GALLERY (by _id or galleryId) =================
export const getGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const gallery = id.match(/^[0-9a-fA-F]{24}$/)
      ? await Gallery.findOne({ _id: id, user: req.userId })
      : await Gallery.findOne({ galleryId: id, user: req.userId });
    if (!gallery) {
      return res
        .status(404)
        .json({ success: false, message: "Gallery not found" });
    }
    res.status(200).json({ success: true, gallery });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== PUBLIC SHARE VIEW (counts a view) =================
export const getSharedGallery = async (req, res) => {
  try {
    const { slug } = req.params;
    const gallery = await Gallery.findOneAndUpdate(
      { shareSlug: slug },
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!gallery) {
      return res
        .status(404)
        .json({ success: false, message: "Gallery not found" });
    }
    res.status(200).json({ success: true, gallery });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== UPDATE GALLERY (title / watermark) =================
export const updateGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    if (req.body.title !== undefined)
      updates.title = String(req.body.title).trim();
    if (req.body.watermark !== undefined)
      updates.watermark =
        req.body.watermark === true || req.body.watermark === "true";

    const gallery = await Gallery.findOneAndUpdate(
      { _id: id, user: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!gallery) {
      return res
        .status(404)
        .json({ success: false, message: "Gallery not found" });
    }
    res.status(200).json({
      success: true,
      message: "Gallery updated successfully",
      gallery,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== ADD PHOTOS TO AN EXISTING GALLERY =================
export const addGalleryPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one photo to upload",
      });
    }

    const gallery = id.match(/^[0-9a-fA-F]{24}$/)
      ? await Gallery.findOne({ _id: id, user: req.userId })
      : await Gallery.findOne({ galleryId: id, user: req.userId });
    if (!gallery) {
      return res
        .status(404)
        .json({ success: false, message: "Gallery not found" });
    }

    gallery.photos.push(...files.map(toPhoto));
    await gallery.save();

    res.status(200).json({
      success: true,
      message: `${files.length} photo(s) added`,
      gallery,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== DELETE A SINGLE PHOTO FROM A GALLERY =================
export const deleteGalleryPhoto = async (req, res) => {
  try {
    const { id, photoId } = req.params;

    const gallery = id.match(/^[0-9a-fA-F]{24}$/)
      ? await Gallery.findOne({ _id: id, user: req.userId })
      : await Gallery.findOne({ galleryId: id, user: req.userId });
    if (!gallery) {
      return res
        .status(404)
        .json({ success: false, message: "Gallery not found" });
    }

    const photo = gallery.photos.id(photoId);
    if (!photo) {
      return res
        .status(404)
        .json({ success: false, message: "Photo not found" });
    }

    const { filename } = photo;
    gallery.photos.pull(photoId);
    await gallery.save();

    // Remove the file from disk storage.
    if (filename) {
      fs.promises
        .unlink(path.join(GALLERY_UPLOAD_DIR, filename))
        .catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: "Photo deleted",
      gallery,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== DELETE MULTIPLE PHOTOS FROM A GALLERY =================
export const deleteGalleryPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const ids = Array.isArray(req.body.photoIds)
      ? req.body.photoIds.map(String)
      : [];
    if (!ids.length) {
      return res
        .status(400)
        .json({ success: false, message: "No photos selected" });
    }

    const gallery = id.match(/^[0-9a-fA-F]{24}$/)
      ? await Gallery.findOne({ _id: id, user: req.userId })
      : await Gallery.findOne({ galleryId: id, user: req.userId });
    if (!gallery) {
      return res
        .status(404)
        .json({ success: false, message: "Gallery not found" });
    }

    const removedFiles = [];
    for (const photoId of ids) {
      const photo = gallery.photos.id(photoId);
      if (photo) {
        removedFiles.push(photo.filename);
        gallery.photos.pull(photoId);
      }
    }
    if (!removedFiles.length) {
      return res
        .status(404)
        .json({ success: false, message: "No matching photos found" });
    }

    await gallery.save();

    for (const filename of removedFiles) {
      if (filename) {
        fs.promises
          .unlink(path.join(GALLERY_UPLOAD_DIR, filename))
          .catch(() => {});
      }
    }

    res.status(200).json({
      success: true,
      message: `${removedFiles.length} photo(s) deleted`,
      gallery,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== TRACK DOWNLOAD (counts a download) =================
export const trackDownload = async (req, res) => {
  try {
    const { id } = req.params;
    const gallery = id.match(/^[0-9a-fA-F]{24}$/)
      ? await Gallery.findByIdAndUpdate(
          id,
          { $inc: { downloads: 1 } },
          { new: true }
        )
      : await Gallery.findOneAndUpdate(
          { shareSlug: id },
          { $inc: { downloads: 1 } },
          { new: true }
        );
    if (!gallery) {
      return res
        .status(404)
        .json({ success: false, message: "Gallery not found" });
    }
    res.status(200).json({ success: true, downloads: gallery.downloads });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};

//================== DELETE GALLERY =================
export const deleteGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const gallery = await Gallery.findOneAndDelete({ _id: id, user: req.userId });
    if (!gallery) {
      return res
        .status(404)
        .json({ success: false, message: "Gallery not found" });
    }
    removePhotoFiles(gallery);
    res
      .status(200)
      .json({ success: true, message: "Gallery deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};
