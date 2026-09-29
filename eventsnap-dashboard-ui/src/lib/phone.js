// Phone validation shared by the public Portfolio Contact / Send Inquiry form,
// the New Booking form and their APIs. Mirrored in
// eventsnap-dashboard-ui/src/lib/phone.js and
// eventsnap-dashboard-backend/src/utils/phone.js — keep the two identical.
//
// Indian mobile numbers only: exactly 10 digits, starting with 6, 7, 8 or 9.
// No "+91"/country code, spaces, brackets, dashes or any other characters.
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export const isValidPhoneNumber = (value) =>
  typeof value === "string" && INDIAN_MOBILE.test(value);
