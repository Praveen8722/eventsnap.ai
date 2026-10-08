import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/apiOrigin";

// Dashboard → "Create Event" (eventsnap-dashboard-backend
// routes/createEventRoutes.js). Uses the shared axios instance, so the
// signed-in photographer's JWT is attached automatically — the backend takes
// the owner from that token, never from anything sent here.
const BASE = `${API_ORIGIN}/api/create-events`;

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

// Turn a stored photo path ("/api/create-events/photos/<id>") into an
// absolute URL on the backend.
export const createEventAssetUrl = (url) => (url && url.startsWith("/") ? `${API_ORIGIN}${url}` : url || "");

// fields: { name, date, location, photoDownload, pricePerPhoto, guestAccess }
// plus an optional cover File.
export const createEvent = (fields, coverFile) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    form.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  }
  if (coverFile) form.append("cover", coverFile);
  return api.post(`${BASE}/`, form, multipart);
};

export const getMyEvents = () => api.get(`${BASE}/`);

export const getEvent = (id) => api.get(`${BASE}/${encodeURIComponent(id)}`);

export const updateEvent = (id, data) => api.put(`${BASE}/${encodeURIComponent(id)}`, data);

export const deleteEvent = (id) => api.delete(`${BASE}/${encodeURIComponent(id)}`);

// Upload or replace the cover photo.
export const uploadEventCover = (id, file) => {
  const form = new FormData();
  form.append("cover", file);
  return api.put(`${BASE}/${encodeURIComponent(id)}/cover`, form, multipart);
};

export const removeEventCover = (id) => api.delete(`${BASE}/${encodeURIComponent(id)}/cover`);

// Use one of the event's own gallery photos as its cover.
export const setEventCoverFromPhoto = (id, photoId) =>
  api.put(`${BASE}/${encodeURIComponent(id)}/cover/photo`, { photoId });

// onProgress(0–100) reports this request's upload progress.
export const uploadEventPhotos = (id, files, onProgress) => {
  const form = new FormData();
  files.forEach((file) => form.append("photos", file));
  return api.post(`${BASE}/${encodeURIComponent(id)}/photos`, form, {
    ...multipart,
    onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
  });
};

export const getEventPhotos = (id) => api.get(`${BASE}/${encodeURIComponent(id)}/photos`);

export const deleteEventPhoto = (id, photoId) =>
  api.delete(`${BASE}/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`);

export const deleteEventPhotos = (id, photoIds) =>
  api.post(`${BASE}/${encodeURIComponent(id)}/photos/delete`, { photoIds });

// ---- Public guest page (/share/<shareId>) — no login needed. The shared
// axios instance still attaches the JWT when the photographer is signed in
// on this browser, which lets the backend skip counting their own visits.

export const getPublicEvent = (shareId) => api.get(`${BASE}/public/${encodeURIComponent(shareId)}`);

// Records one guest view of the event (the backend increments guestViews).
export const recordEventView = (shareId) => api.post(`${BASE}/public/${encodeURIComponent(shareId)}/view`);

// Guest Registration: { name, phone, email } (email may be empty).
export const registerEventGuest = (shareId, details) =>
  api.post(`${BASE}/public/${encodeURIComponent(shareId)}/register`, details);

// Downloads one photo as a Blob; the backend counts it only once the file
// has been fully sent, and refuses it when downloads aren't allowed.
export const downloadEventPhoto = (shareId, photoId) =>
  api.get(`${BASE}/public/${encodeURIComponent(shareId)}/photos/${encodeURIComponent(photoId)}/download`, {
    responseType: "blob",
  });

// ---- Face Search (Guest Access → Face Search) ----

// Saves face signatures computed in the photographer's browser:
// photos = [{ id, faces: [base64, ...] }] (faces: [] for a photo with none).
export const saveFaceSignatures = (id, photos) =>
  api.put(`${BASE}/${encodeURIComponent(id)}/photos/faces`, { photos });

// Guest selfie search: descriptor = 128 numbers computed on the guest's
// device (the selfie itself is never sent). Returns this event's matches.
export const searchEventFaces = (shareId, descriptor) =>
  api.post(`${BASE}/public/${encodeURIComponent(shareId)}/face-search`, { descriptor });
