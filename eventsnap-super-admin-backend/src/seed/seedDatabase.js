import mongoose from 'mongoose';
import { AdminUser, Counter, PlatformSettings, Role, SETTINGS_ID } from '../models/index.js';
import { hashPassword } from '../services/authService.js';
import { adminUsers, roles } from './data/adminUsers.js';
import { generalSettings, toggleSettings } from './data/settings.js';

/**
 * Seeds the ADMIN database only (admin accounts, roles, settings). Platform data — photographers,
 * clients, bookings, payments, storage — is never seeded: it is read live from the EventSnap
 * platform database (PLATFORM_MONGO_URL). Support tickets, notifications and audit logs start
 * empty and fill up as the panel is used.
 */

/** The first Super Admin, used to sign in and invite the rest of the team. */
export const DEMO_ADMIN = Object.freeze({
  _id: 'ADM000',
  name: 'Super Admin',
  email: 'admin@eventsnap.ai',
  role: 'Super Admin',
  status: 'active',
  joined: '2021-11-01',
});

const sequenceNumber = id => Number(String(id).replace(/\D/g, ''));

function buildToggles() {
  return Object.entries(toggleSettings).flatMap(([group, toggles]) =>
    toggles.map(({ key, label, description, value }) => ({ key, group, label, description, value })),
  );
}

/**
 * Replaces all admin-database data. Creates the first Super Admin (`adminEmail`, password
 * `adminPassword`); with `demo`, also the demo team accounts (same password) used in local
 * development and tests.
 */
export async function seedDatabase({ adminPassword, adminEmail = DEMO_ADMIN.email, demo = false }) {
  if (!adminPassword) throw new Error('An admin password is required to seed admin accounts.');
  const passwordHash = await hashPassword(adminPassword);

  await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));

  const team = demo ? adminUsers : [];
  const seededAdmins = [{ ...DEMO_ADMIN, email: adminEmail }, ...team].map(({ id, lastLogin, ...admin }) => ({
    ...admin,
    _id: admin._id ?? id,
    lastLogin: lastLogin ? new Date(lastLogin) : null,
    passwordHash,
  }));

  await Promise.all([
    AdminUser.insertMany(seededAdmins),
    Role.insertMany(Object.entries(roles).map(([name, role], order) => ({ _id: name, ...role, order }))),
    PlatformSettings.create({ _id: SETTINGS_ID, general: generalSettings, toggles: buildToggles() }),
    Counter.insertMany([{ _id: 'adminUser', seq: Math.max(0, ...team.map(admin => sequenceNumber(admin.id))) }]),
  ]);

  return { admins: seededAdmins.length };
}
