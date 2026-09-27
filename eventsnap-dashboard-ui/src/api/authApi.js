import api from "@/lib/api";

const API_ORIGIN = "http://localhost:8000";
const API = `${API_ORIGIN}/api/auth`;

export const signup = async (data) => {
  return await api.post(`${API}/signup`, data);
};

export const login = async (data) => {
  return await api.post(`${API}/login`, data);
};

// Resolves the signed-in photographer's id from the current token — login
// and signup responses carry only { message, token }, not a user object.
export const getDashboard = async () => {
  return await api.get(`${API}/dashboard`);
};

export const editProfile = async (data) => {
  return await api.put(`${API}/edit-profile`, data);
};

export const changePassword = async (data) => {
  return await api.put(`${API}/change-password`, data);
};
