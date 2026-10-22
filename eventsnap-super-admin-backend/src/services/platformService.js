import { env } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';
import {
  BYTES_PER_GB,
  bytesToGigabytes,
  formatBytes,
  formatCurrency,
  formatRelativeTime,
  formatSignedCurrency,
  toDateString,
} from '../utils/format.js';
import { maskEmail, maskPhone } from '../utils/mask.js';
import { storageStatus } from './mappers.js';
import { ACTIVE_WINDOW_DAYS, loadPlatform, monthKey, monthLabel, recentMonthKeys } from './platformData.js';

/**
 * The admin pages' platform figures, computed live from the EventSnap platform database.
 *
 * - Money is what photographers recorded from their own clients (advance + later payments) —
 *   "booking volume", not EventSnap income. EventSnap has no billing yet, so its income is 0.
 * - Every photographer is on the single Free plan (3 GB, PLATFORM_STORAGE_QUOTA_GB).
 * - Client emails and phone numbers are masked.
 */

const DAY_MS = 86_400_000;
const TOP_PHOTOGRAPHER_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 6;
const RECENT_SUBSCRIBER_LIMIT = 10;
const TOP_EVENT_TYPES = 7;
const TOP_LOCATIONS = 8;

export const FREE_PLAN = Object.freeze({ id: 'free', name: 'Free', color: '#6C63FF', bg: '#F0EEFF' });
export const NO_BILLING_MESSAGE = 'Billing is not set up yet. Every photographer is on the Free plan.';

const CHART_COLORS = ['#6C63FF', '#FF675D', '#10B981', '#F59E0B', '#8B5CF6', '#0EA5E9', '#EC4899', '#8080A0'];

const BOOKING_STATUS = {
  Inquiry: 'inquiry',
  Confirmed: 'confirmed',
  'In Progress': 'in-progress',
  Editing: 'in-progress',
  'Ready for Delivery': 'in-progress',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
};

const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const percentChange = (current, previous) => (previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null);
const sum = (items, pick) => items.reduce((total, item) => total + pick(item), 0);
const quotaBytes = () => env.platformStorageQuotaGB * BYTES_PER_GB;

/** Each payment a photographer recorded on a booking: the advance (dated when the booking was made) and later payments. */
function bookingPayments(booking) {
  const entries = [];
  if (booking.advance > 0) entries.push({ amount: booking.advance, date: booking.createdAt, kind: 'advance', index: 0 });
  booking.payments.forEach((payment, index) => {
    if (payment.amount > 0) entries.push({ amount: payment.amount, date: payment.date ?? booking.createdAt, kind: 'payment', index: index + 1 });
  });
  return entries;
}

const allPayments = platform => platform.bookings.flatMap(booking => bookingPayments(booking).map(payment => ({ ...payment, booking })));

function monthlySeries(platform, keys) {
  const volume = new Map(keys.map(key => [key, 0]));
  const count = new Map(keys.map(key => [key, 0]));
  for (const payment of allPayments(platform)) {
    if (!payment.date) continue;
    const key = monthKey(payment.date);
    if (volume.has(key)) volume.set(key, volume.get(key) + payment.amount);
  }
  for (const booking of platform.bookings) {
    if (!booking.createdAt) continue;
    const key = monthKey(booking.createdAt);
    if (count.has(key)) count.set(key, count.get(key) + 1);
  }
  return { volume, count };
}

const inMonth = (date, key) => Boolean(date) && monthKey(date) === key;

// --- mapping -----------------------------------------------------------------------------------

const toPhotographer = p => ({
  id: p.id,
  name: p.name,
  ownerName: p.ownerName,
  email: p.email,
  phone: p.phone,
  location: p.portfolio?.location ?? '',
  joinDate: toDateString(p.joinedAt),
  plan: FREE_PLAN.name,
  status: p.active ? 'active' : 'inactive',
  lastActive: toDateString(p.lastActive),
  bookings: p.bookings.length,
  revenue: formatCurrency(p.collected),
  rating: p.portfolio?.rating ?? 0,
  storage: formatBytes(p.usedBytes),
  specialty: p.portfolio?.specialty ?? '',
  events: p.events.length,
  clients: p.clients.size,
  portfolioSlug: p.portfolio?.slug ?? '',
  portfolioPublished: p.portfolio?.published ?? false,
});

