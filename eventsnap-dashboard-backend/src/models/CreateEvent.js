import crypto from "crypto";
import mongoose from "mongoose";

// Dashboard → "Create Event": a photographer's shareable event gallery (cover
// photo, guest photos, QR/share link, guest access rules). Its own collection
// ("createevents") — separate from the calendar's Event model.

export const PHOTO_DOWNLOAD_OPTIONS = ["disabled", "free", "paid"];
export const CREATE_EVENT_STATUSES = ["Draft", "Live"];

// One uploaded photo. The file lives in MongoDB GridFS (bucket
// "createEventPhotos", see services/createEventPhotoStorage.js); this keeps
// only its "/api/create-events/photos/<fileId>" url.
const photoSchema = new mongoose.Schema(
  {
    // Random, unguessable id (not a timestamp + counter ObjectId), so a guest
    // shown one photo can't work out the ids of the event's other photos.
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId(crypto.randomBytes(12)) },
    url: { type: String, required: true },
    originalName: { type: String, default: "" },
    size: { type: Number, default: 0 },
    // Guest selfie search (Guest Access → Face Search): one face signature
    // per face found in the photo — a 128-value descriptor quantised to 128
    // signed bytes, computed in the photographer's browser. faceIndexed stays
    // false until the photo has been processed (it may contain no faces).
    faceIndexed: { type: Boolean, default: false },
    faces: { type: [Buffer], default: [] },
  },
  { timestamps: true }
);

const guestAccessSchema = new mongoose.Schema(
  {
    faceSearch: { type: Boolean, default: false },
    screenshot: { type: Boolean, default: false },
    guestRegistration: { type: Boolean, default: true },
    instagramFollow: { type: Boolean, default: false },
    instagramHandle: { type: String, default: "", trim: true, maxlength: 60 },
  },
  { _id: false }
);

const createEventSchema = new mongoose.Schema(
  {
    // The photographer this event belongs to. Set server-side from the
    // authenticated user only — never taken from the request body.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Couple / event name.
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    // Permanent public share id used by the event's QR code / public link.
    // Generated server-side at creation and immutable afterwards (Mongoose
    // ignores any later change), so renaming or editing the event never
    // breaks a printed QR.
    slug: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    // "/api/create-events/photos/<fileId>" or "" — either a dedicated cover
    // upload or one of the event's own photos.
    coverPhoto: {
      type: String,
      default: "",
    },
    photoDownload: {
      type: String,
      enum: PHOTO_DOWNLOAD_OPTIONS,
      default: "disabled",
    },
    // Price per photo (₹) when photoDownload is "paid"; 0 otherwise.
    pricePerPhoto: {
      type: Number,
      default: 0,
      min: 0,
    },
    guestAccess: {
      type: guestAccessSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: CREATE_EVENT_STATUSES,
      default: "Draft",
    },
    photos: {
      type: [photoSchema],
      default: [],
    },
    // Guest opens of the public share page (/share/<slug>). Incremented only
    // by the public "record view" endpoint with $inc — never by the owner.
    guestViews: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Completed guest photo downloads. Incremented with $inc only after the
    // public download endpoint has fully sent a permitted photo.
    downloads: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// "My events" listing (newest first) and every owner-scoped lookup.
createEventSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("CreateEvent", createEventSchema);
