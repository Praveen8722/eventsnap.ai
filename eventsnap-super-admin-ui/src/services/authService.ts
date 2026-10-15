import type { AdminUser, AuthSession, LoginResult } from '@/types';
import { apiRequest } from './apiClient';

export function login(email: string, password: string): Promise<LoginResult> {
  return apiRequest('/auth/login', { method: 'POST', body: { email, password } });
}

export function verifyTwoFactor(challengeToken: string, code: string): Promise<AuthSession> {
  return apiRequest('/auth/2fa', { method: 'POST', body: { challengeToken, code } });
}

export async function getCurrentUser(): Promise<AdminUser> {
  const { user } = await apiRequest<{ user: AdminUser }>('/auth/me');
  return user;
}
