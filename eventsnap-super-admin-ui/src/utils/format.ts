const LOCALE = 'en-IN';

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' });
const monthDayFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric' });
const monthYearFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'short', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const rupees = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const count = new Intl.NumberFormat(LOCALE);

type DateInput = string | number | Date | null | undefined;

/** Formats a date, or returns "—" when it is missing or invalid. */
function formatWith(formatter: Intl.DateTimeFormat, value: DateInput) {
  if (value === null || value === undefined || value === '') return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : formatter.format(date);
}

/** e.g. "15 Jan 2024" */
export const formatDate = (value: DateInput) => formatWith(dateFormatter, value);

/** e.g. "15 Jan" */
export const formatMonthDay = (value: DateInput) => formatWith(monthDayFormatter, value);

/** e.g. "Jan 2024" */
export const formatMonthYear = (value: DateInput) => formatWith(monthYearFormatter, value);

/** e.g. "15 Jan, 09:23:41 am" */
export const formatDateTime = (value: DateInput) => formatWith(dateTimeFormatter, value);

/** 1234567 -> "₹12,34,567" */
export const formatInr = (amount: number) => rupees.format(Math.round(amount || 0));

/** 1234567 -> "₹12.3L", 25000000 -> "₹2.5Cr", 48200 -> "₹48.2K" */
export function formatInrCompact(amount: number) {
  const value = Math.abs(amount || 0);
  const sign = amount < 0 ? '-' : '';
  const trim = (n: number) => String(Number(n.toFixed(1)));
  if (value >= 1e7) return `${sign}₹${trim(value / 1e7)}Cr`;
  if (value >= 1e5) return `${sign}₹${trim(value / 1e5)}L`;
  if (value >= 1e3) return `${sign}₹${trim(value / 1e3)}K`;
  return `${sign}₹${Math.round(value)}`;
}

/** 12345 -> "12,345" */
export const formatCount = (value: number) => count.format(value || 0);

/** "₹1,00,000" / "+₹299" / "-₹248" -> 100000 / 299 / -248 */
export function parseAmount(value: string) {
  const amount = Number(value.replace(/[^0-9.]/g, '')) || 0;
  return value.trim().startsWith('-') ? -amount : amount;
}

/** 1536 -> "1.5 KB", 3221225472 -> "3 GB" */
export function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Math.max(bytes || 0, 0);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${Number(value.toFixed(unit === 0 ? 0 : 1))} ${units[unit]}`;
}

/** e.g. "+7.8% vs last month", or a fallback when there's nothing to compare with. */
export function formatChange(percent: number | null, fallback = 'No data last month') {
  if (percent === null) return fallback;
  return `${percent >= 0 ? '+' : ''}${percent}% vs last month`;
}

/** e.g. "Alexandra Rivera" -> "AR" */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');
