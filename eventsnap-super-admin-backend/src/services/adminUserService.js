import { ADMIN_ROLES, AdminUser, nextSequence, Role } from '../models/index.js';
import { HttpError } from '../utils/HttpError.js';
import { toDateString } from '../utils/format.js';
import { requireEmail, requireObject, requireOneOf, requireString } from '../utils/validation.js';
import { recordAudit } from './auditService.js';
import { toAdminUser } from './mappers.js';

export async function getAdminUsersData() {
  const [admins, roles] = await Promise.all([
    AdminUser.find().sort({ _id: 1 }).lean(),
    Role.find().sort({ order: 1 }).lean(),
  ]);
  return {
    adminUsers: admins.map(toAdminUser),
    roles: Object.fromEntries(
      roles.map(role => [role._id, { color: role.color, bg: role.bg, permissions: role.permissions }]),
    ),
  };
}

/**
 * Creates an invited admin. The account stays inactive with no password until onboarding
 * (invite email + password setup) completes, which is outside this service's scope.
 */
export async function inviteAdminUser(body, actor, ip) {
  requireObject(body);
  const name = requireString(body.name, 'Name', { maxLength: 100 });
  const email = requireEmail(body.email, 'Email');
  const role = requireOneOf(body.role, 'Role', ADMIN_ROLES);

  if (await AdminUser.exists({ email })) {
    throw HttpError.conflict('An admin user with this email already exists.');
  }

  const seq = await nextSequence('adminUser');
  let admin;
  try {
    admin = await AdminUser.create({
      _id: `ADM${String(seq).padStart(3, '0')}`,
      name,
      email,
      role,
      status: 'inactive',
      joined: toDateString(new Date()),
    });
  } catch (error) {
    // Lost a race with a concurrent invite for the same email.
    if (error?.code === 11000) throw HttpError.conflict('An admin user with this email already exists.');
    throw error;
  }

  await recordAudit({
    actor,
    action: 'ADMIN_CREATED',
    category: 'admin',
    target: `${name} (${role})`,
    details: `Admin user invited with ${role} role`,
    ip,
  });

  return toAdminUser(admin.toObject());
}
