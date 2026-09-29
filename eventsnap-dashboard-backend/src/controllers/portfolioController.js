import crypto from "node:crypto";
import fs from "fs";
import path from "path";
import Portfolio from "../models/Portfolio.js";
import User from "../models/User.js";
import STARTER_PORTFOLIO from "../data/starterPortfolio.js";
import { PORTFOLIO_UPLOAD_DIR } from "../middleware/uploadPortfolio.js";

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

// ================= UPDATE MY PORTFOLIO =================
export const updateMyPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.userId });
    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

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
      if (key === "social" || key === "settings") {
        const current = portfolio[key]?.toObject
          ? portfolio[key].toObject()
          : portfolio[key] || {};
        portfolio[key] = { ...current, ...req.body[key] };
      } else {
        portfolio[key] = req.body[key];
      }
    }

    await portfolio.save();
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
// Stores uploaded files on disk (same approach as Client Galleries) instead
// of embedding them as base64 in the Portfolio document, so the document
// stays small and photos are served efficiently via /uploads.
export const addPortfolioGalleryPhotos = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one photo to upload",
      });
    }

    const portfolio = await Portfolio.findOne({ user: req.userId });
    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const category = String(req.body.category || "Uploads").trim() || "Uploads";
    const newItems = files.map((f) => ({
      id: crypto.randomUUID(),
      url: `/uploads/portfolio/${f.filename}`,
      category,
      caption: f.originalname || "",
    }));

    // Newest photos first, matching how the Gallery tab has always displayed them.
    portfolio.gallery = [...newItems, ...portfolio.gallery];
    await portfolio.save();

    res.status(200).json({ success: true, portfolio });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

// ================= UPLOAD PROFILE / COVER / NAVBAR PHOTO (Edit Portfolio) =================
// Stored on disk like gallery photos, so the Portfolio document only keeps a
// short "/uploads/portfolio/x.jpg" path instead of a large base64 data URL.
const PHOTO_FIELDS = {
  profile: "profilePhoto",
  cover: "coverImage",
  navbar: "navbarPhoto",
};

// Only ever remove a file this server created for a portfolio photo.
const removePortfolioUpload = (url) => {
  if (typeof url === "string" && url.startsWith("/uploads/portfolio/")) {
    fs.promises
      .unlink(path.join(PORTFOLIO_UPLOAD_DIR, path.basename(url)))
      .catch(() => {});
  }
};

export const uploadPortfolioPhoto = async (req, res) => {
  const field = PHOTO_FIELDS[req.params.kind];
  try {
    if (!field) {
      if (req.file) removePortfolioUpload(`/uploads/portfolio/${req.file.filename}`);
      return res.status(400).json({ success: false, message: "Unknown photo type" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please select a photo to upload" });
    }

    const portfolio = await Portfolio.findOne({ user: req.userId });
    if (!portfolio) {
      removePortfolioUpload(`/uploads/portfolio/${req.file.filename}`);
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const previous = portfolio[field];
    const url = `/uploads/portfolio/${req.file.filename}`;
    portfolio[field] = url;
    await portfolio.save();
    // The replaced photo is no longer referenced by this field.
    if (previous !== url) removePortfolioUpload(previous);

    res.status(200).json({ success: true, url, portfolio });
  } catch (error) {
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

    // Only ever remove a file this endpoint actually created — seeded/legacy
    // gallery entries (an Unsplash id, a base64 data URL) have nothing on disk.
    if (photo.url && photo.url.startsWith("/uploads/portfolio/")) {
      const filename = path.basename(photo.url);
      fs.promises
        .unlink(path.join(PORTFOLIO_UPLOAD_DIR, filename))
        .catch(() => {});
    }

    res.status(200).json({ success: true, portfolio });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
  }
};
