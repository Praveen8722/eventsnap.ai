import crypto from "node:crypto";
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";
import STARTER_PORTFOLIO from "../data/starterPortfolio.js";
import {
  PHOTO_FIELDS as STORED_PHOTO_FIELDS,
  isStoredPortfolioPhoto,
  isOwnPortfolioPhoto,
  storedPhotoUrls,
  removeUnreferencedPhotos,
  discardPhotos,
} from "../services/portfolioPhotoStorage.js";

// Fields a photographer may change through Edit Portfolio / the section pages.
const EDITABLE_FIELDS = [
  "name",
  "theme",
  "accent",
  "tagline",
  "bio",
  "about",
  "experience",
  "profilePhoto",
  "coverImage",
  "navbarPhoto",
  // Pinned QR URL — set once / on explicit regenerate (see Portfolio model).
  "qrUrl",
  "location",
  "serviceArea",
  "phone",
  "email",
  "social",
  "services",
  "gallery",
  "pricing",
  "testimonials",
  "faqs",
  "settings",
];

const toSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

// A slug that isn't already used by another portfolio.
const uniqueSlug = async (base, ignoreId = null) => {
  const root = toSlug(base) || "portfolio";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const clash = await Portfolio.findOne({
      slug: candidate,
      ...(ignoreId ? { _id: { $ne: ignoreId } } : {}),
    }).select("_id");
    if (!clash) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
};

// ================= GET (or create) MY PORTFOLIO =================
export const getMyPortfolio = async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({ user: req.userId });

    if (!portfolio) {
      const user = await User.findById(req.userId).select(
        "name businessName email phone location"
      );
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const slug = await uniqueSlug(
        user.businessName || user.name || "portfolio"
      );

      try {
        // First-time creation only — seed with neutral starter content so the
        // photographer sees how each section should look. Identity fields come
        // from their own account and always win over the template.
        portfolio = await Portfolio.create({
          ...STARTER_PORTFOLIO,
          user: req.userId,
          slug,
          name: user.businessName || user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          location: user.location || "",
        });
      } catch (err) {
        // Another concurrent request created it first — never duplicate.
        if (err.code === 11000) {
          portfolio = await Portfolio.findOne({ user: req.userId });
        } else {
          throw err;
        }
      }
    }

    res.status(200).json({ success: true, portfolio });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

// Server-stored Gallery tab photos are added and removed only through their
// own endpoints (POST /me/gallery, DELETE /me/gallery/:photoId). A portfolio
// save may reorder them or change their category/caption, but can't drop or
// invent one — so a stale save from the page can never lose (and delete) a
// photo that was just uploaded, or point at one that was deleted.
const mergeGallery = (current, incoming) => {
  const serverItems = current
    .filter((g) => isStoredPortfolioPhoto(g.url))
    .map((g) => (g.toObject ? g.toObject() : g));
  const serverUrls = new Set(serverItems.map((g) => g.url));
  const kept = incoming.filter(
    (g) => !isStoredPortfolioPhoto(g?.url) || serverUrls.has(g.url)
  );
  const keptUrls = new Set(kept.map((g) => g?.url));
  return [...serverItems.filter((g) => !keptUrls.has(g.url)), ...kept];
};

// ================= UPDATE MY PORTFOLIO =================
export const updateMyPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.userId });
    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found" });
    }
    const photosBefore = [...storedPhotoUrls(portfolio)];

    // Slug is handled separately so uniqueness can be enforced.
    if (req.body.slug !== undefined) {
      const next = toSlug(req.body.slug);
      if (next && next !== portfolio.slug) {
        const taken = await Portfolio.findOne({
          slug: next,
          _id: { $ne: portfolio._id },
        }).select("_id");
        if (taken) {
          return res
            .status(400)
            .json({ message: "That portfolio URL is already taken" });
        }
        portfolio.slug = next;
      }
    }

    for (const key of EDITABLE_FIELDS) {
      if (req.body[key] === undefined) continue;
      if (STORED_PHOTO_FIELDS.includes(key)) {
        // A stored photo can only be set if it's this user's own, existing
        // one — e.g. a stale save must not bring back a deleted photo.
        const next = req.body[key];
        if (
          next !== portfolio[key] &&
          isStoredPortfolioPhoto(next) &&
          !(await isOwnPortfolioPhoto(next, req.userId))
        ) {
          continue;
        }
        portfolio[key] = next;
      } else if (key === "gallery" && Array.isArray(req.body.gallery)) {
        portfolio.gallery = mergeGallery(portfolio.gallery, req.body.gallery);
      } else if (key === "social" || key === "settings") {
        const current = portfolio[key]?.toObject
          ? portfolio[key].toObject()
          : portfolio[key] || {};
        portfolio[key] = { ...current, ...req.body[key] };
      } else {
        portfolio[key] = req.body[key];
      }
    }

    await portfolio.save();
    // A photo replaced or cleared by this save (e.g. a preset chosen instead
    // of an uploaded photo) is deleted from storage.
    await removeUnreferencedPhotos(photosBefore, portfolio, req.userId);
    res.status(200).json({ success: true, portfolio });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "That portfolio URL is already taken" });
    }
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

