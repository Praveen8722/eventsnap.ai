import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/apiOrigin";

// Create Event → People (backend routes/faceGroupingRoutes.js): photos grouped
// by person on the server (free local library). Owner only (the shared axios instance
// attaches the photographer's JWT).
const BASE = `${API_ORIGIN}/api/face-groups`;
const url = (eventId, suffix = "") => `${BASE}/${encodeURIComponent(eventId)}${suffix}`;

export const getFaceGroups = (eventId) => api.get(url(eventId));
export const getPersonPhotos = (eventId, personId) => api.get(url(eventId, `/people/${encodeURIComponent(personId)}`));
export const enableFaceGroups = (eventId) => api.post(url(eventId, "/enable"));
export const disableFaceGroups = (eventId) => api.post(url(eventId, "/disable"));
export const retryFaceGroups = (eventId) => api.post(url(eventId, "/retry"));
