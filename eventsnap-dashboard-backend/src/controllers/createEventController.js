import crypto from "crypto";
import mongoose from "mongoose";
import CreateEvent, {
  CREATE_EVENT_STATUSES,
  PHOTO_DOWNLOAD_OPTIONS,
} from "../models/CreateEvent.js";
import CreateEventGuestRegistration from "../models/CreateEventGuestRegistration.js";
import {
  discardPhotos,
  removeUnreferencedPhotos,
  sendPhotoDownload,
} from "../services/createEventPhotoStorage.js";

// Dashboard → "Create Event". Every handler is behind authMiddleware and
// scopes each query to req.userId (from the verified JWT) — a user id in the
// request body is never read. Someone else's event is reported as 404, the
// same as one that doesn't exist.

// Guards the document size (16 MB) — each photo entry is ~200 bytes.
const MAX_PHOTOS_PER_EVENT = 10000;
const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const notFound = (res) =>
  res.status(404).json({ success: false, message: "Event not found" });

const serverError = (res, error) =>
  res.status(500).json({ success: false, message: error?.message || "Server Error" });

// Owner-scoped filter for one event, or null for a malformed id.
const ownEvent = (req) =>
  /^[0-9a-f]{24}$/i.test(req.params.id) ? { _id: req.params.id, user: req.userId } : null;

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "event";

// Random suffix keeps share links unguessable and unique across users.
const newSlug = (name) => `${slugify(name)}-${crypto.randomBytes(4).toString("hex")}`;

const toBool = (value) => value === true || value === "true";

const serializePhoto = (photo) => ({
  id: String(photo._id),
  url: photo.url,
  originalName: photo.originalName,
  size: photo.size,
  faceIndexed: !!photo.faceIndexed,
  createdAt: photo.createdAt,
});

// API shape for one event. The owner id is never sent back. `photos` are
// included only where asked; photoCount is always present.
const serializeEvent = (event, { withPhotos = false } = {}) => {
  const photos = event.photos || [];
  return {
    id: String(event._id),
    name: event.name,
    date: event.date ? new Date(event.date).toISOString().slice(0, 10) : "",
    location: event.location || "",
    slug: event.slug,
    coverPhoto: event.coverPhoto || "",
    photoDownload: event.photoDownload,
    pricePerPhoto: event.pricePerPhoto || 0,
    guestAccess: {
      faceSearch: !!event.guestAccess?.faceSearch,
      screenshot: !!event.guestAccess?.screenshot,
      guestRegistration: !!event.guestAccess?.guestRegistration,
      instagramFollow: !!event.guestAccess?.instagramFollow,
      instagramHandle: event.guestAccess?.instagramHandle || "",
    },
    status: event.status,
    guestViews: event.guestViews || 0,
    downloads: event.downloads || 0,
    photoCount: event.photoCount ?? photos.length,
    // Photos processed for guest selfie search (Face Search).
    faceIndexedCount: event.faceIndexedCount ?? photos.filter((p) => p.faceIndexed).length,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    ...(withPhotos && { photos: photos.map(serializePhoto) }),
  };
};

