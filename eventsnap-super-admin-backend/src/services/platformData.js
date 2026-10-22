import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { platformCollection } from '../config/platformDb.js';

/**
 * Loads the EventSnap platform's data (the photographer dashboard's database) through the
 * read-only connection and joins it per photographer. Only the fields the admin pages need are
 * read: never passwords, photo files, face data or private notes.
 *
 * Every record keeps the photographer (`userId`) it belongs to, exactly as the platform stores it;
 * clients are grouped within each photographer, never across photographers.
 */

const DAY_MS = 86_400_000;
export const ACTIVE_WINDOW_DAYS = 30;

const num = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const validDate = value => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const latest = dates => dates.reduce((max, date) => (date && (!max || date > max) ? date : max), null);
const earliest = dates => dates.reduce((min, date) => (date && (!min || date < min) ? date : min), null);

// --- calendar months in the reporting timezone -------------------------------------------------

const monthKeyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: env.reportTimeZone, year: 'numeric', month: '2-digit' });

/** Date -> "2026-10" (in REPORT_TIMEZONE). */
export const monthKey = date => {
  const parts = Object.fromEntries(monthKeyFormatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}`;
};

/** The last `count` month keys, oldest first, ending with the current month. */
export function recentMonthKeys(now = new Date(), count = 12) {
  let [year, month] = monthKey(now).split('-').map(Number);
  const keys = [];
  for (let i = 0; i < count; i += 1) {
    keys.unshift(`${year}-${String(month).padStart(2, '0')}`);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return keys;
}

/** "2026-10" -> "Oct" */
export const monthLabel = key => {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 15)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
};

// --- loading -----------------------------------------------------------------------------------

async function readPlatform() {
  const [users, bookings, portfolios, ledgers, events] = await Promise.all([
    platformCollection('users')
      .find({}, { projection: { name: 1, businessName: 1, email: 1, phone: 1, createdAt: 1, updatedAt: 1 } })
      .toArray(),
    platformCollection('bookings')
      .find({}, {
        projection: {
          user: 1, bookingId: 1, clientName: 1, email: 1, phone: 1, eventType: 1, eventDate: 1, packageSelected: 1,
          packegPrice: 1, advancePayment: 1, payments: 1, eventDays: 1, source: 1, status: 1, statusHistory: 1,
          createdAt: 1, updatedAt: 1,
        },
      })
      .toArray(),
    platformCollection('portfolios')
      .find({}, {
        projection: { user: 1, slug: 1, location: 1, 'services.title': 1, 'testimonials.rating': 1, 'settings.published': 1, updatedAt: 1 },
      })
      .toArray(),
    platformCollection('storageusages').find({}, { projection: { user: 1, used: 1 } }).toArray(),
    // Per event: photo count and bytes (originals + thumbnails), without loading the photos.
    platformCollection('createevents')
      .aggregate([
        {
          $project: {
            user: 1,
            name: 1,
            status: 1,
            createdAt: 1,
            files: { $size: { $ifNull: ['$photos', []] } },
            bytes: {
              $sum: {
                $map: {
                  input: { $ifNull: ['$photos', []] },
                  as: 'photo',
                  in: { $add: [{ $ifNull: ['$$photo.size', 0] }, { $ifNull: ['$$photo.thumbSize', 0] }] },
                },
              },
            },
            lastUpload: { $max: '$photos.createdAt' },
          },
        },
      ])
      .toArray(),
  ]);
  return { users, bookings, portfolios, ledgers, events };
}

const OPEN_BOOKING_STATUSES = new Set(['Inquiry', 'Confirmed', 'In Progress', 'Editing', 'Ready for Delivery']);
/** Bookings whose unpaid balance is owed (an inquiry isn't a commitment yet; a cancellation isn't owed). */
const BILLABLE_BOOKING_STATUSES = new Set(['Confirmed', 'In Progress', 'Editing', 'Ready for Delivery', 'Delivered']);

const normaliseKey = value => String(value ?? '').trim().toLowerCase();

/** Groups a photographer's bookings into clients: same phone (last 10 digits), else same email, else same name. */
function clientKey(booking) {
  const phone = String(booking.phone ?? '').replace(/\D/g, '').slice(-10);
  if (phone.length >= 6) return `p:${phone}`;
  const email = normaliseKey(booking.email);
  if (email) return `e:${email}`;
  return `n:${normaliseKey(booking.clientName)}`;
}

// A stable, non-reversible id for a client (the raw phone/email never leaves the server).
const clientId = (userId, key) =>
  `CL-${crypto.createHmac('sha256', env.jwtSecret).update(`${userId}|${key}`).digest('base64url').slice(0, 10)}`;

function buildBooking(doc, photographer) {
  const createdAt = validDate(doc.createdAt);
  const advance = num(doc.advancePayment);
  const payments = (Array.isArray(doc.payments) ? doc.payments : []).map(payment => ({
    amount: num(payment?.amount),
    date: validDate(payment?.date),
  }));
  const collected = advance + payments.reduce((sum, payment) => sum + payment.amount, 0);
  const price = num(doc.packegPrice);
  const days = (Array.isArray(doc.eventDays) ? doc.eventDays : []).map(day => ({
    name: String(day?.name ?? ''),
    date: validDate(day?.date),
    location: String(day?.location ?? ''),
  }));
  const status = String(doc.status ?? 'Inquiry');
  return {
    id: String(doc._id),
    ref: String(doc.bookingId ?? ''),
    userId: photographer?.id ?? null,
    photographer: photographer?.name ?? 'Unassigned',
    clientName: String(doc.clientName ?? '').trim() || 'Unnamed client',
    email: String(doc.email ?? ''),
    phone: String(doc.phone ?? ''),
    eventType: String(doc.eventType ?? '').trim() || 'Other',
    eventDate: validDate(doc.eventDate),
    packageName: String(doc.packageSelected ?? ''),
    price,
    advance,
    payments,
    collected,
    balance: BILLABLE_BOOKING_STATUSES.has(status) ? Math.max(price - collected, 0) : 0,
    status,
    source: doc.source === 'portfolio' ? 'portfolio' : 'internal',
    days,
    location: days.find(day => day.location)?.location ?? '',
    statusHistory: (Array.isArray(doc.statusHistory) ? doc.statusHistory : [])
      .map(entry => ({ status: String(entry?.status ?? ''), date: validDate(entry?.date) }))
      .filter(entry => entry.date),
    createdAt,
    updatedAt: validDate(doc.updatedAt),
  };
}

function buildPlatform(raw, now) {
  const photographers = new Map();
  for (const user of raw.users) {
    const id = String(user._id);
    photographers.set(id, {
      id,
      name: String(user.businessName ?? '').trim() || String(user.name ?? '').trim() || 'Unnamed photographer',
      ownerName: String(user.name ?? '').trim(),
      email: String(user.email ?? ''),
      phone: String(user.phone ?? ''),
      joinedAt: validDate(user.createdAt),
      activity: [validDate(user.createdAt), validDate(user.updatedAt)],
      bookings: [],
      events: [],
      clients: new Map(),
      portfolio: null,
      storageBytes: null,
    });
  }

  for (const portfolio of raw.portfolios) {
    const owner = photographers.get(String(portfolio.user));
    if (!owner) continue;
    const ratings = (portfolio.testimonials ?? []).map(t => num(t?.rating)).filter(r => r > 0);
    owner.portfolio = {
      slug: String(portfolio.slug ?? ''),
      location: String(portfolio.location ?? '').trim(),
      specialty: (portfolio.services ?? []).map(s => String(s?.title ?? '').trim()).find(Boolean) ?? '',
      rating: ratings.length ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 0,
      published: portfolio.settings?.published !== false,
    };
    owner.activity.push(validDate(portfolio.updatedAt));
  }

  for (const ledger of raw.ledgers) {
    const owner = photographers.get(String(ledger.user));
    if (owner) owner.storageBytes = Math.max(num(ledger.used), 0);
  }

  for (const event of raw.events) {
    const owner = photographers.get(String(event.user));
    if (!owner) continue;
    const record = {
      id: String(event._id),
      name: String(event.name ?? ''),
      status: String(event.status ?? ''),
      files: num(event.files),
      bytes: num(event.bytes),
      createdAt: validDate(event.createdAt),
      lastUpload: validDate(event.lastUpload),
    };
    owner.events.push(record);
    owner.activity.push(record.createdAt, record.lastUpload);
  }

  const bookings = [];
  for (const doc of raw.bookings) {
    const owner = doc.user ? photographers.get(String(doc.user)) : null;
    const booking = buildBooking(doc, owner);
    bookings.push(booking);
    if (!owner) continue;
    owner.bookings.push(booking);
    // The photographer's own actions: bookings they add (not ones clients send from the portfolio),
    // status changes and payments they record.
    if (booking.source !== 'portfolio') owner.activity.push(booking.createdAt);
    owner.activity.push(...booking.statusHistory.slice(1).map(entry => entry.date), ...booking.payments.map(p => p.date));
    if (booking.updatedAt && booking.createdAt && booking.updatedAt - booking.createdAt > 1000) owner.activity.push(booking.updatedAt);

    const key = clientKey(booking);
    const client = owner.clients.get(key) ?? { id: clientId(owner.id, key), bookings: [] };
    client.bookings.push(booking);
    owner.clients.set(key, client);
  }

  const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * DAY_MS);
  for (const owner of photographers.values()) {
    owner.lastActive = latest(owner.activity.filter(Boolean));
    owner.active = Boolean(owner.lastActive && owner.lastActive >= activeSince);
    owner.collected = owner.bookings.reduce((sum, b) => sum + b.collected, 0);
    owner.eventBytes = owner.events.reduce((sum, e) => sum + e.bytes, 0);
    owner.usedBytes = owner.storageBytes ?? owner.eventBytes;
    owner.files = owner.events.reduce((sum, e) => sum + e.files, 0);
    owner.lastUpload = latest(owner.events.map(e => e.lastUpload));
  }

  const clients = [];
  for (const owner of photographers.values()) {
    for (const client of owner.clients.values()) {
      const ordered = [...client.bookings].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      const newest = ordered[0];
      clients.push({
        id: client.id,
        userId: owner.id,
        photographer: owner.name,
        name: newest.clientName,
        email: ordered.map(b => b.email).find(Boolean) ?? '',
        phone: ordered.map(b => b.phone).find(Boolean) ?? '',
        location: ordered.map(b => b.location).find(Boolean) ?? '',
        bookings: ordered.length,
        totalSpent: ordered.reduce((sum, b) => sum + b.collected, 0),
        firstBooking: earliest(ordered.map(b => b.createdAt)),
        lastBooking: latest(ordered.map(b => b.createdAt)),
        active: ordered.some(b => OPEN_BOOKING_STATUSES.has(b.status)),
      });
    }
  }

  return { now, photographers: [...photographers.values()], bookings, clients };
}

let cache = null;

/**
 * The joined platform data. Reused for PLATFORM_CACHE_SECONDS (default 30) so moving between admin
 * pages doesn't re-read the whole platform each time; a failed read is never cached.
 */
export function loadPlatform() {
  const ttl = env.platformCacheSeconds * 1000;
  if (cache && Date.now() - cache.at < ttl) return cache.promise;
  const at = Date.now();
  const promise = readPlatform().then(raw => buildPlatform(raw, new Date(at)));
  cache = { at, promise };
  promise.catch(() => {
    if (cache?.promise === promise) cache = null;
  });
  return promise;
}

export const clearPlatformCache = () => {
  cache = null;
};
