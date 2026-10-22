import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, authToken, onUnauthorized } from '@/services/apiClient';
import { getCurrentUser, logoutSession } from '@/services/authService';
import type { AccessArea, AuthSession, CurrentAdmin } from '@/types';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (authToken.get() ? 'checking' : 'anonymous'));
  const [user, setUser] = useState<CurrentAdmin | null>(null);

  const clearSession = useCallback(() => {
    authToken.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Revokes the token on the server; the local session ends either way (e.g. if offline).
  const logout = useCallback(() => {
    if (authToken.get()) logoutSession().catch(() => {});
    clearSession();
  }, [clearSession]);

  const signIn = useCallback(({ token, user: signedInUser }: AuthSession) => {
    authToken.set(token);
    setUser(signedInUser);
    setStatus('authenticated');
  }, []);

  const retry = useCallback(() => setStatus(authToken.get() ? 'checking' : 'anonymous'), []);

  useEffect(() => onUnauthorized(clearSession), [clearSession]);

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
        if (error instanceof ApiError && error.status === 401) clearSession();
        else setStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, [status, clearSession]);

  const can = useCallback((area: AccessArea) => user?.access.includes(area) ?? false, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, isAuthenticated: status === 'authenticated', user, signIn, logout, retry, can }),
    [status, user, signIn, logout, retry, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
