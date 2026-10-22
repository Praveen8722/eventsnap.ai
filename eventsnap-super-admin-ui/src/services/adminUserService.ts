import type { AdminUser, AdminUsersData, AdminUserUpdate, InvitedAdminUser, NewAdminUser } from '@/types';
import { apiRequest } from './apiClient';

export function getAdminUsersData(): Promise<AdminUsersData> {
  return apiRequest('/admin-users');
}

/** Invites an admin; returns the one-time invite link to send them. */
export function inviteAdminUser(newUser: NewAdminUser): Promise<InvitedAdminUser> {
  return apiRequest('/admin-users', { method: 'POST', body: newUser });
}

export function updateAdminUser(id: string, update: AdminUserUpdate): Promise<AdminUser> {
  return apiRequest(`/admin-users/${encodeURIComponent(id)}`, { method: 'PATCH', body: update });
}

export function resendInvite(id: string): Promise<InvitedAdminUser> {
  return apiRequest(`/admin-users/${encodeURIComponent(id)}/invite`, { method: 'POST' });
}

export function removeAdminUser(id: string): Promise<void> {
  return apiRequest(`/admin-users/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