// Applies the editable fields present in `body` onto `target` (a plain
// object for create, the loaded document for update) and validates the
// result as a whole. Returns an error message, or null when valid. Works for
// JSON bodies and multipart forms (where guestAccess arrives as a JSON
// string and booleans/numbers as strings).
const applyFields = (target, body, { creating }) => {
  if (creating || body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) return "Event name is required";
    if (body.name.trim().length > 120) return "Event name must be 120 characters or fewer";
    target.name = body.name.trim();
  }

  if (creating || body.date !== undefined) {
    const valid =
      typeof body.date === "string" &&
      DATE_ONLY.test(body.date) &&
      !Number.isNaN(new Date(body.date).getTime());
    if (!valid) return "A valid event date is required";
    target.date = new Date(body.date);
  }

  if (body.location !== undefined) {
    if (typeof body.location !== "string") return "Invalid location";
    if (body.location.trim().length > 200) return "Location must be 200 characters or fewer";
    target.location = body.location.trim();
  }

  if (body.photoDownload !== undefined) {
    if (!PHOTO_DOWNLOAD_OPTIONS.includes(body.photoDownload)) {
      return `Photo download must be one of: ${PHOTO_DOWNLOAD_OPTIONS.join(", ")}`;
    }
    target.photoDownload = body.photoDownload;
  }

  if (body.pricePerPhoto !== undefined && body.pricePerPhoto !== "") {
    const price = Number(body.pricePerPhoto);
    if (!Number.isFinite(price) || price < 0) return "Price per photo must be a positive number";
    target.pricePerPhoto = Math.round(price * 100) / 100;
  }

  if (body.guestAccess !== undefined) {
    let access = body.guestAccess;
    if (typeof access === "string") {
      try {
        access = JSON.parse(access);
      } catch {
        return "Invalid guest access settings";
      }
    }
    if (!access || typeof access !== "object" || Array.isArray(access)) {
      return "Invalid guest access settings";
    }
    const current = target.guestAccess || {};
    const next = {
      faceSearch: !!current.faceSearch,
      screenshot: !!current.screenshot,
      guestRegistration: !!current.guestRegistration,
      instagramFollow: !!current.instagramFollow,
      instagramHandle: current.instagramHandle || "",
    };
    for (const key of ["faceSearch", "screenshot", "guestRegistration", "instagramFollow"]) {
      if (access[key] !== undefined) next[key] = toBool(access[key]);
    }
    if (access.instagramHandle !== undefined) {
      if (typeof access.instagramHandle !== "string") return "Invalid Instagram handle";
      next.instagramHandle = access.instagramHandle.trim().replace(/^@/, "");
    }
    target.guestAccess = next;
  }

  if (!creating && body.status !== undefined) {
    if (!CREATE_EVENT_STATUSES.includes(body.status)) {
      return `Status must be one of: ${CREATE_EVENT_STATUSES.join(", ")}`;
    }
    target.status = body.status;
  }

  // Rules that depend on more than one field.
  const download = target.photoDownload || "disabled";
  if (download === "paid") {
    if (!(Number(target.pricePerPhoto) > 0)) return "Enter a price per photo for paid downloads";
  } else {
    target.pricePerPhoto = 0;
  }
  const access = target.guestAccess || {};
  if (access.instagramFollow) {
    if (!access.instagramHandle) return "Enter the Instagram handle guests must follow";
    if (!INSTAGRAM_HANDLE.test(access.instagramHandle)) return "Enter a valid Instagram handle";
  }
  return null;
};

//================== CREATE EVENT =================
// JSON, or multipart with an optional "cover" photo (stored before this runs).
export const createEvent = async (req, res) => {
  const coverUrl = req.file?.url;
  try {
    const body = req.body || {};
    const fields = {};
    const error = applyFields(fields, body, { creating: true });
    if (error) {
      await discardPhotos([coverUrl]);
      return res.status(400).json({ success: false, message: error });
    }

    let event;
    // A slug collision is astronomically unlikely, but retry rather than fail.
    for (let attempt = 0; !event; attempt++) {
      try {
        event = await CreateEvent.create({
          ...fields,
          user: req.userId,
          slug: newSlug(fields.name),
          coverPhoto: coverUrl || "",
        });
      } catch (err) {
        if (err?.code !== 11000 || attempt >= 2) throw err;
      }
    }

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: serializeEvent(event, { withPhotos: true }),
    });
  } catch (error) {
    await discardPhotos([coverUrl]);
    serverError(res, error);
  }
};

//================== GET MY EVENTS =================
// Newest first; photos are summarised as photoCount (fetch them per event).
export const getMyEvents = async (req, res) => {
  try {
    const events = await CreateEvent.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(String(req.userId)) } },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          photoCount: { $size: "$photos" },
          faceIndexedCount: {
            $size: { $filter: { input: "$photos", as: "p", cond: { $eq: ["$$p.faceIndexed", true] } } },
          },
        },
      },
      { $project: { photos: 0 } },
    ]);
    res.status(200).json({
      success: true,
      message: "Events retrieved successfully",
      events: events.map((e) => serializeEvent(e)),
    });
  } catch (error) {
    serverError(res, error);
  }
};

//================== PUBLIC EVENT (by share id) =================
// Public guest page (/share/<shareId>). No login: the event's permanent share
// id (from its QR / public link) is the access key, and only that one event
// is returned. The owner, internal id and statistics are never included.
const SHARE_ID = /^[a-z0-9-]{1,64}$/;
const validShareId = (value) => typeof value === "string" && SHARE_ID.test(value);

// True when the request carries a valid session of the event's own owner
// (optionalAuthMiddleware sets req.userId) — the owner's own visits and
// downloads are not counted as guest activity.
const isOwner = (req, event) => !!req.userId && String(event.user) === String(req.userId);

