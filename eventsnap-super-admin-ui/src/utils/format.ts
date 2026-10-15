const LOCALE = 'en-US';

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

type DateInput = string | number | Date;

/** e.g. "Jan 15, 2024" */
export const formatDate = (value: DateInput) => dateFormatter.format(new Date(value));

/** e.g. "Jan 15" */
export const formatMonthDay = (value: DateInput) => monthDayFormatter.format(new Date(value));

/** e.g. "Jan 2024" */
export const formatMonthYear = (value: DateInput) => monthYearFormatter.format(new Date(value));

/** e.g. "Jan 15, 09:23:41 AM" */
export const formatDateTime = (value: DateInput) => dateTimeFormatter.format(new Date(value));

/** e.g. "Alexandra Rivera" -> "AR" */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');
