import api from "@/lib/api";

export const API_ORIGIN = "http://localhost:8000";
const API = `${API_ORIGIN}/api/galleries`;

// Turn a stored photo path ("/uploads/galleries/x.jpg") into an absolute URL.
export const galleryAssetUrl = (url) =>
  url ? (url.startsWith("http") ? url : `${API_ORIGIN}${url}`) : "";

export const createGallery = async (formData) => {
  return await api.post(`${API}/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Pass { bookingId } to fetch only the gallery for one booking.
export const getGalleries = async (params) => {
  return await api.get(`${API}/`, params ? { params } : undefined);
};

export const getSharedGallery = async (slug) => {
  return await api.get(`${API}/share/${slug}`);
};

export const updateGallery = async (id, data) => {
  return await api.put(`${API}/${id}`, data);
};

// Append photos to an existing gallery (id = _id or galleryId).
export const addGalleryPhotos = async (id, formData) => {
  return await api.post(`${API}/${id}/photos`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Delete one photo from a gallery (also removes the file from storage).
export const deleteGalleryPhoto = async (id, photoId) => {
  return await api.delete(`${API}/${id}/photos/${photoId}`);
};

// Delete several selected photos at once (also removes the files from storage).
export const deleteGalleryPhotos = async (id, photoIds) => {
  return await api.post(`${API}/${id}/photos/delete`, { photoIds });
};

export const trackGalleryDownload = async (id) => {
  return await api.patch(`${API}/${id}/download`);
};

export const deleteGallery = async (id) => {
  return await api.delete(`${API}/${id}`);
};
