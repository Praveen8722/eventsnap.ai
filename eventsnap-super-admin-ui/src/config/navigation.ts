import {
  Activity, BarChart3, Bell, Calendar, Camera, CreditCard, Headphones, Image,
  LayoutDashboard, Package, Settings, ShieldCheck, Users, type LucideIcon,
} from 'lucide-react';
import { ROUTES, type AdminRoute } from './routes';

export interface NavItem {
  path: AdminRoute;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ path: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Platform Users',
    items: [
      { path: ROUTES.photographers, label: 'Photographers', icon: Camera, badge: 12 },
      { path: ROUTES.clients, label: 'Clients', icon: Users },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: ROUTES.bookings, label: 'Bookings', icon: Calendar },
      { path: ROUTES.payments, label: 'Payments & Revenue', icon: CreditCard },
      { path: ROUTES.subscriptions, label: 'Subscriptions', icon: Package },
    ],
  },
  {
    label: 'Insights',
    items: [
      { path: ROUTES.analytics, label: 'Analytics & Reports', icon: BarChart3 },
      { path: ROUTES.gallery, label: 'Gallery & Storage', icon: Image },
      { path: ROUTES.activityLogs, label: 'Activity Logs', icon: Activity },
    ],
  },
  {
    label: 'Support & System',
    items: [
      { path: ROUTES.support, label: 'Support Tickets', icon: Headphones, badge: 7 },
      { path: ROUTES.notifications, label: 'Notifications', icon: Bell },
      { path: ROUTES.settings, label: 'Platform Settings', icon: Settings },
      { path: ROUTES.adminUsers, label: 'Admin Users & Roles', icon: ShieldCheck },
    ],
  },
];

export const PAGE_TITLES: Record<AdminRoute, string> = {
  [ROUTES.dashboard]: 'Dashboard Overview',
  [ROUTES.photographers]: 'Photographer Management',
  [ROUTES.clients]: 'Client Management',
  [ROUTES.bookings]: 'Booking Management',
  [ROUTES.payments]: 'Payments & Revenue',
  [ROUTES.subscriptions]: 'Subscriptions & Plans',
  [ROUTES.analytics]: 'Analytics & Reports',
  [ROUTES.gallery]: 'Gallery & Storage',
  [ROUTES.support]: 'Support Tickets',
  [ROUTES.notifications]: 'Notifications',
  [ROUTES.settings]: 'Platform Settings',
  [ROUTES.adminUsers]: 'Admin Users & Roles',
  [ROUTES.activityLogs]: 'Activity / Audit Logs',
};

export const NOT_FOUND_TITLE = 'Page Not Found';

export function getPageTitle(pathname: string): string {
  return PAGE_TITLES[pathname as AdminRoute] ?? NOT_FOUND_TITLE;
}
