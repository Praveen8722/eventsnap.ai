import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/apiOrigin";
const API = `${API_ORIGIN}/api/inquiries`;

// Public — the Portfolio "Contact" / "Send Inquiry" form (no auth).
export const submitInquiry = async (slug, data) => {
    return await api.post(`${API}/public/${encodeURIComponent(slug)}`, data);
}

// Logged-in photographer's own inquiries (Notifications feed).
export const viewInquiries = async () => {
    return await api.get(`${API}/`);
}