// ================= GET PUBLIC PORTFOLIO BY SLUG =================
export const getPublicPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      slug: req.params.slug,
    }).select("-user -__v");
    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found" });
    }
    res.status(200).json({ success: true, portfolio });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

// ================= ADD GALLERY PHOTOS (Portfolio → Gallery tab) =================
// The files are already stored in MongoDB GridFS (middleware/uploadPortfolio.js)
// instead of being embedded as base64 in the Portfolio document, so the
// document stays small and only keeps each photo's
// "/api/portfolio/photos/<id>" url.
export const addPortfolioGalleryPhotos = async (req, res) => {
  const files = req.files || [];
  const urls = files.map((f) => f.url);
  try {
    if (!files.length) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one photo to upload",
      });
    }

    const portfolio = await Portfolio.findOne({ user: req.userId });
    if (!portfolio) {
      await discardPhotos(urls);
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const category = String(req.body.category || "Uploads").trim() || "Uploads";
    const newItems = files.map((f) => ({
      id: crypto.randomUUID(),
      url: f.url,
      category,
      caption: f.originalname || "",
    }));

    // Newest photos first, matching how the Gallery tab has always displayed them.
    portfolio.gallery = [...newItems, ...portfolio.gallery];
    await portfolio.save();

    res.status(200).json({ success: true, portfolio });
  } catch (error) {
    await discardPhotos(urls);
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

// ================= UPLOAD PROFILE / COVER / NAVBAR PHOTO (Edit Portfolio) =================
// Stored in MongoDB GridFS like gallery photos, so the Portfolio document only
// keeps a short "/api/portfolio/photos/<id>" url instead of a large base64
// data URL.
const PHOTO_FIELDS = {
  profile: "profilePhoto",
  cover: "coverImage",
  navbar: "navbarPhoto",
};

export const uploadPortfolioPhoto = async (req, res) => {
  const field = PHOTO_FIELDS[req.params.kind];
  const url = req.file?.url;
  try {
    if (!field) {
      if (url) await discardPhotos([url]);
      return res.status(400).json({ success: false, message: "Unknown photo type" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please select a photo to upload" });
    }

    const portfolio = await Portfolio.findOne({ user: req.userId });
    if (!portfolio) {
      await discardPhotos([url]);
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const previous = portfolio[field];
    portfolio[field] = url;
    await portfolio.save();
    // The replaced photo is deleted from storage (unless still used elsewhere
    // in the portfolio).
    await removeUnreferencedPhotos([previous], portfolio, req.userId);

    res.status(200).json({ success: true, url, portfolio });
  } catch (error) {
    if (url) await discardPhotos([url]);
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

// ================= DELETE A GALLERY PHOTO (Portfolio → Gallery tab) =================
export const deletePortfolioGalleryPhoto = async (req, res) => {
  try {
    const { photoId } = req.params;
    const portfolio = await Portfolio.findOne({ user: req.userId });
    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const photo = portfolio.gallery.find((g) => g.id === photoId);
    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    portfolio.gallery = portfolio.gallery.filter((g) => g.id !== photoId);
    await portfolio.save();

    // Delete the stored photo too. Seeded/legacy gallery entries (an Unsplash
    // id, a base64 data URL) have nothing stored, so they're skipped.
    await removeUnreferencedPhotos([photo.url], portfolio, req.userId);

    res.status(200).json({ success: true, portfolio });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
  }
};
