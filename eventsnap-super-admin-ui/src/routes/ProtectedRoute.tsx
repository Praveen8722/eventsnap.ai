import { Navigate, Outlet, useLocation } from 'react-router';
import { ErrorState } from '@/components/common/ErrorState';
import { PageLoader } from '@/components/common/PageLoader';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute() {
  const { status, retry } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <PageLoader />;
  if (status === 'error') {
    return <ErrorState error={new Error('Unable to verify your session. Make sure the EventSnap API is running.')} onRetry={retry} />;
  }
  if (status !== 'authenticated') {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
