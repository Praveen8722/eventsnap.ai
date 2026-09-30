import path from "path";
import Portfolio from "../models/Portfolio.js";
import { createPhotoStore } from "./photoStorage.js";

// Folder of photos uploaded before they moved to MongoDB
// ("/uploads/portfolio/<file>"); only read to migrate and clean them up.
const PORTFOLIO_UPLOAD_DIR = path.join(process.cwd(), "uploads", "portfolio");

// Portfolio photos (profile / cover / navbar photo and Gallery tab photos),
// stored in MongoDB GridFS bucket "portfolioPhotos" — see
// services/photoStorage.js. The Portfolio document keeps only the URL,
// "/api/portfolio/photos/<fileId>".
const store = createPhotoStore({
  bucketName: "portfolioPhotos",
  urlPrefix: "/api/portfolio/photos/",
  legacyPrefix: "/uploads/portfolio/",
  legacyDir: PORTFOLIO_UPLOAD_DIR,
});

export const PHOTO_FIELDS = ["profilePhoto", "coverImage", "navbarPhoto"];

export const portfolioPhotoMulterStorage = store.multerStorage;
export const streamPortfolioPhoto = store.stream;
export const isStoredPortfolioPhoto = store.isStoredUrl;
export const isOwnPortfolioPhoto = store.isOwnedBy;

// Every stored photo URL a portfolio references.
export const storedPhotoUrls = (portfolio) =>
  new Set(
    [...PHOTO_FIELDS.map((f) => portfolio[f]), ...(portfolio.gallery || []).map((g) => g.url)]
      .filter(store.isStoredUrl)
  );

// Deletes each of the user's photos in `urls` that the (already saved)
// portfolio no longer references — so no unused photo is left behind, and a
// photo still used elsewhere in the portfolio is never removed.
export const removeUnreferencedPhotos = async (urls, portfolio, userId) => {
  const stillUsed = storedPhotoUrls(portfolio);
  await Promise.all(
    [...new Set(urls)]
      .filter((url) => store.isStoredUrl(url) && !stillUsed.has(url))
      .map((url) => store.remove(url, { userId }))
  );
};

// Deletes photos stored during a request that then failed.
export const discardPhotos = (urls) => Promise.all(urls.map((url) => store.remove(url)));

// One-time, idempotent move of disk-stored portfolio photos into MongoDB,
// run at startup.
export const migrateLegacyPortfolioPhotos = async () => {
  let moved = 0;
  const legacy = { $regex: "^/uploads/portfolio/" };
  const portfolios = await Portfolio.find({
    $or: [...PHOTO_FIELDS.map((f) => ({ [f]: legacy })), { "gallery.url": legacy }],
  }).select(`user gallery ${PHOTO_FIELDS.join(" ")}`);

  // Only swaps the reference if it hasn't changed meanwhile (e.g. another
  // instance migrating too); otherwise the new copy is dropped.
  const swap = async (filter, update, newUrl) => {
    const { modifiedCount } = await Portfolio.updateOne(filter, update);
    if (modifiedCount) moved++;
    else await store.remove(newUrl);
  };

  for (const p of portfolios) {
    for (const field of PHOTO_FIELDS) {
      const oldUrl = p[field];
      const newUrl = await store.importLegacy(oldUrl, p.user);
      if (newUrl) await swap({ _id: p._id, [field]: oldUrl }, { [field]: newUrl }, newUrl);
    }
    for (const item of p.gallery) {
      const newUrl = await store.importLegacy(item.url, p.user);
      if (!newUrl) continue;
      await swap(
        { _id: p._id, gallery: { $elemMatch: { id: item.id, url: item.url } } },
        { $set: { "gallery.$.url": newUrl } },
        newUrl
      );
    }
  }
  if (moved) console.log(`Moved ${moved} portfolio photo(s) from disk into MongoDB`);
};
