import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/apiOrigin";

const API = `${API_ORIGIN}/api/bookings`;

// Logged-in photographer's own Dashboard "+ New Booking" — real session, JWT
// auto-attached by the shared axios instance. For the public Portfolio
// "Book Now" form, pass { portfolioSlug } in data instead so the backend
// resolves the owning photographer from the portfolio slug (no login, and
// never a client-sent owner id — see bookingController.createBooking).
export const createBooking = async (data) => {
  return await api.post(`${API}/create-booking`, data);
};

// Logged-in photographer's own bookings only.
export const viewBookings = async () => {
  return await api.get(`${API}/view-bookings`);
};

export const getBooking = async (bookingId) => {
  return await api.get(`${API}/${encodeURIComponent(bookingId)}`);
};

// Partial update — only the fields present in `data` are changed. Used for
// both the full Edit form and a quick status-only change.
export const updateBooking = async (bookingId, data) => {
  return await api.put(`${API}/${encodeURIComponent(bookingId)}`, data);
};

// Deletes one of the logged-in photographer's own bookings.
export const deleteBooking = async (bookingId) => {
  return await api.delete(`${API}/${encodeURIComponent(bookingId)}`);
};

// Bulk delete — only the logged-in photographer's own bookings are removed.
export const deleteBookings = async (bookingIds) => {
  return await api.post(`${API}/delete-bookings`, { bookingIds });
};

// Emails a payment reminder to the customer for one of the logged-in
// photographer's own bookings. The recipient is resolved server-side from the
// stored booking record — only the optional message body is sent from here.
export const sendPaymentReminder = async (bookingId, data = {}) => {
  return await api.post(
    `${API}/${encodeURIComponent(bookingId)}/send-reminder`,
    data
  );
};
