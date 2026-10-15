import type { AdminNotification, NotificationAlert, NotificationsData } from '@/types';
import { apiRequest } from './apiClient';

export function getNotificationsData(): Promise<NotificationsData> {
  return apiRequest('/notifications');
}

export function getRecentAlerts(): Promise<NotificationAlert[]> {
  return apiRequest('/notifications/alerts');
}

export function markNotificationRead(id: string): Promise<AdminNotification> {
  return apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(): Promise<{ updated: number }> {
  return apiRequest('/notifications/read-all', { method: 'POST' });
}

export function dismissNotification(id: string): Promise<void> {
  return apiRequest(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
