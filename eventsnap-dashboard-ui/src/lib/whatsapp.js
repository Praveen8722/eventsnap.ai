// Free click-to-chat links (https://wa.me/<number>?text=...). No WhatsApp
// API or package — the link just opens WhatsApp / WhatsApp Web.

// Phone numbers are stored free-form ("+91 98765 43210", "09876543210",
// "9876543210"). wa.me needs the full international number as digits only,
// so bare 10-digit (or 0-prefixed) numbers are assumed to be Indian (+91).
export const toWhatsAppNumber = (phone, defaultCountryCode = "91") => {
  if (!phone) return "";
  const raw = String(phone).trim();
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (raw.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) return defaultCountryCode + digits;
  return digits;
};

// Returns "" when there's no usable number, so callers can hide the button.
export const whatsAppLink = (phone, message = "") => {
  const number = toWhatsAppNumber(phone);
  if (number.length < 8) return "";
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
};