export const getPublicEvent = async (req, res) => {
  try {
    const { shareId } = req.params;
    if (!validShareId(shareId)) return notFound(res);

    const event = await CreateEvent.findOne({ slug: shareId }).lean();
    if (!event) return notFound(res);

    // Explicit allow-list: a field added to the event later stays private.
    const e = serializeEvent(event, { withPhotos: true });
    res.status(200).json({
      success: true,
      event: {
        shareId: e.slug,
        name: e.name,
        date: e.date,
        location: e.location,
        coverPhoto: e.coverPhoto,
        status: e.status,
        photoCount: e.photoCount,
        // With Face Search on, guests only see photos matched to their
        // selfie (POST /public/:shareId/face-search) — never the full list.
        photos: e.guestAccess.faceSearch ? [] : e.photos.map(({ id, url }) => ({ id, url })),
        faceIndexedCount: e.faceIndexedCount,
        photoDownload: e.photoDownload,
        pricePerPhoto: e.pricePerPhoto,
        guestAccess: e.guestAccess,
      },
    });
  } catch (error) {
    serverError(res, error);
  }
};

//================== GUEST SELFIE SEARCH =================
// POST /public/:shareId/face-search  { descriptor: [128 numbers] }
// The selfie itself never reaches the server: the guest's browser turns it
// into a 128-value face descriptor, and this compares that with the face
// signatures stored on this event's photos only. Returns the matching photos
// (closest first). Refused when the event's Face Search setting is off.
const DESCRIPTOR_LENGTH = 128;
// Quantisation used when signatures are stored (see saveFaceSignatures).
const QUANT_SCALE = 254;
// face-api's recommended same-person distance is 0.6; slightly stricter so
// guests rarely see other people's photos.
const MATCH_DISTANCE = 0.55;

const distanceTo = (descriptor, signature) => {
  let sum = 0;
  for (let i = 0; i < DESCRIPTOR_LENGTH; i++) {
    const d = descriptor[i] - signature.readInt8(i) / QUANT_SCALE;
    sum += d * d;
  }
  return Math.sqrt(sum);
};

export const faceSearch = async (req, res) => {
  try {
    const { shareId } = req.params;
    if (!validShareId(shareId)) return notFound(res);
    const descriptor = req.body?.descriptor;
    if (
      !Array.isArray(descriptor) ||
      descriptor.length !== DESCRIPTOR_LENGTH ||
      !descriptor.every((v) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 2)
    ) {
      return res.status(400).json({ success: false, message: "Invalid face data" });
    }

    const event = await CreateEvent.findOne({ slug: shareId }).select("guestAccess photos").lean();
    if (!event) return notFound(res);
    if (!event.guestAccess?.faceSearch) {
      return res.status(403).json({ success: false, message: "Face search is turned off for this event" });
    }

    const matches = [];
    let indexed = 0;
    for (const photo of event.photos || []) {
      if (!photo.faceIndexed) continue;
      indexed++;
      let best = Infinity;
      for (const raw of photo.faces || []) {
        const signature = Buffer.isBuffer(raw) ? raw : Buffer.from(raw.buffer || raw);
        if (signature.length !== DESCRIPTOR_LENGTH) continue;
        best = Math.min(best, distanceTo(descriptor, signature));
      }
      if (best <= MATCH_DISTANCE) matches.push({ id: String(photo._id), url: photo.url, distance: best });
    }
    matches.sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      success: true,
      matches: matches.map(({ id, url }) => ({ id, url })),
      indexed,
      total: (event.photos || []).length,
    });
  } catch (error) {
    serverError(res, error);
  }
};

//================== RECORD GUEST VIEW =================
// POST /public/:shareId/view — called once per guest page load (the page
// also skips repeats within the same browser session). Atomic $inc, so
// simultaneous guests never overwrite each other. The owner's own visit
// (signed in on the same browser) isn't counted.
export const recordGuestView = async (req, res) => {
  try {
    const { shareId } = req.params;
    if (!validShareId(shareId)) return notFound(res);

    const event = await CreateEvent.findOne({ slug: shareId }).select("user").lean();
    if (!event) return notFound(res);
    if (isOwner(req, event)) return res.status(200).json({ success: true, counted: false });

    await CreateEvent.updateOne({ _id: event._id }, { $inc: { guestViews: 1 } });
    res.status(200).json({ success: true, counted: true });
  } catch (error) {
    serverError(res, error);
  }
};

