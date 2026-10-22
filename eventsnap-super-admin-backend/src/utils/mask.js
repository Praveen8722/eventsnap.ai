/**
 * Masks client contact details from the platform before they leave the admin API. Clients are
 * the photographers' customers, so admins see who booked but never their full email or phone.
 */

/** "rahul.k@gmail.com" -> "r***@gmail.com" */
export function maskEmail(value) {
  const email = String(value ?? '').trim();
  const at = email.lastIndexOf('@');
  if (at < 1) return email ? '***' : '';
  return `${email[0]}***${email.slice(at)}`;
}

/** "+91 98765 43210" -> "98****3210" */
export function maskPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(-10);
  if (!digits) return '';
  if (digits.length <= 6) return `${'*'.repeat(Math.max(digits.length - 2, 1))}${digits.slice(-2)}`;
  return `${digits.slice(0, 2)}${'*'.repeat(digits.length - 6)}${digits.slice(-4)}`;
}
