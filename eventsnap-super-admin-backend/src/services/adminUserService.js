import { env } from '../config/env.js';
import { ADMIN_ROLES, AdminUser, nextSequence, Role } from '../models/index.js';
import { HttpError } from '../utils/HttpError.js';
import { toDateString } from '../utils/format.js';
import { hashToken, randomToken } from '../utils/secretBox.js';
import { requireEmail, requireObject, requireOneOf, requireString } from '../utils/validation.js';
import { recordAudit } from './auditService.js';
import { toAdminUser } from './mappers.js';

const INVITE_TTL_MS = 72 * 3_600_000;

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

/** A new one-time invite token: stored hashed, returned once as a link to the admin UI. */
function newInvite() {
  const token = randomToken();
  return {
    fields: { inviteTokenHash: hashToken(token), inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS) },
    inviteUrl: `${env.adminUiUrl}/accept-invite?token=${encodeURIComponent(token)}`,
  };
}

/**
 * Creates an invited admin: inactive, no password, and a one-time link (valid 72 hours) for them
 * to set a password. The link is returned to the inviting Super Admin to send; it isn't emailed.
 */
export async function inviteAdminUser(body, actor, ip) {
  requireObject(body);
  const name = requireString(body.name, 'Name', { maxLength: 100 });
  const email = requireEmail(body.email, 'Email');
  const role = requireOneOf(body.role, 'Role', ADMIN_ROLES);

  if (await AdminUser.exists({ email })) {
    throw HttpError.conflict('An admin user with this email already exists.');
  }

  const invite = newInvite();
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
      ...invite.fields,
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

  return { ...toAdminUser(admin.toObject()), inviteUrl: invite.inviteUrl };
}

async function findAdmin(id) {
  const admin = await AdminUser.findById(String(id)).lean();
  if (!admin) throw HttpError.notFound('Admin user not found.');
  return admin;
}

/** Refuses changes that would leave the platform without an active Super Admin. */
async function assertKeepsASuperAdmin(admin, { role, status }) {
  const stillSuper = (role ?? admin.role) === 'Super Admin' && (status ?? admin.status) === 'active';
  if (admin.role !== 'Super Admin' || admin.status !== 'active' || stillSuper) return;
  const others = await AdminUser.countDocuments({ _id: { $ne: admin._id }, role: 'Super Admin', status: 'active' });
  if (others === 0) throw HttpError.conflict('At least one active Super Admin is required.');
}

/** Issues a fresh invite link for an admin who hasn't accepted yet (the old link stops working). */
export async function resendInvite(id, actor, ip) {
  const admin = await findAdmin(id);
  const current = await AdminUser.findById(admin._id).select('+passwordHash').lean();
  if (current.passwordHash) throw HttpError.conflict('This admin has already accepted their invite.');
  const invite = newInvite();
  await AdminUser.updateOne({ _id: admin._id }, invite.fields);
  await recordAudit({ actor, action: 'INVITE_RESENT', category: 'admin', target: `${admin.name} (${admin.role})`, details: 'New invite link issued', ip });
  return { ...toAdminUser({ ...admin, ...invite.fields }), inviteUrl: invite.inviteUrl };
}

/** `{ role?, status? }`. Changing role or status signs the admin out everywhere. */
export async function updateAdminUser(id, body, actor, ip) {
  requireObject(body);
  const admin = await findAdmin(id);
  const changes = {};
  if (body.role !== undefined) changes.role = requireOneOf(body.role, 'Role', ADMIN_ROLES);
  if (body.status !== undefined) changes.status = requireOneOf(body.status, 'Status', ['active', 'inactive']);
  if (Object.keys(changes).length === 0) throw HttpError.badRequest('Nothing to update.');

  if (admin._id === actor._id && (('role' in changes && changes.role !== admin.role) || changes.status === 'inactive')) {
    throw HttpError.conflict('You cannot change your own role or deactivate yourself.');
  }
  if (changes.status === 'active') {
    const current = await AdminUser.findById(admin._id).select('+passwordHash').lean();
    if (!current.passwordHash) throw HttpError.conflict('This admin has not accepted their invite yet.');
  }
  await assertKeepsASuperAdmin(admin, changes);

  const described = Object.entries(changes).filter(([key, value]) => admin[key] !== value);
  if (described.length === 0) return toAdminUser(admin);

  const revoke = described.some(([key]) => key === 'role' || key === 'status');
  const updated = await AdminUser.findByIdAndUpdate(
    admin._id,
    { ...changes, ...(revoke ? { $inc: { tokenVersion: 1 } } : {}) },
    { returnDocument: 'after' },
  ).lean();

  await recordAudit({
    actor,
    action: 'ADMIN_UPDATED',
    category: 'admin',
    target: `${admin.name} (${updated.role})`,
    details: `Updated ${described.map(([key, value]) => `${key}: ${admin[key]} → ${value}`).join('; ')}`,
    ip,
  });
  return toAdminUser(updated);
}

export async function deleteAdminUser(id, actor, ip) {
  const admin = await findAdmin(id);
  if (admin._id === actor._id) throw HttpError.conflict('You cannot remove your own account.');
  await assertKeepsASuperAdmin(admin, { status: 'inactive' });
  await AdminUser.deleteOne({ _id: admin._id });
  await recordAudit({ actor, action: 'ADMIN_REMOVED', category: 'admin', target: `${admin.name} (${admin.role})`, details: 'Admin user removed', ip });
}
