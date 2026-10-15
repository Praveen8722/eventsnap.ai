import type { AdminUser, AdminUsersData, NewAdminUser } from '@/types';
import { apiRequest } from './apiClient';

export function getAdminUsersData(): Promise<AdminUsersData> {
  return apiRequest('/admin-users');
}

/** Invites an admin; the account stays inactive until they complete onboarding. */
export function inviteAdminUser(newUser: NewAdminUser): Promise<AdminUser> {
  return apiRequest('/admin-users', { method: 'POST', body: newUser });
}
