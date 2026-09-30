import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/apiOrigin";

// Reuses the shared axios instance (JWT auto-attached). Absolute URLs override
// its /api/auth baseURL.
const BASE = `${API_ORIGIN}/api/portfolio`;

// Logged-in photographer's portfolio (created on first access if missing).
export const getMyPortfolio = () => api.get(`${BASE}/me`);

export const updateMyPortfolio = (data) => api.put(`${BASE}/me`, data);

// Public portfolio by its share slug — no auth required.
export const getPublicPortfolio = (slug) =>
  api.get(`${BASE}/public/${encodeURIComponent(slug)}`);

// Upload one or more photos to the Portfolio → Gallery tab. Files are stored
// on the server (in MongoDB) — the response carries the full, updated
// portfolio.
export const addPortfolioGalleryPhotos = (formData) =>
  api.post(`${BASE}/me/gallery`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Upload the profile ("profile") or cover ("cover") photo. Stored on the
// server; the response carries its saved "/api/portfolio/photos/<id>" url.
export const uploadPortfolioPhoto = (kind, file) => {
  const formData = new FormData();
  formData.append("photo", file);
  return api.post(`${BASE}/me/photo/${encodeURIComponent(kind)}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Delete one Portfolio → Gallery tab photo by its item id.
export const deletePortfolioGalleryPhoto = (photoId) =>
  api.delete(`${BASE}/me/gallery/${encodeURIComponent(photoId)}`);

// Turn a stored portfolio photo path ("/api/portfolio/photos/<id>", or a
// legacy "/uploads/portfolio/x.jpg") into an absolute URL on the backend. A
// seeded Unsplash id or a full/data URL is left untouched.
export const portfolioAssetUrl = (url) =>
  url && url.startsWith("/") ? `${API_ORIGIN}${url}` : url;
