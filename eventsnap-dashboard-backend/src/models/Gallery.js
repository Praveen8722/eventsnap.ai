import mongoose from "mongoose";

// One uploaded photo. Files live on disk under uploads/galleries/ and are
// served statically at /uploads/galleries/<filename>.
const photoSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, default: "" },
    url: { type: String, required: true },
    size: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const gallerySchema = new mongoose.Schema(
  {
    // Human-readable id like "GAL001".
    galleryId: {
      type: String,
      required: true,
    },
    // The photographer this gallery belongs to. Set server-side only —
    // inherited from the booking it's created for, or from the authenticated
    // user when created directly. Left unset on legacy galleries created
    // before ownership existed.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    title: {
      type: String,
      required: true,
    },
    // Optional link to a Booking (bookingId like "BK001"), plus a snapshot of
    // the client details at creation time.
    bookingId: {
      type: String,
      default: "",
    },
    clientName: {
      type: String,
      default: "",
    },
    eventType: {
      type: String,
      default: "",
    },
    photos: {
      type: [photoSchema],
      default: [],
    },
    watermark: {
      type: Boolean,
      default: false,
    },
    // Random public slug used for the shareable link (/g/<slug>).
    shareSlug: {
      type: String,
      unique: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    downloads: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

gallerySchema.index(
  { user: 1, galleryId: 1 },
  { unique: true }
);

const Gallery = mongoose.model("Gallery", gallerySchema);

// Older databases still carry a global unique index on galleryId alone
// ("galleryId_1") from before ids became per-photographer. Mongoose never
// removes stale indexes, so it makes a second photographer's "GAL016" fail
// with E11000 (e.g. when a booking is Confirmed and its gallery is
// auto-created). Drop just that one index; the per-owner index above stays.
const dropLegacyGalleryIdIndex = async () => {
  try {
    const indexes = await Gallery.collection.indexes();
    if (indexes.some((ix) => ix.name === "galleryId_1")) {
      await Gallery.collection.dropIndex("galleryId_1");
      console.log("Dropped legacy galleries index galleryId_1");
    }
  } catch (err) {
    // Collection not created yet — nothing to clean up.
    if (err?.codeName !== "NamespaceNotFound") {
      console.error("Could not drop legacy galleries index:", err.message);
    }
  }
};
if (mongoose.connection.readyState === 1) dropLegacyGalleryIdIndex();
else mongoose.connection.once("open", dropLegacyGalleryIdIndex);

export default Gallery;