const toTopPhotographer = p => ({
  id: p.id,
  name: p.name,
  location: p.portfolio?.location ?? '',
  bookings: p.bookings.length,
  revenue: formatCurrency(p.collected),
  status: p.active ? 'active' : 'inactive',
  plan: FREE_PLAN.name,
});

const toClient = c => ({
  id: c.id,
  name: c.name,
  email: maskEmail(c.email),
  phone: maskPhone(c.phone),
  location: c.location,
  photographer: c.photographer,
  bookings: c.bookings,
  totalSpent: formatCurrency(c.totalSpent),
  lastBooking: toDateString(c.lastBooking),
  status: c.active ? 'active' : 'inactive',
  joinDate: toDateString(c.firstBooking),
});

const toBooking = b => ({
  id: b.id,
  reference: b.ref || '—',
  client: b.clientName,
  clientEmail: maskEmail(b.email),
  clientPhone: maskPhone(b.phone),
  photographer: b.photographer,
  eventType: b.eventType,
  eventDate: toDateString(b.eventDate),
  package: b.packageName,
  amount: formatCurrency(b.price),
  paid: formatCurrency(b.collected),
  balance: formatCurrency(b.balance),
  status: BOOKING_STATUS[b.status] ?? 'inquiry',
  stage: b.status,
  source: b.source,
  location: b.location,
  days: b.days.map(day => ({ name: day.name, date: toDateString(day.date), location: day.location })),
  createdAt: toDateString(b.createdAt),
});

// --- pages -------------------------------------------------------------------------------------

export async function getDashboardData() {
  const platform = await loadPlatform();
  const { now, photographers, bookings } = platform;
  const keys = recentMonthKeys(now);
  const [thisMonth, lastMonth] = [keys.at(-1), keys.at(-2)];
  const { volume, count } = monthlySeries(platform, keys);
  const events = photographers.flatMap(p => p.events);

  const stats = {
    photographers: { total: photographers.length, newThisMonth: photographers.filter(p => inMonth(p.joinedAt, thisMonth)).length },
    activePhotographers: { value: photographers.filter(p => p.active).length, total: photographers.length, windowDays: ACTIVE_WINDOW_DAYS },
    bookings: { total: bookings.length, newThisMonth: count.get(thisMonth) },
    bookingVolume: {
      thisMonth: volume.get(thisMonth),
      lastMonth: volume.get(lastMonth),
      changePercent: percentChange(volume.get(thisMonth), volume.get(lastMonth)),
      total: sum(allPayments(platform), p => p.amount),
    },
    events: { total: events.length, newThisMonth: events.filter(e => inMonth(e.createdAt, thisMonth)).length },
    outstanding: { amount: sum(bookings, b => b.balance), bookings: bookings.filter(b => b.balance > 0).length },
  };

  const top = photographers
    .filter(p => p.bookings.length > 0)
    .sort((a, b) => b.collected - a.collected || b.bookings.length - a.bookings.length || a.name.localeCompare(b.name))
    .slice(0, TOP_PHOTOGRAPHER_LIMIT);

  return {
    stats,
    revenueData: keys.map(key => ({ month: monthLabel(key), revenue: volume.get(key), bookings: count.get(key) })),
    subscriptionData: [{ name: FREE_PLAN.name, value: photographers.length, color: FREE_PLAN.color }],
    topPhotographers: top.map(toTopPhotographer),
    recentActivity: recentActivity(platform),
  };
}

function recentActivity({ now, photographers, bookings }) {
  const items = [];
  for (const p of photographers) {
    if (p.joinedAt) items.push({ at: p.joinedAt, type: 'signup', status: 'success', message: `New photographer joined: ${p.name}` });
    for (const event of p.events) {
      if (event.createdAt) items.push({ at: event.createdAt, type: 'event', status: 'info', message: `${p.name} created the event gallery “${event.name}”` });
    }
  }
  for (const b of bookings) {
    if (b.createdAt) {
      const via = b.source === 'portfolio' ? ' from their portfolio' : '';
      items.push({ at: b.createdAt, type: 'booking', status: 'info', message: `${b.photographer} received a new ${b.eventType} booking${via}` });
    }
    const last = b.statusHistory.at(-1);
    if (b.statusHistory.length > 1 && last && (last.status === 'Delivered' || last.status === 'Cancelled')) {
      items.push({
        at: last.date,
        type: last.status === 'Delivered' ? 'delivery' : 'cancellation',
        status: last.status === 'Delivered' ? 'success' : 'warning',
        message: `${b.photographer} marked booking${b.ref ? ` ${b.ref}` : ''} as ${last.status.toLowerCase()}`,
      });
    }
  }
  return items
    .filter(item => item.at <= now)
    .sort((a, b) => b.at - a.at)
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map(({ at, ...item }) => ({ ...item, time: formatRelativeTime(at, now) }));
}

