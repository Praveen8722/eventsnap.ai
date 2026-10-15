import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, authToken, onUnauthorized } from '@/services/apiClient';
import { getCurrentUser } from '@/services/authService';
import type { AdminUser, AuthSession } from '@/types';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (authToken.get() ? 'checking' : 'anonymous'));
  const [user, setUser] = useState<AdminUser | null>(null);

  const logout = useCallback(() => {
    authToken.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const signIn = useCallback(({ token, user: signedInUser }: AuthSession) => {
    authToken.set(token);
    setUser(signedInUser);
    setStatus('authenticated');
  }, []);

  const retry = useCallback(() => setStatus(authToken.get() ? 'checking' : 'anonymous'), []);

  useEffect(() => onUnauthorized(logout), [logout]);

  useEffect(() => {
    if (status !== 'checking') return;
    let active = true;
    getCurrentUser().then(
      currentUser => {
        if (!active) return;
        setUser(currentUser);
        setStatus('authenticated');
      },
      (error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) logout();
        else setStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, [status, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, isAuthenticated: status === 'authenticated', user, signIn, logout, retry }),
    [status, user, signIn, logout, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
