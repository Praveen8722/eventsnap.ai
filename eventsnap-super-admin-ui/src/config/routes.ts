export const ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  photographers: '/photographers',
  clients: '/clients',
  bookings: '/bookings',
  payments: '/payments',
  subscriptions: '/subscriptions',
  analytics: '/analytics',
  gallery: '/gallery',
  activityLogs: '/activity-logs',
  support: '/support',
  notifications: '/notifications',
  settings: '/settings',
  adminUsers: '/admin-users',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
export type AdminRoute = Exclude<AppRoute, typeof ROUTES.login>;
