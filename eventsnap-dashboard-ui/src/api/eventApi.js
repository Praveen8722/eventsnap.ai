import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/apiOrigin";
const API = `${API_ORIGIN}/api/events`;

export const createEvent = async (data) => {
    return await api.post(`${API}/`, data);
}

export const getEvents = async () => {
    return await api.get(`${API}/`);
}

export const updateEvent = async (id, data) => {
    return await api.put(`${API}/${id}`, data);
}

export const deleteEvent = async (id) => {
    return await api.delete(`${API}/${id}`);
}
