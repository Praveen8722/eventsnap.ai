import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { ROUTE_AREAS } from '@/config/navigation';
import { ROUTES, type AdminRoute } from '@/config/routes';
import { AdminLayout } from '@/layouts/AdminLayout';
import AcceptInvitePage from '@/pages/AcceptInvitePage';
import LoginPage from '@/pages/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';
import { RequireAccess } from './RequireAccess';

const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const PAGES: Record<AdminRoute, LazyExoticComponent<ComponentType>> = {
  [ROUTES.dashboard]: lazy(() => import('@/pages/DashboardPage')),
  [ROUTES.photographers]: lazy(() => import('@/pages/PhotographersPage')),
  [ROUTES.clients]: lazy(() => import('@/pages/ClientsPage')),
  [ROUTES.bookings]: lazy(() => import('@/pages/BookingsPage')),
  [ROUTES.payments]: lazy(() => import('@/pages/PaymentsPage')),
  [ROUTES.subscriptions]: lazy(() => import('@/pages/SubscriptionsPage')),
  [ROUTES.analytics]: lazy(() => import('@/pages/AnalyticsPage')),
  [ROUTES.gallery]: lazy(() => import('@/pages/GalleryStoragePage')),
  [ROUTES.activityLogs]: lazy(() => import('@/pages/ActivityLogsPage')),
  [ROUTES.support]: lazy(() => import('@/pages/SupportTicketsPage')),
  [ROUTES.notifications]: lazy(() => import('@/pages/NotificationsPage')),
  [ROUTES.settings]: lazy(() => import('@/pages/SettingsPage')),
  [ROUTES.adminUsers]: lazy(() => import('@/pages/AdminUsersPage')),
};

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [{ path: ROUTES.login, element: <LoginPage /> }],
  },
  { path: ROUTES.acceptInvite, element: <AcceptInvitePage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to={ROUTES.dashboard} replace /> },
          ...(Object.entries(PAGES) as [AdminRoute, LazyExoticComponent<ComponentType>][]).map(([path, Page]) => ({
            path,
            element: (
              <RequireAccess area={ROUTE_AREAS[path]}>
                <Page />
              </RequireAccess>
            ),
          })),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