const byName = (a, b) => a.name.localeCompare(b.name);

export async function listPhotographers() {
  const { photographers } = await loadPlatform();
  return [...photographers].sort((a, b) => (b.joinedAt ?? 0) - (a.joinedAt ?? 0) || byName(a, b)).map(toPhotographer);
}

export async function listClients() {
  const { clients } = await loadPlatform();
  return [...clients].sort((a, b) => (b.lastBooking ?? 0) - (a.lastBooking ?? 0) || byName(a, b)).map(toClient);
}

export async function listBookings() {
  const { bookings } = await loadPlatform();
  return [...bookings].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).map(toBooking);
}

export async function getPaymentsData() {
  const platform = await loadPlatform();
  const { now, bookings } = platform;
  const keys = recentMonthKeys(now);
  const [thisMonth, lastMonth] = [keys.at(-1), keys.at(-2)];
  const { volume } = monthlySeries(platform, keys);
  const payments = allPayments(platform);

  const recorded = payments.map(({ amount, date, kind, index, booking }) => ({
    id: `${booking.id}-${index}`,
    reference: booking.ref || '—',
    photographer: booking.photographer,
    client: booking.clientName,
    type: kind,
    amount: formatSignedCurrency(amount),
    method: 'Recorded by photographer',
    status: 'completed',
    date: toDateString(date),
    description: `${kind === 'advance' ? 'Advance' : 'Payment'} · ${booking.eventType}${booking.ref ? ` (${booking.ref})` : ''}`,
    sortAt: date ?? new Date(0),
  }));
  const outstanding = bookings
    .filter(b => b.balance > 0)
    .map(b => ({
      id: `${b.id}-balance`,
      reference: b.ref || '—',
      photographer: b.photographer,
      client: b.clientName,
      type: 'balance',
      amount: formatSignedCurrency(b.balance),
      method: '—',
      status: 'pending',
      date: toDateString(b.eventDate ?? b.createdAt),
      description: `Balance due · ${b.eventType}${b.ref ? ` (${b.ref})` : ''}`,
      sortAt: b.eventDate ?? b.createdAt ?? new Date(0),
    }));

  const transactions = [...recorded, ...outstanding]
    .sort((a, b) => b.sortAt - a.sortAt)
    .map(({ sortAt: _sortAt, ...transaction }) => transaction);

  return {
    summary: {
      platformIncome: 0,
      billingEnabled: false,
      billingMessage: NO_BILLING_MESSAGE,
      volumeThisMonth: volume.get(thisMonth),
      volumeLastMonth: volume.get(lastMonth),
      volumeChangePercent: percentChange(volume.get(thisMonth), volume.get(lastMonth)),
      volumeTotal: sum(payments, p => p.amount),
      paymentsThisMonth: payments.filter(p => inMonth(p.date, thisMonth)).length,
      outstandingAmount: sum(bookings, b => b.balance),
      outstandingBookings: outstanding.length,
    },
    monthlyRevenue: keys.map(key => ({ month: monthLabel(key), bookingVolume: volume.get(key), platformIncome: 0 })),
    transactions,
  };
}

const FREE_PLAN_FEATURES = () => [
  `${env.platformStorageQuotaGB} GB photo storage`,
  'Bookings, clients & payments',
  'Event galleries with QR sharing',
  'Guest selfie face search',
  'Public portfolio website',
  'Invoices',
];