//================== GUEST REGISTRATION =================
// POST /public/:shareId/register — body { name, phone, email? }. Accepted
// only while the event's Guest Registration setting is on; name and phone
// are required, email optional. Saves (or updates) one registration per
// event + phone number.
const GUEST_PHONE = /^\+?[0-9]{7,15}$/; // after removing spaces, dashes, brackets
const GUEST_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerGuest = async (req, res) => {
  try {
    const { shareId } = req.params;
    if (!validShareId(shareId)) return notFound(res);

    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.replace(/[\s()-]/g, "") : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!name || name.length > 100) {
      return res.status(400).json({ success: false, message: "Please enter your full name" });
    }
    if (!GUEST_PHONE.test(phone)) {
      return res.status(400).json({ success: false, message: "Please enter a valid phone number" });
    }
    if (email && (email.length > 254 || !GUEST_EMAIL.test(email))) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }

    const event = await CreateEvent.findOne({ slug: shareId }).select("guestAccess").lean();
    if (!event) return notFound(res);
    if (!event.guestAccess?.guestRegistration) {
      return res.status(403).json({ success: false, message: "Registration isn't needed for this event" });
    }

    try {
      await CreateEventGuestRegistration.updateOne(
        { event: event._id, phone },
        { $set: { name, email } },
        { upsert: true, runValidators: true }
      );
    } catch (error) {
      // Same phone registering twice at the same moment: already saved.
      if (error?.code !== 11000) throw error;
    }
    res.status(201).json({ success: true });
  } catch (error) {
    serverError(res, error);
  }
};

//================== GUEST PHOTO DOWNLOAD =================
// GET /public/:shareId/photos/:photoId/download — streams the photo as a
// file download and, only once it has been completely sent, counts it with
// an atomic $inc. Nothing is counted when downloads are disabled or paid
// (no guest payment flow exists yet), when the photo or file doesn't exist,
// when the transfer fails, or when the owner downloads their own photo.
export const downloadPublicPhoto = async (req, res) => {
  try {
    const { shareId, photoId } = req.params;
    if (!validShareId(shareId) || !/^[0-9a-f]{24}$/i.test(photoId)) {
      return res.status(404).json({ success: false, message: "Photo not found" });
    }

    const event = await CreateEvent.findOne({ slug: shareId }).select("user photoDownload photos");
    if (!event) return notFound(res);

    if (event.photoDownload === "disabled") {
      return res.status(403).json({ success: false, message: "Downloads are turned off for this event" });
    }
    if (event.photoDownload !== "free") {
      return res.status(403).json({ success: false, message: "Paid downloads aren't available yet" });
    }

    const photo = event.photos.id(photoId);
    if (!photo) return res.status(404).json({ success: false, message: "Photo not found" });

    const result = await sendPhotoDownload(photo.url, res, photo.originalName);
    if (result === "missing") {
      return res.status(404).json({ success: false, message: "Photo not found" });
    }
    if (result === "sent" && !isOwner(req, event)) {
      await CreateEvent.updateOne({ _id: event._id }, { $inc: { downloads: 1 } });
    }
  } catch (error) {
    if (!res.headersSent) serverError(res, error);
  }
};

//================== GET ONE EVENT =================
export const getEvent = async (req, res) => {
  try {
    const filter = ownEvent(req);
    const event = filter && (await CreateEvent.findOne(filter));
    if (!event) return notFound(res);
    res.status(200).json({ success: true, event: serializeEvent(event, { withPhotos: true }) });
  } catch (error) {
    serverError(res, error);
  }
};

//================== UPDATE EVENT =================
export const updateEvent = async (req, res) => {
  try {
    const filter = ownEvent(req);
    const event = filter && (await CreateEvent.findOne(filter));
    if (!event) return notFound(res);

    const error = applyFields(event, req.body || {}, { creating: false });
    if (error) return res.status(400).json({ success: false, message: error });

    await event.save();
    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event: serializeEvent(event, { withPhotos: true }),
    });
  } catch (error) {
    serverError(res, error);
  }
};

//================== DELETE EVENT =================
// Also deletes the event's cover and every photo from storage.
export const deleteEvent = async (req, res) => {
  try {
    const filter = ownEvent(req);
    const event = filter && (await CreateEvent.findOneAndDelete(filter));
    if (!event) return notFound(res);

    await removeUnreferencedPhotos(
      [event.coverPhoto, ...event.photos.map((p) => p.url)],
      null,
      req.userId
    );
    await CreateEventGuestRegistration.deleteMany({ event: event._id });
    res.status(200).json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    serverError(res, error);
  }
};

