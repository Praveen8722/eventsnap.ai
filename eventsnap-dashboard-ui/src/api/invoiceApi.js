import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/apiOrigin";
const API = `${API_ORIGIN}/api/invoices`;

export const createInvoice = async (data) => {
    return await api.post(`${API}/create-invoice`, data);
}

export const viewInvoices = async () => {
    return await api.get(`${API}/view-invoices`);
}

export const getInvoicesByBooking = async (bookingId) => {
    return await api.get(`${API}/booking/${bookingId}`);
}

export const updateInvoice = async (id, data) => {
    return await api.put(`${API}/${id}`, data);
}
