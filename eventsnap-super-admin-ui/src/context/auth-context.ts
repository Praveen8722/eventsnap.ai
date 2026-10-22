import { createContext } from 'react';
import type { AccessArea, AuthSession, CurrentAdmin } from '@/types';

/**
 * - `checking`: a stored token is being verified with the API.
 * - `error`: the token could not be verified because the API was unreachable.
 */
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  isAuthenticated: boolean;
  user: CurrentAdmin | null;
  /** Stores a session returned by the login / setup endpoints. */
  signIn: (session: AuthSession) => void;
  /** Ends the session on the server, then locally. */
  logout: () => void;
  /** Re-verifies the stored token after an `error` status. */
  retry: () => void;
  /** Whether the signed-in admin's role can open an area of the panel. */
  can: (area: AccessArea) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
