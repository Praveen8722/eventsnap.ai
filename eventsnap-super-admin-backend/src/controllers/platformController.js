import { getAdminUsersData, inviteAdminUser } from '../services/adminUserService.js';
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
export const getAnalytics = respondWith(platform.getAnalyticsData);
export const getGallery = respondWith(platform.getGalleryStorageData);
export const getSupportTickets = respondWith(platform.listSupportTickets);
export const getActivityLogs = respondWith(listAuditLogs);
export const getAdminUsers = respondWith(getAdminUsersData);
export const getNotifications = respondWith(getNotificationsData);
export const getNotificationAlerts = respondWith(getRecentAlerts);
export const getSettings = respondWith(getPlatformSettings);

export async function postAdminUser(req, res) {
  res.status(201).json(await inviteAdminUser(req.body, req.admin, clientIp(req)));
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
