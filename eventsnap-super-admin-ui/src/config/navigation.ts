import {
  Activity, BarChart3, Bell, Calendar, Camera, CreditCard, Headphones, Image,
  LayoutDashboard, Package, Settings, ShieldCheck, Users, type LucideIcon,
} from 'lucide-react';
import type { AccessArea } from '@/types';
import { ROUTES, type AdminRoute } from './routes';

export interface NavItem {
  path: AdminRoute;
  label: string;
  icon: LucideIcon;
  /** The area the admin's role needs to see this item (see AuthContextValue.can). */
  area: AccessArea;
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ path: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard, area: 'dashboard' }],
  },
  {
    label: 'Platform Users',
    items: [
      { path: ROUTES.photographers, label: 'Photographers', icon: Camera, area: 'photographers' },
      { path: ROUTES.clients, label: 'Clients', icon: Users, area: 'clients' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: ROUTES.bookings, label: 'Bookings', icon: Calendar, area: 'bookings' },
      { path: ROUTES.payments, label: 'Payments & Revenue', icon: CreditCard, area: 'payments' },
      { path: ROUTES.subscriptions, label: 'Subscriptions', icon: Package, area: 'subscriptions' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { path: ROUTES.analytics, label: 'Analytics & Reports', icon: BarChart3, area: 'analytics' },
      { path: ROUTES.gallery, label: 'Gallery & Storage', icon: Image, area: 'gallery' },
      { path: ROUTES.activityLogs, label: 'Activity Logs', icon: Activity, area: 'activityLogs' },
    ],
  },
  {
    label: 'Support & System',
    items: [
      { path: ROUTES.support, label: 'Support Tickets', icon: Headphones, area: 'support' },
      { path: ROUTES.notifications, label: 'Notifications', icon: Bell, area: 'notifications' },
      { path: ROUTES.settings, label: 'Platform Settings', icon: Settings, area: 'settings' },
      { path: ROUTES.adminUsers, label: 'Admin Users & Roles', icon: ShieldCheck, area: 'adminUsers' },
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

/** The area each page belongs to, for route guards. */
export const ROUTE_AREAS: Record<AdminRoute, AccessArea> = Object.fromEntries(
  NAV_GROUPS.flatMap(group => group.items.map(item => [item.path, item.area])),
) as Record<AdminRoute, AccessArea>;

export function getPageTitle(pathname: string): string {
  return PAGE_TITLES[pathname as AdminRoute] ?? NOT_FOUND_TITLE;
}
