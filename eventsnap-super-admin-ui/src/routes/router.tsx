import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { ROUTES } from '@/config/routes';
import { AdminLayout } from '@/layouts/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const PhotographersPage = lazy(() => import('@/pages/PhotographersPage'));
const ClientsPage = lazy(() => import('@/pages/ClientsPage'));
const BookingsPage = lazy(() => import('@/pages/BookingsPage'));
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'));
const SubscriptionsPage = lazy(() => import('@/pages/SubscriptionsPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const GalleryStoragePage = lazy(() => import('@/pages/GalleryStoragePage'));
const ActivityLogsPage = lazy(() => import('@/pages/ActivityLogsPage'));
const SupportTicketsPage = lazy(() => import('@/pages/SupportTicketsPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const AdminUsersPage = lazy(() => import('@/pages/AdminUsersPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [{ path: ROUTES.login, element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to={ROUTES.dashboard} replace /> },
          { path: ROUTES.dashboard, element: <DashboardPage /> },
          { path: ROUTES.photographers, element: <PhotographersPage /> },
          { path: ROUTES.clients, element: <ClientsPage /> },
          { path: ROUTES.bookings, element: <BookingsPage /> },
          { path: ROUTES.payments, element: <PaymentsPage /> },
          { path: ROUTES.subscriptions, element: <SubscriptionsPage /> },
          { path: ROUTES.analytics, element: <AnalyticsPage /> },
          { path: ROUTES.gallery, element: <GalleryStoragePage /> },
          { path: ROUTES.activityLogs, element: <ActivityLogsPage /> },
          { path: ROUTES.support, element: <SupportTicketsPage /> },
          { path: ROUTES.notifications, element: <NotificationsPage /> },
          { path: ROUTES.settings, element: <SettingsPage /> },
          { path: ROUTES.adminUsers, element: <AdminUsersPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
