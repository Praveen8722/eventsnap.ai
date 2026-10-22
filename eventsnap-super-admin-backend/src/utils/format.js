const wholeRupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** 48200 -> "₹48,200", 1234567 -> "₹12,34,567" */
export const formatCurrency = amount => wholeRupees.format(Math.round(Number(amount) || 0));

/** 299 -> "+₹299", -248 -> "-₹248" */
export const formatSignedCurrency = amount => `${amount < 0 ? '-' : '+'}${formatCurrency(Math.abs(amount))}`;

/** "₹48,200" | "+₹299" | "-₹248" -> number */
export function parseCurrency(value) {
  const amount = Number(String(value).replace(/[^0-9.]/g, ''));
  return String(value).trim().startsWith('-') ? -amount : amount;
}

export const BYTES_PER_GB = 1024 ** 3;

/** 84.2 -> "84.2 GB" */
export const formatGigabytes = value => `${value} GB`;

/** "84.2 GB" -> 84.2 */
export const parseGigabytes = value => Number.parseFloat(value) || 0;

/** 1536 -> "1.5 KB", 3221225472 -> "3 GB" */
export function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Math.max(Number(bytes) || 0, 0);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${Number(value.toFixed(unit === 0 ? 0 : 1))} ${units[unit]}`;
}

/** Bytes -> gigabytes rounded to 2 decimals. */
export const bytesToGigabytes = bytes => Number(((Number(bytes) || 0) / BYTES_PER_GB).toFixed(2));

/** Date -> "3 min ago" / "2h ago" / "1d ago" */
export function formatRelativeTime(date, now = new Date()) {
  const minutes = Math.floor((now.getTime() - new Date(date).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** "3 min ago" / "2m ago" / "1h ago" / "2d ago" -> Date relative to `now` */
export function parseRelativeTime(value, now = new Date()) {
  const match = /(\d+)\s*(min|m|h|d)\b/.exec(value);
  if (!match) return now;
  const unitMs = { min: 60_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]];
  return new Date(now.getTime() - Number(match[1]) * unitMs);
}

const isValidDate = date => date instanceof Date && !Number.isNaN(date.getTime());

/** Date -> "2024-01-15"; missing or invalid dates -> "" */
export function toDateString(date) {
  if (!date) return '';
  const parsed = new Date(date);
  return isValidDate(parsed) ? parsed.toISOString().slice(0, 10) : '';
}

export function toIsoString(date) {
  if (!date) return null;
  const parsed = new Date(date);
  return isValidDate(parsed) ? parsed.toISOString() : null;
}