//================== UPLOAD / CHANGE COVER =================
export const uploadCover = async (req, res) => {
  const url = req.file?.url;
  try {
    if (!url) {
      return res.status(400).json({ success: false, message: "Please select a cover photo" });
    }
    const filter = ownEvent(req);
    const previous = filter && (await CreateEvent.findOneAndUpdate(filter, { coverPhoto: url }, { returnDocument: "before" }));
    if (!previous) {
      await discardPhotos([url]);
      return notFound(res);
    }

    // The old cover file is deleted unless it is also one of the gallery photos.
    const event = await CreateEvent.findOne(filter);
    await removeUnreferencedPhotos([previous.coverPhoto], event, req.userId);
    res.status(200).json({
      success: true,
      message: "Cover photo updated",
      event: serializeEvent(event, { withPhotos: true }),
    });
  } catch (error) {
    await discardPhotos([url]);
    serverError(res, error);
  }
};

//================== REMOVE COVER =================
export const removeCover = async (req, res) => {
  try {
    const filter = ownEvent(req);
    const previous = filter && (await CreateEvent.findOneAndUpdate(filter, { coverPhoto: "" }, { returnDocument: "before" }));
    if (!previous) return notFound(res);

    const event = await CreateEvent.findOne(filter);
    await removeUnreferencedPhotos([previous.coverPhoto], event, req.userId);
    res.status(200).json({
      success: true,
      message: "Cover photo removed",
      event: serializeEvent(event, { withPhotos: true }),
    });
  } catch (error) {
    serverError(res, error);
  }
};

//================== SET GALLERY PHOTO AS COVER =================
// Body: { photoId } — must be one of this event's own photos.
export const setCoverFromPhoto = async (req, res) => {
  try {
    const filter = ownEvent(req);
    const event = filter && (await CreateEvent.findOne(filter));
    if (!event) return notFound(res);

    const photoId = req.body?.photoId;
    const photo =
      typeof photoId === "string" && /^[0-9a-f]{24}$/i.test(photoId)
        ? event.photos.id(photoId)
        : null;
    if (!photo) {
      return res.status(404).json({ success: false, message: "Photo not found" });
    }

    const previous = event.coverPhoto;
    event.coverPhoto = photo.url;
    await event.save();
    await removeUnreferencedPhotos([previous], event, req.userId);
    res.status(200).json({
      success: true,
      message: "Cover photo updated",
      event: serializeEvent(event, { withPhotos: true }),
    });
  } catch (error) {
    serverError(res, error);
  }
};

//================== UPLOAD EVENT PHOTOS =================
// The first upload publishes a Draft event (status → "Live").
export const uploadPhotos = async (req, res) => {
  const files = req.files || [];
  const urls = files.map((f) => f.url);
  try {
    if (!files.length) {
      return res.status(400).json({ success: false, message: "Please select at least one photo" });
    }
    const filter = ownEvent(req);
    if (!filter) {
      await discardPhotos(urls);
      return notFound(res);
    }

    const items = files.map((f) => ({ url: f.url, originalName: f.originalname || "", size: f.size || 0 }));
    const event = await CreateEvent.findOneAndUpdate(
      { ...filter, [`photos.${MAX_PHOTOS_PER_EVENT - files.length}`]: { $exists: false } },
      { $push: { photos: { $each: items } }, $set: { status: "Live" } },
      { returnDocument: "after", runValidators: true }
    );
    if (!event) {
      await discardPhotos(urls);
      // Distinguish "not yours / missing" from "event is full".
      if (await CreateEvent.exists(filter)) {
        return res.status(400).json({
          success: false,
          message: `An event can have at most ${MAX_PHOTOS_PER_EVENT} photos`,
        });
      }
      return notFound(res);
    }

    const added = new Set(urls);
    res.status(201).json({
      success: true,
      message: `${files.length} photo${files.length === 1 ? "" : "s"} uploaded`,
      photos: event.photos.filter((p) => added.has(p.url)).map(serializePhoto),
      event: serializeEvent(event, { withPhotos: true }),
    });
  } catch (error) {
    await discardPhotos(urls);
    serverError(res, error);
  }
};

