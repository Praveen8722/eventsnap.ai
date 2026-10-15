import type { ReactNode } from 'react';
import type { AsyncResult } from '@/hooks/useAsync';
import { ErrorState } from './ErrorState';
import { PageLoader } from './PageLoader';

interface AsyncBoundaryProps<T> {
  result: AsyncResult<T>;
  children: (data: T) => ReactNode;
}

/** Renders a loader while data is loading, an error state on failure, and `children(data)` on success. */
export function AsyncBoundary<T>({ result, children }: AsyncBoundaryProps<T>) {
  const { state, reload } = result;

  if (state.status === 'loading') return <PageLoader />;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={reload} />;
  return <>{children(state.data)}</>;
}