export async function getSubscriptionsData() {
  const { now, photographers } = await loadPlatform();
  const thisMonth = monthKey(now);
  const newThisMonth = photographers.filter(p => inMonth(p.joinedAt, thisMonth)).length;
  return {
    billing: { enabled: false, message: NO_BILLING_MESSAGE },
    plans: [
      {
        id: FREE_PLAN.id,
        name: FREE_PLAN.name,
        price: 0,
        annualPrice: 0,
        color: FREE_PLAN.color,
        bg: FREE_PLAN.bg,
        subscribers: photographers.length,
        mrr: 0,
        growth: `+${newThisMonth} this month`,
        features: FREE_PLAN_FEATURES(),
        limits: { bookings: 'Unlimited', storage: `${env.platformStorageQuotaGB} GB`, galleries: 'Unlimited', staff: 1 },
      },
    ],
    recentSubscribers: [...photographers]
      .filter(p => p.joinedAt)
      .sort((a, b) => b.joinedAt - a.joinedAt)
      .slice(0, RECENT_SUBSCRIBER_LIMIT)
      .map(p => ({
        id: p.id,
        name: p.name,
        plan: FREE_PLAN.name,
        email: p.email,
        since: toDateString(p.joinedAt),
        status: 'active',
        nextBilling: null,
        amount: formatCurrency(0),
      })),
  };
}

