import { platformConnected } from '../config/platformDb.js';
import {
  deleteAdminUser,
  getAdminUsersData,
  inviteAdminUser,
  resendInvite,
  updateAdminUser,
} from '../services/adminUserService.js';
import { clientIp, listAuditLogs } from '../services/auditService.js';
import {
  dismissNotification,
  getNotificationsData,
  getRecentAlerts,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService.js';
import * as platform from '../services/platformService.js';
import { getPlatformSettings, updatePlatformSettings } from '../services/settingsService.js';
import {
  addTicketMessage,
  createSupportTicket,
  getSupportTicket,
  listAssignees,
  listSupportTickets,
  TICKET_CATEGORIES,
  updateSupportTicket,
} from '../services/supportService.js';

/** Wraps a no-argument service query as a JSON GET handler. */
const respondWith = query => async (_req, res) => {
  res.json(await query());
};

export const getDashboard = respondWith(platform.getDashboardData);
export const getPhotographers = respondWith(platform.listPhotographers);
export const getClients = respondWith(platform.listClients);
export const getBookings = respondWith(platform.listBookings);
export const getPayments = respondWith(platform.getPaymentsData);
export const getSubscriptions = respondWith(platform.getSubscriptionsData);
export const getGallery = respondWith(platform.getGalleryStorageData);
export const getSupportTickets = respondWith(listSupportTickets);
export const getActivityLogs = respondWith(listAuditLogs);
export const getAdminUsers = respondWith(getAdminUsersData);
export const getNotifications = respondWith(getNotificationsData);
export const getNotificationAlerts = respondWith(getRecentAlerts);
export const getSettings = respondWith(getPlatformSettings);

export async function getAnalytics(req, res) {
  const period = typeof req.query.period === 'string' ? req.query.period : undefined;
  res.json(await platform.getAnalyticsData(period));
}

export function getSystemStatus(_req, res) {
  res.json({ api: 'ok', platformDatabase: platformConnected() ? 'connected' : 'not-configured' });
}

export async function getSupportTicketById(req, res) {
  res.json(await getSupportTicket(req.params.id));
}

export async function getSupportMeta(_req, res) {
  res.json({ assignees: await listAssignees(), categories: TICKET_CATEGORIES });
}

export async function postSupportTicket(req, res) {
  res.status(201).json(await createSupportTicket(req.body, req.admin, clientIp(req)));
}

export async function patchSupportTicket(req, res) {
  res.json(await updateSupportTicket(req.params.id, req.body, req.admin, clientIp(req)));
}

export async function postTicketMessage(req, res) {
  res.status(201).json(await addTicketMessage(req.params.id, req.body, req.admin, clientIp(req)));
}

export async function postAdminUser(req, res) {
  res.status(201).json(await inviteAdminUser(req.body, req.admin, clientIp(req)));
}

export async function patchAdminUser(req, res) {
  res.json(await updateAdminUser(req.params.id, req.body, req.admin, clientIp(req)));
}

export async function postResendInvite(req, res) {
  res.json(await resendInvite(req.params.id, req.admin, clientIp(req)));
}

export async function deleteAdminUserById(req, res) {
  await deleteAdminUser(req.params.id, req.admin, clientIp(req));
  res.status(204).end();
}

export async function putSettings(req, res) {
  res.json(await updatePlatformSettings(req.body, req.admin, clientIp(req)));
}

export async function patchNotificationRead(req, res) {
  res.json(await markNotificationRead(req.params.id));
}

export async function postMarkAllNotificationsRead(_req, res) {
  res.json(await markAllNotificationsRead());
}

export async function deleteNotification(req, res) {
  await dismissNotification(req.params.id);
  res.status(204).end();
}
