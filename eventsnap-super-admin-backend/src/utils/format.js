const wholeDollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const exactDollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/** 48200 -> "$48,200" */
export const formatCurrency = amount => wholeDollars.format(amount);

/** 299 -> "+$299.00", -248 -> "-$248.00" */
export const formatSignedCurrency = amount => `${amount < 0 ? '-' : '+'}${exactDollars.format(Math.abs(amount))}`;

/** "$48,200" | "+$299.00" | "-$248.00" -> number */
export function parseCurrency(value) {
  const amount = Number(String(value).replace(/[^0-9.]/g, ''));
  return String(value).trim().startsWith('-') ? -amount : amount;
}

/** 84.2 -> "84.2 GB" */
export const formatGigabytes = value => `${value} GB`;

/** "84.2 GB" -> 84.2 */
export const parseGigabytes = value => Number.parseFloat(value) || 0;

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

/** Date -> "2024-01-15" */
export const toDateString = date => new Date(date).toISOString().slice(0, 10);

export const toIsoString = date => (date ? new Date(date).toISOString() : null);
