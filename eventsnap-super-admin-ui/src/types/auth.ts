import type { CurrentAdmin } from './adminUser';

export interface AuthSession {
  token: string;
  user: CurrentAdmin;
}

/** First-time setup: whether the first Super Admin still has to be created. */
export interface SetupStatus {
  setupRequired: boolean;
  setupTokenRequired: boolean;
  /** No admin exists, but setup is turned off on this server (production without ADMIN_SETUP_TOKEN). */
  setupDisabled: boolean;
}

export interface FirstAdminSetup {
  name: string;
  email: string;
  password: string;
  setupToken?: string;
}

export interface InviteInfo {
  name: string;
  email: string;
  role: string;
}
