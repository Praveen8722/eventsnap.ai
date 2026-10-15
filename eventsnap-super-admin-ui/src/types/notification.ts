export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  category: string;
}

export interface NotificationAlert {
  /** Id of the underlying notification. */
  id: string;
  text: string;
  time: string;
  type: NotificationType;
  read: boolean;
}

export interface NotificationsData {
  notifications: AdminNotification[];
  categories: string[];
}
