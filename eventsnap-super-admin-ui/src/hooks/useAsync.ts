import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; data: T };

export interface AsyncResult<T> {
  state: AsyncState<T>;
  reload: () => void;
}

/**
 * Runs `fetcher` on mount and whenever `reload` is called, tracking loading/error/success.
 * `fetcher` must be referentially stable, e.g. a module-level service function.
 */
export function useAsync<T>(fetcher: () => Promise<T>): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState(current => (current.status === 'loading' ? current : { status: 'loading' }));
    fetcher().then(
      data => {
        if (active) setState({ status: 'success', data });
      },
      (error: unknown) => {
        if (active) setState({ status: 'error', error });
      },
    );
    return () => {
      active = false;
    };
  }, [fetcher, attempt]);

  const reload = useCallback(() => setAttempt(n => n + 1), []);

  return { state, reload };
}
