import { Router } from 'express';
import {
  getMe, getSetup, postAcceptInvite, postInviteInfo, postLogin, postLogout, postSetup,
} from '../controllers/authController.js';
import * as platform from '../controllers/platformController.js';
import { requireAccess, requireAuth } from '../middlewares/auth.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok' }));

// First-time setup: creates the first Super Admin, only while no admin exists.
apiRouter.get('/auth/setup', getSetup);
apiRouter.post('/auth/setup', postSetup);
apiRouter.post('/auth/login', postLogin);
apiRouter.post('/auth/invite', postInviteInfo);
apiRouter.post('/auth/accept-invite', postAcceptInvite);

// Everything below requires a signed-in admin, and each area the admin's role (config/permissions.js).
apiRouter.use(requireAuth);

apiRouter.get('/auth/me', getMe);
apiRouter.post('/auth/logout', postLogout);
apiRouter.get('/system/status', platform.getSystemStatus);

apiRouter.get('/dashboard', requireAccess('dashboard'), platform.getDashboard);
apiRouter.get('/photographers', requireAccess('photographers'), platform.getPhotographers);
apiRouter.get('/clients', requireAccess('clients'), platform.getClients);
apiRouter.get('/bookings', requireAccess('bookings'), platform.getBookings);
apiRouter.get('/payments', requireAccess('payments'), platform.getPayments);
apiRouter.get('/subscriptions', requireAccess('subscriptions'), platform.getSubscriptions);
apiRouter.get('/analytics', requireAccess('analytics'), platform.getAnalytics);
apiRouter.get('/gallery', requireAccess('gallery'), platform.getGallery);
apiRouter.get('/activity-logs', requireAccess('activityLogs'), platform.getActivityLogs);

apiRouter.get('/support-tickets', requireAccess('support'), platform.getSupportTickets);
apiRouter.post('/support-tickets', requireAccess('support'), platform.postSupportTicket);
apiRouter.get('/support-tickets/meta', requireAccess('support'), platform.getSupportMeta);
apiRouter.get('/support-tickets/:id', requireAccess('support'), platform.getSupportTicketById);
apiRouter.patch('/support-tickets/:id', requireAccess('support'), platform.patchSupportTicket);
apiRouter.post('/support-tickets/:id/messages', requireAccess('support'), platform.postTicketMessage);

apiRouter.get('/notifications', requireAccess('notifications'), platform.getNotifications);
apiRouter.get('/notifications/alerts', requireAccess('notifications'), platform.getNotificationAlerts);
apiRouter.post('/notifications/read-all', requireAccess('notifications'), platform.postMarkAllNotificationsRead);
apiRouter.patch('/notifications/:id/read', requireAccess('notifications'), platform.patchNotificationRead);
apiRouter.delete('/notifications/:id', requireAccess('notifications'), platform.deleteNotification);

apiRouter.get('/settings', requireAccess('settings'), platform.getSettings);
apiRouter.put('/settings', requireAccess('settingsEdit'), platform.putSettings);

apiRouter.get('/admin-users', requireAccess('adminUsers'), platform.getAdminUsers);
apiRouter.post('/admin-users', requireAccess('adminUsers'), platform.postAdminUser);
apiRouter.patch('/admin-users/:id', requireAccess('adminUsers'), platform.patchAdminUser);
apiRouter.delete('/admin-users/:id', requireAccess('adminUsers'), platform.deleteAdminUserById);
apiRouter.post('/admin-users/:id/invite', requireAccess('adminUsers'), platform.postResendInvite);
