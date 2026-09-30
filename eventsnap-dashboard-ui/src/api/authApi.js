import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/apiOrigin";

const API = `${API_ORIGIN}/api/auth`;

export const signup = async (data) => {
  return await api.post(`${API}/signup`, data);
};

export const login = async (data) => {
  return await api.post(`${API}/login`, data);
};

// Forgot Password: { email, newPassword, confirmPassword }. Resets the
// account's password if the email exists — no OTP or reset link. The user
// then signs in through the normal login flow.
export const forgotPassword = async (data) => {
  return await api.post(`${API}/forgot-password`, data);
};

// Resolves the signed-in photographer's id from the current token — login
// and signup responses carry only { message, token }, not a user object.
export const getDashboard = async () => {
  return await api.get(`${API}/dashboard`);
};

// Permanently delete notifications for the signed-in user. Notifications are
// derived (no rows), so this records the ids as dismissed server-side; the
// built feed filters them out. Returns the updated dismissed id list.
export const dismissNotifications = async (ids) => {
  return await api.post(`${API}/notifications/dismiss`, { ids });
};

export const editProfile = async (data) => {
  return await api.put(`${API}/edit-profile`, data);
};

// Signed-in user's own profile / business photo — the backend stores the
// file and saves its URL on the user's record; the owner comes from the JWT.
const uploadAccountPhoto = (path) => async (file) => {
  const formData = new FormData();
  formData.append("photo", file);
  return await api.put(`${API}/${path}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const uploadProfilePhoto = uploadAccountPhoto("profile-photo");
export const deleteProfilePhoto = async () => {
  return await api.delete(`${API}/profile-photo`);
};

export const uploadBusinessPhoto = uploadAccountPhoto("business-photo");
export const deleteBusinessPhoto = async () => {
  return await api.delete(`${API}/business-photo`);
};

// Stored photo path ("/api/auth/photos/<id>", or a legacy
// "/uploads/profile/x.jpg") -> absolute URL on the backend.
export const profilePhotoUrl = (photo) =>
  photo ? (photo.startsWith("/") ? `${API_ORIGIN}${photo}` : photo) : "";

export const changePassword = async (data) => {
  return await api.put(`${API}/change-password`, data);
};
