import { formatCurrency, formatGigabytes, formatRelativeTime, formatSignedCurrency, toIsoString } from '../utils/format.js';

/** Maps database documents (lean) to the payload shapes declared in eventsnap-super-admin-ui/src/types. */

export const toAdminUser = doc => ({
  id: doc._id,
  name: doc.name,
  email: doc.email,
  role: doc.role,
  status: doc.status,
  lastLogin: toIsoString(doc.lastLogin),
  joined: doc.joined,
  twoFA: doc.twoFA,
});

export const toPhotographer = doc => ({
  id: doc._id,
  name: doc.name,
  email: doc.email,
  phone: doc.phone,
  location: doc.location,
  joinDate: doc.joinDate,
  plan: doc.plan,
  status: doc.status,
  bookings: doc.bookings,
  revenue: formatCurrency(doc.revenue),
  rating: doc.rating,
  storage: formatGigabytes(doc.storage?.usedGB ?? 0),
  specialty: doc.specialty,
});

export const toTopPhotographer = doc => ({
  name: doc.name,
  location: doc.location,
  bookings: doc.bookings,
  revenue: formatCurrency(doc.revenue),
  status: doc.status,
  plan: doc.plan,
});

export const toClient = doc => ({
  id: doc._id,
  name: doc.name,
  email: doc.email,
  phone: doc.phone,
  location: doc.location,
  photographer: doc.photographer,
  bookings: doc.bookings,
  totalSpent: formatCurrency(doc.totalSpent),
  lastBooking: doc.lastBooking,
  status: doc.status,
  joinDate: doc.joinDate,
});

export const toBooking = doc => ({
  id: doc._id,
  client: doc.client,
  photographer: doc.photographer,
  eventType: doc.eventType,
  eventDate: doc.eventDate,
  package: doc.package,
  amount: formatCurrency(doc.amount),
  status: doc.status,
  location: doc.location,
  createdAt: doc.createdAt,
});

export const toTransaction = doc => ({
  id: doc._id,
  photographer: doc.photographer,
  type: doc.type,
  amount: formatSignedCurrency(doc.amount),
  method: doc.method,
  status: doc.status,
  date: doc.date,
  description: doc.description,
});

export const toTicket = doc => ({
  id: doc._id,
  subject: doc.subject,
  requester: doc.requester,
  requesterType: doc.requesterType,
  category: doc.category,
  priority: doc.priority,
  status: doc.status,
  assignedTo: doc.assignedTo,
  created: toIsoString(doc.created),
  updated: toIsoString(doc.updated),
  messages: doc.messages,
});

export const toAuditLog = doc => ({
  id: doc._id,
  timestamp: toIsoString(doc.timestamp),
  actor: doc.actor,
  actorRole: doc.actorRole,
  action: doc.action,
  category: doc.category,
  target: doc.target,
  ipAddress: doc.ipAddress,
  status: doc.status,
  details: doc.details,
});

export const toNotification = (doc, now = new Date()) => ({
  id: doc._id,
  type: doc.type,
  title: doc.title,
  message: doc.message,
  time: formatRelativeTime(doc.createdAt, now),
  read: doc.read,
  category: doc.category,
});

export const toNotificationAlert = (doc, now = new Date()) => ({
  id: doc._id,
  text: doc.title,
  time: formatRelativeTime(doc.createdAt, now),
  type: doc.type,
  read: doc.read,
});

export const toActivityEvent = (doc, now = new Date()) => ({
  type: doc.type,
  message: doc.message,
  time: formatRelativeTime(doc.createdAt, now),
  status: doc.status,
});

const limitValue = value => (value === null || value === undefined ? 'Unlimited' : value);

export const toSubscriptionPlan = doc => ({
  id: doc._id,
  name: doc.name,
  price: doc.price,
  annualPrice: doc.annualPrice,
  color: doc.color,
  bg: doc.bg,
  subscribers: doc.subscribers,
  mrr: doc.subscribers * doc.price,
  growth: doc.growth,
  ...(doc.popular ? { popular: true } : {}),
  features: doc.features,
  limits: {
    bookings: limitValue(doc.limits.bookings),
    storage: formatGigabytes(doc.limits.storageGB),
    galleries: limitValue(doc.limits.galleries),
    staff: doc.limits.staff,
  },
});

const STORAGE_WARNING_RATIO = 0.9;

export function storageStatus(usedGB, limitGB) {
  if (usedGB > limitGB) return 'exceeded';
  if (usedGB >= limitGB * STORAGE_WARNING_RATIO) return 'warning';
  return 'ok';
}

export const toGalleryUser = (doc, limitGB) => ({
  id: doc._id,
  name: doc.name,
  plan: doc.plan,
  usedGB: doc.storage.usedGB,
  limitGB,
  galleries: doc.storage.galleries,
  files: doc.storage.files,
  lastUpload: doc.storage.lastUpload,
  status: storageStatus(doc.storage.usedGB, limitGB),
});
