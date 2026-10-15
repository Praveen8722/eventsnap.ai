import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/apiOrigin";

// Create Event → Direct Camera Auto Upload (backend routes/directCameraRoutes.js).
// Owner only; the shared axios instance attaches the photographer's JWT.
// The camera password is only ever returned by enable (first time) and
// regenerate — it can't be read back later.
const BASE = `${API_ORIGIN}/api/direct-camera`;
const url = (eventId, suffix = "") => `${BASE}/${encodeURIComponent(eventId)}${suffix}`;

export const getDirectCamera = (eventId) => api.get(url(eventId));
export const enableDirectCamera = (eventId) => api.post(url(eventId, "/enable"));
export const disableDirectCamera = (eventId) => api.post(url(eventId, "/disable"));
export const regenerateDirectCameraPassword = (eventId) => api.post(url(eventId, "/credentials"));