//================== GET EVENT PHOTOS =================
export const getPhotos = async (req, res) => {
  try {
    const filter = ownEvent(req);
    const event = filter && (await CreateEvent.findOne(filter).select("photos"));
    if (!event) return notFound(res);
    res.status(200).json({ success: true, photos: event.photos.map(serializePhoto) });
  } catch (error) {
    serverError(res, error);
  }
};

// Removes the given photo ids from one of the user's events, then deletes
// their files (unless a file is still the cover).
const removePhotos = async (req, res, photoIds) => {
  const filter = ownEvent(req);
  const event = filter && (await CreateEvent.findOne(filter).select("photos"));
  if (!event) return notFound(res);

  const ids = new Set(photoIds.filter((id) => typeof id === "string"));
  const targets = event.photos.filter((p) => ids.has(String(p._id)));
  if (!targets.length) {
    return res.status(404).json({ success: false, message: "Photo not found" });
  }

  const updated = await CreateEvent.findOneAndUpdate(
    filter,
    { $pull: { photos: { _id: { $in: targets.map((p) => p._id) } } } },
    { returnDocument: "after" }
  );
  if (!updated) return notFound(res);
  await removeUnreferencedPhotos(targets.map((p) => p.url), updated, req.userId);

  res.status(200).json({
    success: true,
    message: `${targets.length} photo${targets.length === 1 ? "" : "s"} deleted`,
    event: serializeEvent(updated, { withPhotos: true }),
  });
};

//================== SAVE FACE SIGNATURES =================
// PUT /:id/photos/faces  { photos: [{ id, faces: [base64, ...] }] }
// The photographer's dashboard computes face signatures for the event's
// photos (in the browser) and saves them here: each is a 128-value face
// descriptor quantised to 128 signed bytes, sent as base64. A photo with no
// faces is saved with faces: [] so it isn't processed again. Only photos of
// the caller's own event are touched; each update targets the photo by id
// (arrayFilters), so concurrent uploads/deletes can't misplace signatures.
const MAX_FACE_BATCH = 50;
const MAX_FACES_PER_PHOTO = 50;

export const saveFaceSignatures = async (req, res) => {
  try {
    const filter = ownEvent(req);
    if (!filter) return notFound(res);
    const items = req.body?.photos;
    if (!Array.isArray(items) || !items.length || items.length > MAX_FACE_BATCH) {
      return res.status(400).json({ success: false, message: `Send 1–${MAX_FACE_BATCH} photos at a time` });
    }

    const ops = [];
    for (const item of items) {
      if (typeof item?.id !== "string" || !/^[0-9a-f]{24}$/i.test(item.id)) {
        return res.status(400).json({ success: false, message: "Invalid photo id" });
      }
      if (!Array.isArray(item.faces) || item.faces.length > MAX_FACES_PER_PHOTO) {
        return res.status(400).json({ success: false, message: "Invalid face data" });
      }
      const faces = [];
      for (const f of item.faces) {
        const buf = typeof f === "string" ? Buffer.from(f, "base64") : null;
        if (!buf || buf.length !== DESCRIPTOR_LENGTH) {
          return res.status(400).json({ success: false, message: "Invalid face data" });
        }
        faces.push(buf);
      }
      ops.push({
        updateOne: {
          filter: { ...filter, "photos._id": item.id },
          update: { $set: { "photos.$[p].faces": faces, "photos.$[p].faceIndexed": true } },
          arrayFilters: [{ "p._id": new mongoose.Types.ObjectId(item.id) }],
        },
      });
    }

    if (!(await CreateEvent.exists(filter))) return notFound(res);
    const result = await CreateEvent.bulkWrite(ops, { ordered: false });
    // matchedCount = photos of this event that were found and updated.
    res.status(200).json({ success: true, saved: result.matchedCount });
  } catch (error) {
    serverError(res, error);
  }
};

//================== DELETE ONE PHOTO =================
export const deletePhoto = async (req, res) => {
  try {
    await removePhotos(req, res, [req.params.photoId]);
  } catch (error) {
    serverError(res, error);
  }
};

//================== DELETE SELECTED PHOTOS =================
// Body: { photoIds: [...] }
export const deletePhotos = async (req, res) => {
  try {
    const photoIds = req.body?.photoIds;
    if (!Array.isArray(photoIds) || !photoIds.length) {
      return res.status(400).json({ success: false, message: "Select at least one photo" });
    }
    await removePhotos(req, res, photoIds);
  } catch (error) {
    serverError(res, error);
  }
};
