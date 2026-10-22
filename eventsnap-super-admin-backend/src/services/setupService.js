import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AdminUser, Counter, PlatformSettings, Role, SETTINGS_ID } from '../models/index.js';
import { roles } from '../seed/data/adminUsers.js';
import { generalSettings, toggleSettings } from '../seed/data/settings.js';
import { HttpError } from '../utils/HttpError.js';
import { toDateString } from '../utils/format.js';
import { requireEmail, requireObject, requireString } from '../utils/validation.js';
import { recordAudit } from './auditService.js';
import { hashPassword, login, validateNewPassword } from './authService.js';
import { assertNotLocked, recordFailure } from './loginThrottle.js';

/**
 * First-time setup: creates the platform owner's Super Admin account while the admin database has
 * no admins at all. After that the endpoint refuses forever (any admin existing closes it), and
 * further admins can only be invited by a Super Admin.
 *
 * In production, ADMIN_SETUP_TOKEN must be set and given, so nobody who merely finds the API
 * first can claim it; without the token, setup is disabled in production.
 */

/** The first admin always gets this id, so two concurrent setups can't both succeed. */
const FIRST_ADMIN_ID = 'ADM000';

const tokenRequired = () => Boolean(env.adminSetupToken) || env.isProduction;
// Recorded when setup completes, so setup stays closed even if the admin accounts were later
// removed from the database by hand (recover with `npm run seed`).
const SETUP_MARKER = 'setupCompleted';

const setupAvailable = async () =>
  (await AdminUser.countDocuments()) === 0 && !(await Counter.exists({ _id: SETUP_MARKER }));

export async function getSetupStatus() {
  const open = await setupAvailable();
  return {
    setupRequired: open && (!env.isProduction || Boolean(env.adminSetupToken)),
    setupTokenRequired: tokenRequired(),
    // In production with no ADMIN_SETUP_TOKEN configured, setup is off even with no admins.
    setupDisabled: open && env.isProduction && !env.adminSetupToken,
  };
}

const tokensMatch = (given, expected) => {
  const a = crypto.createHash('sha256').update(String(given ?? '')).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
};

/** Roles and platform settings, created if missing (a fresh admin database has neither). */
async function ensureAdminBasics() {
  await Promise.all(
    Object.entries(roles).map(([name, role], order) =>
      Role.updateOne({ _id: name }, { $setOnInsert: { ...role, order } }, { upsert: true }),
    ),
  );
  const toggles = Object.entries(toggleSettings).flatMap(([group, items]) =>
    items.map(({ key, label, description, value }) => ({ key, group, label, description, value })),
  );
  await PlatformSettings.updateOne(
    { _id: SETTINGS_ID },
    { $setOnInsert: { general: generalSettings, toggles } },
    { upsert: true },
  );
}

/** `{ name, email, password, setupToken? }` → the new Super Admin's session `{ token, user }`. */
export async function createFirstSuperAdmin(body, ip) {
  requireObject(body);
  assertNotLocked({ ip });

  if (!(await setupAvailable())) {
    throw HttpError.forbidden('Setup is already complete. Sign in, or ask a Super Admin for an invite.');
  }
  if (env.isProduction && !env.adminSetupToken) {
    throw HttpError.forbidden('First-time setup is disabled. Set ADMIN_SETUP_TOKEN on the server to enable it.');
  }
  if (tokenRequired() && !tokensMatch(body.setupToken, env.adminSetupToken)) {
    recordFailure({ ip });
    throw HttpError.unauthorized('The setup code is not valid.');
  }

  const name = requireString(body.name, 'Name', { maxLength: 100 });
  const email = requireEmail(body.email, 'Email');
  const password = validateNewPassword(body.password);

  await ensureAdminBasics();
  try {
    await AdminUser.create({
      _id: FIRST_ADMIN_ID,
      name,
      email,
      role: 'Super Admin',
      status: 'active',
      joined: toDateString(new Date()),
      passwordHash: await hashPassword(password),
    });
  } catch (error) {
    // Another setup won the race.
    if (error?.code === 11000) throw HttpError.forbidden('Setup is already complete. Sign in, or ask a Super Admin for an invite.');
    throw error;
  }

  await Counter.updateOne({ _id: SETUP_MARKER }, { $setOnInsert: { seq: 1 } }, { upsert: true });
  const admin = await AdminUser.findById(FIRST_ADMIN_ID).lean();
  await recordAudit({ actor: admin, action: 'SETUP_COMPLETED', category: 'admin', target: `${name} (Super Admin)`, details: 'First Super Admin created by first-time setup', ip });
  // Signs the new Super Admin in: `{ token, user }`.
  return login({ email, password }, ip);
}
