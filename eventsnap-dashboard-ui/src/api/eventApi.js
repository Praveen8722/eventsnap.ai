import api from "@/lib/api";
const API = "http://localhost:8000/api/events";

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
