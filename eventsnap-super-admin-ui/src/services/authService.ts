import type { AuthSession, CurrentAdmin, FirstAdminSetup, InviteInfo, SetupStatus } from '@/types';
import { apiRequest } from './apiClient';

/** Signs in with email and password. */
export function login(email: string, password: string): Promise<AuthSession> {
  return apiRequest('/auth/login', { method: 'POST', body: { email, password } });
}

export function getSetupStatus(): Promise<SetupStatus> {
  return apiRequest('/auth/setup');
}

/** Creates the first Super Admin (only while no admin exists) and signs them in. */
export function setupFirstAdmin(setup: FirstAdminSetup): Promise<AuthSession> {
  return apiRequest('/auth/setup', { method: 'POST', body: setup });
}

export async function getCurrentUser(): Promise<CurrentAdmin> {
  const { user } = await apiRequest<{ user: CurrentAdmin }>('/auth/me');
  return user;
}

/** Ends the session on the server (every token issued to this admin stops working). */
export function logoutSession(): Promise<void> {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export function getInvite(token: string): Promise<InviteInfo> {
  return apiRequest('/auth/invite', { method: 'POST', body: { token } });
}

export function acceptInvite(token: string, password: string): Promise<{ email: string }> {
  return apiRequest('/auth/accept-invite', { method: 'POST', body: { token, password } });
}
