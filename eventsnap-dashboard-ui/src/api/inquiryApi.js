import api from "@/lib/api";
const API = "http://localhost:8000/api/inquiries";

// Public — the Portfolio "Contact" / "Send Inquiry" form (no auth).
export const submitInquiry = async (slug, data) => {
    return await api.post(`${API}/public/${encodeURIComponent(slug)}`, data);
}

// Logged-in photographer's own inquiries (Notifications feed).
export const viewInquiries = async () => {
    return await api.get(`${API}/`);
}
