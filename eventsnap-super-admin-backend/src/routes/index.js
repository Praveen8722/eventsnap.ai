import { Router } from 'express';
import { getMe, postLogin, postTwoFactor } from '../controllers/authController.js';
import * as platform from '../controllers/platformController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok' }));

apiRouter.post('/auth/login', postLogin);
apiRouter.post('/auth/2fa', postTwoFactor);

// Everything below requires a signed-in admin.
apiRouter.use(requireAuth);

apiRouter.get('/auth/me', getMe);

apiRouter.get('/dashboard', platform.getDashboard);
apiRouter.get('/photographers', platform.getPhotographers);
apiRouter.get('/clients', platform.getClients);
apiRouter.get('/bookings', platform.getBookings);
apiRouter.get('/payments', platform.getPayments);
apiRouter.get('/subscriptions', platform.getSubscriptions);
apiRouter.get('/analytics', platform.getAnalytics);
apiRouter.get('/gallery', platform.getGallery);
apiRouter.get('/support-tickets', platform.getSupportTickets);
apiRouter.get('/activity-logs', platform.getActivityLogs);

apiRouter.get('/notifications', platform.getNotifications);
apiRouter.get('/notifications/alerts', platform.getNotificationAlerts);
apiRouter.post('/notifications/read-all', platform.postMarkAllNotificationsRead);
apiRouter.patch('/notifications/:id/read', platform.patchNotificationRead);
apiRouter.delete('/notifications/:id', platform.deleteNotification);

apiRouter.get('/settings', platform.getSettings);
apiRouter.put('/settings', requireRole('Super Admin'), platform.putSettings);

apiRouter.get('/admin-users', platform.getAdminUsers);
apiRouter.post('/admin-users', requireRole('Super Admin'), platform.postAdminUser);
