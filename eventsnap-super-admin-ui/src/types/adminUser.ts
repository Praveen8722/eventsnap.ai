export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Platform Admin' | 'Support Agent' | 'Finance Admin' | 'Read Only';
  status: 'active' | 'inactive';
  /** ISO timestamp, or null if the admin has never signed in (e.g. a pending invite). */
  lastLogin: string | null;
  joined: string;
  twoFA: boolean;
}

export type AdminRole = AdminUser['role'];

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
