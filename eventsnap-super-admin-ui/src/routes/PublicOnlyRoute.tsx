import { Navigate, Outlet, useLocation } from 'react-router';
import { PageLoader } from '@/components/common/PageLoader';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';

export function PublicOnlyRoute() {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <PageLoader />;
  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from ?? ROUTES.dashboard;
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
}
