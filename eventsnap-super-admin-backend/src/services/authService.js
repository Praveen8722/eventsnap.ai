import bcrypt from 'bcryptjs';
import { accessFor } from '../config/permissions.js';
import { AdminUser } from '../models/index.js';
import { HttpError } from '../utils/HttpError.js';
import { hashToken } from '../utils/secretBox.js';
import { signToken, TOKEN_PURPOSE } from '../utils/tokens.js';
import { recordAudit } from './auditService.js';
import { assertNotLocked, clearFailures, recordFailure } from './loginThrottle.js';
import { toAdminUser } from './mappers.js';

export const PASSWORD_HASH_ROUNDS = 10;
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 200;
const INVALID_CREDENTIALS = 'Invalid email or password.';

// Compared against when the email is unknown so response time does not reveal which accounts exist.
let dummyHash;
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash('not-a-real-password', PASSWORD_HASH_ROUNDS));

export const hashPassword = password => bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

/** The signed-in admin as sent to the UI: the admin plus the areas their role can open. */
export const toSessionUser = admin => ({ ...toAdminUser(admin), access: accessFor(admin.role) });

const failedLogin = (actor, details, ip) =>
  recordAudit({ actor, action: 'LOGIN_FAILED', category: 'auth', target: 'Admin Panel', status: 'failure', details, ip });

/**
 * Signs an admin in with email and password: returns `{ token, user }`. Repeated failures for the
 * email or IP lock sign-in for a while (loginThrottle); every attempt is audited.
 */
export async function login({ email, password }, ip) {
  assertNotLocked({ email, ip });
  const admin = await AdminUser.findOne({ email }).select('+passwordHash').lean();
  const passwordMatches = await bcrypt.compare(password, admin?.passwordHash ?? (await getDummyHash()));

  if (!admin?.passwordHash || !passwordMatches) {
    recordFailure({ email, ip });
    await failedLogin(null, `Failed login attempt for ${email}`, ip);
    throw HttpError.unauthorized(INVALID_CREDENTIALS);
  }

  const { passwordHash: _omit, ...account } = admin;

  if (account.status !== 'active') {
    await failedLogin(account, 'Login attempt for an inactive admin account', ip);
    throw HttpError.forbidden('This admin account is inactive. Contact a Super Admin.');
  }

  const lastLogin = new Date();
  await AdminUser.updateOne({ _id: account._id }, { lastLogin });
  clearFailures({ email: account.email });
  await recordAudit({ actor: account, action: 'LOGIN', category: 'auth', target: 'Admin Panel', details: 'Successful login', ip });
  return {
    token: signToken(account._id, TOKEN_PURPOSE.access, { version: account.tokenVersion ?? 0 }),
    user: toSessionUser({ ...account, lastLogin }),
  };
}

/** Ends every session of the admin: tokens issued before this no longer work. */
export async function logout(admin, ip) {
  await AdminUser.updateOne({ _id: admin._id }, { $inc: { tokenVersion: 1 } });
  await recordAudit({ actor: admin, action: 'LOGOUT', category: 'auth', target: 'Admin Panel', details: 'Signed out', ip });
}

export function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw HttpError.badRequest(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) throw HttpError.badRequest(`Passwords can be at most ${MAX_PASSWORD_LENGTH} characters.`);
  return password;
}

async function findInvite(token, ip) {
  assertNotLocked({ ip });
  const admin = typeof token === 'string' && token.length >= 20 && token.length <= 200
    ? await AdminUser.findOne({ inviteTokenHash: hashToken(token), inviteExpiresAt: { $gt: new Date() } }).lean()
    : null;
  if (!admin) {
    recordFailure({ ip });
    throw HttpError.badRequest('This invite link is invalid or has expired. Ask a Super Admin to send a new one.');
  }
  return admin;
}

/** Who an invite link is for, so the accept page can greet them. */
export async function getInvite(token, ip) {
  const admin = await findInvite(token, ip);
  return { name: admin.name, email: admin.email, role: admin.role };
}

/** Sets the invited admin's password and activates the account; the link stops working. */
export async function acceptInvite({ token, password }, ip) {
  const admin = await findInvite(token, ip);
  validateNewPassword(password);
  const result = await AdminUser.updateOne(
    { _id: admin._id, inviteTokenHash: hashToken(token) },
    {
      passwordHash: await hashPassword(password),
      status: 'active',
      inviteTokenHash: null,
      inviteExpiresAt: null,
      $inc: { tokenVersion: 1 },
    },
  );
  if (result.modifiedCount !== 1) throw HttpError.badRequest('This invite link has already been used.');
  await recordAudit({ actor: admin, action: 'INVITE_ACCEPTED', category: 'admin', target: `${admin.name} (${admin.role})`, details: 'Invite accepted and password set', ip });
  return { email: admin.email };
}
