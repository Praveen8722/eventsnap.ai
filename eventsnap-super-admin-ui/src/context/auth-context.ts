import { createContext } from 'react';
import type { AdminUser, AuthSession } from '@/types';

/**
 * - `checking`: a stored token is being verified with the API.
 * - `error`: the token could not be verified because the API was unreachable.
 */
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  isAuthenticated: boolean;
  user: AdminUser | null;
  /** Stores a session returned by the login / 2FA endpoints. */
  signIn: (session: AuthSession) => void;
  logout: () => void;
  /** Re-verifies the stored token after an `error` status. */
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
