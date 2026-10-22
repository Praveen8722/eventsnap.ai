export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Platform Admin' | 'Support Agent' | 'Finance Admin' | 'Read Only';
  status: 'active' | 'inactive';
  /** ISO timestamp, or null if the admin has never signed in (e.g. a pending invite). */
  lastLogin: string | null;
  joined: string;
  /** An invite that hasn't been accepted yet. */
  invitePending: boolean;
  inviteExpiresAt: string | null;
}

export type AdminRole = AdminUser['role'];

/** Areas of the panel a role can open (mirrors the API's config/permissions.js). */
export type AccessArea =
  | 'dashboard' | 'photographers' | 'clients' | 'bookings' | 'payments' | 'subscriptions' | 'analytics'
  | 'gallery' | 'activityLogs' | 'support' | 'notifications' | 'settings' | 'settingsEdit' | 'adminUsers';

/** The signed-in admin. */
export interface CurrentAdmin extends AdminUser {
  access: AccessArea[];
}

export interface RoleDefinition {
  color: string;
  bg: string;
  permissions: string[];
}

export interface AdminUsersData {
  adminUsers: AdminUser[];
  roles: Record<AdminRole, RoleDefinition>;
}

export type NewAdminUser = Pick<AdminUser, 'name' | 'email' | 'role'>;

/** Returned when inviting (or re-inviting) an admin: the one-time link to send them. */
export interface InvitedAdminUser extends AdminUser {
  inviteUrl: string;
}

export type AdminUserUpdate = Partial<Pick<AdminUser, 'role' | 'status'>>;