export const ANALYTICS_PERIODS = Object.freeze({ '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: null });

export async function getAnalyticsData(period = '30d') {
  if (!(period in ANALYTICS_PERIODS)) {
    throw HttpError.badRequest(`period must be one of: ${Object.keys(ANALYTICS_PERIODS).join(', ')}.`);
  }
  const platform = await loadPlatform();
  const { now, photographers, bookings, clients } = platform;
  const days = ANALYTICS_PERIODS[period];
  const since = days === null ? null : new Date(now.getTime() - days * DAY_MS);
  const inPeriod = date => Boolean(date) && (since === null || date >= since) && date <= now;
  const periodBookings = bookings.filter(b => inPeriod(b.createdAt));
  const periodPayments = allPayments(platform).filter(p => inPeriod(p.date));

  // Cumulative photographers and clients at the end of each of the last 12 months.
  const keys = recentMonthKeys(now);
  const userGrowth = keys.map(key => ({
    month: monthLabel(key),
    photographers: photographers.filter(p => p.joinedAt && monthKey(p.joinedAt) <= key).length,
    clients: clients.filter(c => c.firstBooking && monthKey(c.firstBooking) <= key).length,
  }));

  const volumeByPhotographer = new Map();
  for (const payment of periodPayments) {
    const id = payment.booking.userId;
    volumeByPhotographer.set(id, (volumeByPhotographer.get(id) ?? 0) + payment.amount);
  }

  const locations = new Map();
  for (const p of photographers) {
    const raw = (p.portfolio?.location ?? '').split(',')[0].trim();
    const key = raw.toLowerCase() || '—';
    const entry = locations.get(key) ?? { state: raw || 'Not set', photographers: 0, volume: 0 };
    entry.photographers += 1;
    entry.volume += volumeByPhotographer.get(p.id) ?? 0;
    locations.set(key, entry);
  }
  const geographicData = [...locations.values()]
    .sort((a, b) => b.photographers - a.photographers || b.volume - a.volume)
    .slice(0, TOP_LOCATIONS)
    .map(({ state, photographers: count, volume }) => ({ state, photographers: count, revenue: formatCurrency(volume) }));

  const types = new Map();
  for (const b of periodBookings) {
    const key = b.eventType.toLowerCase();
    const entry = types.get(key) ?? { type: b.eventType, count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += b.collected;
    types.set(key, entry);
  }
  const sortedTypes = [...types.values()].sort((a, b) => b.count - a.count || b.revenue - a.revenue);
  const shownTypes = sortedTypes.slice(0, TOP_EVENT_TYPES);
  const otherTypes = sortedTypes.slice(TOP_EVENT_TYPES);
  if (otherTypes.length) shownTypes.push({ type: 'Other', count: sum(otherTypes, t => t.count), revenue: sum(otherTypes, t => t.revenue) });
  const eventTypeData = shownTypes.map((t, i) => ({ ...t, color: CHART_COLORS[i % CHART_COLORS.length] }));

  // Share of photographers still active k months after signing up, among those who signed up at least k months ago.
  const retentionData = [];
  for (let k = 1; k <= 12; k += 1) {
    const offset = k * 30.44 * DAY_MS;
    const eligible = photographers.filter(p => p.joinedAt && now - p.joinedAt >= offset);
    if (eligible.length === 0) continue;
    const retained = eligible.filter(p => p.lastActive && p.lastActive - p.joinedAt >= offset);
    retentionData.push({ month: `M${k}`, rate: percent(retained.length, eligible.length) });
  }

  const committed = bookings.filter(b => b.status !== 'Inquiry' && b.status !== 'Cancelled');
  const billable = bookings.filter(b => b.balance > 0 || (b.price > 0 && b.status !== 'Inquiry' && b.status !== 'Cancelled'));
  const radarData = [
    { metric: 'Active (30d)', value: percent(photographers.filter(p => p.active).length, photographers.length) },
    { metric: 'Portfolios live', value: percent(photographers.filter(p => p.portfolio?.published).length, photographers.length) },
    { metric: 'Taking bookings', value: percent(photographers.filter(p => p.bookings.length > 0).length, photographers.length) },
    { metric: 'Using galleries', value: percent(photographers.filter(p => p.events.length > 0).length, photographers.length) },
    { metric: 'Delivery rate', value: percent(committed.filter(b => b.status === 'Delivered').length, committed.length) },
    {
      metric: 'Payment collection',
      value: Math.min(percent(sum(billable, b => Math.min(b.collected, b.price)), sum(billable, b => b.price)), 100),
    },
  ];

  const periodPhotographers = photographers.filter(p => inPeriod(p.joinedAt)).length;
  return {
    period,
    summary: {
      healthScore: radarData.length ? Math.round(sum(radarData, m => m.value) / radarData.length) : 0,
      retention12m: retentionData.find(point => point.month === 'M12')?.rate ?? null,
      avgBookingsPerPhotographer: photographers.length ? Number((periodBookings.length / photographers.length).toFixed(1)) : 0,
      volumePerPhotographer: photographers.length ? Math.round(sum(periodPayments, p => p.amount) / photographers.length) : 0,
      newPhotographers: periodPhotographers,
      bookings: periodBookings.length,
      bookingVolume: sum(periodPayments, p => p.amount),
    },
    userGrowth,
    geographicData,
    eventTypeData,
    retentionData,
    radarData,
  };
}

export async function getGalleryStorageData() {
  const { photographers } = await loadPlatform();
  const limitBytes = quotaBytes();
  const limitGB = env.platformStorageQuotaGB;
  const users = photographers.filter(p => p.events.length > 0 || p.usedBytes > 0);
  const totalUsedBytes = sum(photographers, p => p.usedBytes);
  const totalAllocatedBytes = photographers.length * limitBytes;

  return {
    storageOverview: {
      totalAllocated: photographers.length * limitGB,
      totalUsed: bytesToGigabytes(totalUsedBytes),
      totalFiles: sum(photographers, p => p.files),
      avgPerPhotographer: photographers.length ? bytesToGigabytes(totalUsedBytes / photographers.length) : 0,
      totalAllocatedBytes,
      totalUsedBytes,
      quotaGB: limitGB,
      photographers: photographers.length,
    },
    galleryUsers: users
      .sort((a, b) => b.usedBytes - a.usedBytes || byName(a, b))
      .map(p => ({
        id: p.id,
        name: p.name,
        plan: FREE_PLAN.name,
        usedGB: bytesToGigabytes(p.usedBytes),
        limitGB,
        usedBytes: p.usedBytes,
        limitBytes,
        galleries: p.events.length,
        files: p.files,
        lastUpload: toDateString(p.lastUpload),
        status: storageStatus(p.usedBytes, limitBytes),
      })),
  };
}

/** Platform-derived alerts for the admin notification feed (see notificationService). */
export async function getPlatformAlerts() {
  const { now, photographers } = await loadPlatform();
  const limitBytes = quotaBytes();
  const alerts = [];
  const recent = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * DAY_MS);
  for (const p of photographers) {
    if (p.joinedAt && p.joinedAt >= recent) {
      alerts.push({
        _id: `platform-signup-${p.id}`,
        type: 'info',
        title: `New photographer signed up: ${p.name}`,
        message: `${p.name} joined EventSnap on the Free plan.`,
        category: 'Photographers',
        createdAt: p.joinedAt,
      });
    }
    const status = storageStatus(p.usedBytes, limitBytes);
    if (status !== 'ok') {
      alerts.push({
        _id: `platform-storage-${status}-${p.id}`,
        type: status === 'exceeded' ? 'error' : 'warning',
        title: status === 'exceeded' ? `${p.name} is over the storage limit` : `${p.name} is near the storage limit`,
        message: `${formatBytes(p.usedBytes)} of ${env.platformStorageQuotaGB} GB used.`,
        category: 'Storage',
        createdAt: now,
      });
    }
  }
  return alerts;
}
