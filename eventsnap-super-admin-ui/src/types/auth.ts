import type { AdminUser } from './adminUser';

export interface AuthSession {
  token: string;
  user: AdminUser;
}

export type LoginResult =
  | { twoFactorRequired: true; challengeToken: string }
  | ({ twoFactorRequired: false } & AuthSession);
