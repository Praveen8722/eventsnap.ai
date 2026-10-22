import { canAccess } from '../config/permissions.js';
import { AdminUser, nextSequence, Notification, SupportTicket, TICKET_PRIORITIES, TICKET_STATUSES } from '../models/index.js';
import { HttpError } from '../utils/HttpError.js';
import { requireObject, requireOneOf, requireString } from '../utils/validation.js';
import { recordAudit } from './auditService.js';
import { toTicket, toTicketDetail } from './mappers.js';

/**
 * Support tickets live in the admin database. Requests reach the team by email, phone or chat;
 * an admin logs them here as tickets, records the requester's messages and the team's replies,
 * and tracks status, priority and assignee.
 */

const UNASSIGNED = 'Unassigned';
const MAX_MESSAGE_LENGTH = 5000;
export const TICKET_CATEGORIES = ['Account', 'Billing', 'Bookings', 'Galleries & Storage', 'Technical', 'Feature Request', 'Other'];

export async function listSupportTickets() {
  return (await SupportTicket.find({}, { 'thread.body': 0 }).sort({ created: -1 }).lean()).map(toTicket);
}

async function findTicket(id) {
  const ticket = await SupportTicket.findById(String(id)).lean();
  if (!ticket) throw HttpError.notFound('Support ticket not found.');
  return ticket;
}

export async function getSupportTicket(id) {
  return toTicketDetail(await findTicket(id));
}

/** Active admins whose role can work on support tickets. */
export async function listAssignees() {
  const admins = await AdminUser.find({ status: 'active' }, { name: 1, role: 1 }).sort({ name: 1 }).lean();
  return admins.filter(admin => canAccess(admin.role, 'support')).map(admin => ({ id: admin._id, name: admin.name, role: admin.role }));
}

async function requireAssignee(value) {
  const name = requireString(value, 'Assignee', { maxLength: 100 });
  if (name === UNASSIGNED) return name;
  if (!(await listAssignees()).some(admin => admin.name === name)) {
    throw HttpError.badRequest('Assignee must be an active admin who can work on support tickets.');
  }
  return name;
}

const requireBody = value => requireString(value, 'Message', { maxLength: MAX_MESSAGE_LENGTH });

export async function createSupportTicket(body, actor, ip) {
  requireObject(body);
  const subject = requireString(body.subject, 'Subject', { maxLength: 200 });
  const requester = requireString(body.requester, 'Requester', { maxLength: 120 });
  const requesterType = requireOneOf(body.requesterType, 'Requester type', ['photographer', 'client']);
  const category = requireOneOf(body.category ?? 'Other', 'Category', TICKET_CATEGORIES);
  const priority = requireOneOf(body.priority ?? 'medium', 'Priority', TICKET_PRIORITIES);
  const message = requireBody(body.message);
  const assignedTo = body.assignedTo === undefined ? UNASSIGNED : await requireAssignee(body.assignedTo);

  const now = new Date();
  const id = `#${1000 + (await nextSequence('supportTicket'))}`;
  const ticket = await SupportTicket.create({
    _id: id,
    subject,
    requester,
    requesterType,
    category,
    priority,
    status: 'open',
    assignedTo,
    created: now,
    updated: now,
    thread: [{ from: 'requester', author: requester, body: message, at: now }],
  });

  await recordAudit({ actor, action: 'TICKET_CREATED', category: 'support', target: `${id} ${subject}`, details: `Priority ${priority}, assigned to ${assignedTo}`, ip });
  if (priority === 'critical') {
    await Notification.create({
      _id: `ticket-${id.slice(1)}-critical`,
      type: 'error',
      title: `Critical ticket ${id}: ${subject}`,
      message: `Raised for ${requester}. Assigned to ${assignedTo}.`,
      category: 'Support',
    }).catch(() => {});
  }
  return toTicketDetail(ticket.toObject());
}

/** `{ status?, priority?, assignedTo? }` */
export async function updateSupportTicket(id, body, actor, ip) {
  requireObject(body);
  const ticket = await findTicket(id);
  const changes = {};
  if (body.status !== undefined) changes.status = requireOneOf(body.status, 'Status', TICKET_STATUSES);
  if (body.priority !== undefined) changes.priority = requireOneOf(body.priority, 'Priority', TICKET_PRIORITIES);
  if (body.assignedTo !== undefined) changes.assignedTo = await requireAssignee(body.assignedTo);
  if (Object.keys(changes).length === 0) throw HttpError.badRequest('Nothing to update.');

  const described = Object.entries(changes).filter(([key, value]) => ticket[key] !== value);
  if (described.length === 0) return toTicketDetail(ticket);

  const updated = await SupportTicket.findByIdAndUpdate(ticket._id, { ...changes, updated: new Date() }, { returnDocument: 'after' }).lean();
  await recordAudit({
    actor,
    action: 'TICKET_UPDATED',
    category: 'support',
    target: `${ticket._id} ${ticket.subject}`,
    details: described.map(([key, value]) => `${key}: ${ticket[key]} → ${value}`).join('; '),
    ip,
  });
  return toTicketDetail(updated);
}

/**
 * `{ body, from? }` — a reply from the signed-in admin (default), or a message from the requester
 * logged by the admin. Replying to an open ticket moves it to in-progress; a requester message
 * reopens a resolved or closed one.
 */
export async function addTicketMessage(id, body, actor, ip) {
  requireObject(body);
  const ticket = await findTicket(id);
  const text = requireBody(body.body);
  const from = requireOneOf(body.from ?? 'admin', 'from', ['admin', 'requester']);
  const now = new Date();
  let status = ticket.status;
  if (from === 'admin' && status === 'open') status = 'in-progress';
  if (from === 'requester' && (status === 'resolved' || status === 'closed')) status = 'open';

  const updated = await SupportTicket.findByIdAndUpdate(
    ticket._id,
    { $push: { thread: { from, author: from === 'admin' ? actor.name : ticket.requester, body: text, at: now } }, status, updated: now },
    { returnDocument: 'after' },
  ).lean();

  await recordAudit({
    actor,
    action: from === 'admin' ? 'TICKET_REPLIED' : 'TICKET_MESSAGE_LOGGED',
    category: 'support',
    target: `${ticket._id} ${ticket.subject}`,
    details: status !== ticket.status ? `status: ${ticket.status} → ${status}` : '',
    ip,
  });
  return toTicketDetail(updated);
}
