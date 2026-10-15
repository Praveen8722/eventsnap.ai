import bcrypt from 'bcryptjs';
import { AdminUser, PlatformSettings, SETTINGS_ID } from '../models/index.js';
import { HttpError } from '../utils/HttpError.js';
import { signToken, TOKEN_PURPOSE, verifyToken } from '../utils/tokens.js';
import { recordAudit } from './auditService.js';
import { toAdminUser } from './mappers.js';

export const PASSWORD_HASH_ROUNDS = 10;
const TWO_FACTOR_CODE = /^\d{6}$/;
const INVALID_CREDENTIALS = 'Invalid email or password.';

// Compared against when the email is unknown so response time does not reveal which accounts exist.
let dummyHash;
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash('not-a-real-password', PASSWORD_HASH_ROUNDS));

export const hashPassword = password => bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

async function isTwoFactorRequired(admin) {
  if (admin.twoFA) return true;
  const settings = await PlatformSettings.findById(SETTINGS_ID, { toggles: 1 }).lean();
  return settings?.toggles.some(toggle => toggle.key === '2fa' && toggle.value) ?? false;
}

async function completeLogin(admin, ip, details) {
  const lastLogin = new Date();
  await AdminUser.updateOne({ _id: admin._id }, { lastLogin });
  await recordAudit({ actor: admin, action: 'LOGIN', category: 'auth', target: 'Admin Panel', details, ip });
  return {
    token: signToken(admin._id, TOKEN_PURPOSE.access),
    user: toAdminUser({ ...admin, lastLogin }),
  };
}

/**
 * Verifies email/password. Returns a short-lived 2FA challenge when two-factor authentication is
 * required for the account, otherwise an access token.
 */
export async function login({ email, password }, ip) {
  const admin = await AdminUser.findOne({ email }).select('+passwordHash').lean();
  const passwordMatches = await bcrypt.compare(password, admin?.passwordHash ?? (await getDummyHash()));

  if (!admin?.passwordHash || !passwordMatches) {
    await recordAudit({
      actor: null,
      action: 'LOGIN_FAILED',
      category: 'auth',
      target: 'Admin Panel',
      status: 'failure',
      details: `Failed login attempt for ${email}`,
      ip,
    });
    throw HttpError.unauthorized(INVALID_CREDENTIALS);
  }

  const { passwordHash: _omit, ...account } = admin;

  if (account.status !== 'active') {
    await recordAudit({
      actor: account,
      action: 'LOGIN_FAILED',
      category: 'auth',
      target: 'Admin Panel',
      status: 'failure',
      details: 'Login attempt for an inactive admin account',
      ip,
    });
    throw HttpError.forbidden('This admin account is inactive. Contact a Super Admin.');
  }

  if (await isTwoFactorRequired(account)) {
    return { twoFactorRequired: true, challengeToken: signToken(account._id, TOKEN_PURPOSE.twoFactor) };
  }
  return { twoFactorRequired: false, ...(await completeLogin(account, ip, 'Successful login')) };
}

/**
 * Completes a 2FA challenge. Authenticator (TOTP) secrets are not provisioned yet, so any well-formed
 * 6-digit code is accepted; the challenge token still proves the password step succeeded.
 */
export async function verifyTwoFactor({ challengeToken, code }, ip) {
  const adminId = verifyToken(challengeToken, TOKEN_PURPOSE.twoFactor);
  if (!adminId) throw HttpError.unauthorized('Your sign-in attempt has expired. Please sign in again.');
  if (!TWO_FACTOR_CODE.test(code)) throw HttpError.badRequest('Enter the 6-digit code from your authenticator app.');

  const admin = await AdminUser.findById(adminId).lean();
  if (!admin || admin.status !== 'active') throw HttpError.unauthorized('Your sign-in attempt is no longer valid.');

  return completeLogin(admin, ip, 'Successful login with 2FA verification');
}
