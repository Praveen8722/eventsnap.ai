import { formatRelativeTime, toIsoString } from '../utils/format.js';

/** Maps admin-database documents (lean) to the payload shapes declared in eventsnap-super-admin-ui/src/types. */

export const toAdminUser = doc => ({
  id: doc._id,
  name: doc.name,
  email: doc.email,
  role: doc.role,
  status: doc.status,
  lastLogin: toIsoString(doc.lastLogin),
  joined: doc.joined,
  // An invite that hasn't been accepted yet (the account has no password).
  invitePending: Boolean(doc.inviteExpiresAt),
  inviteExpiresAt: toIsoString(doc.inviteExpiresAt),
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
  messages: doc.thread?.length ?? 0,
});

export const toTicketDetail = doc => ({
  ...toTicket(doc),
  thread: (doc.thread ?? []).map(message => ({
    id: String(message._id),
    from: message.from,
    author: message.author,
    body: message.body,
    at: toIsoString(message.at),
  })),
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

const STORAGE_WARNING_RATIO = 0.9;

/** Works in any unit, as long as both values use the same one. */
export function storageStatus(used, limit) {
  if (used > limit) return 'exceeded';
  if (used >= limit * STORAGE_WARNING_RATIO) return 'warning';
  return 'ok';
}
