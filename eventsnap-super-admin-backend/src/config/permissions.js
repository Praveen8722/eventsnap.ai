/**
 * Which admin roles may use each area of the admin panel, following the permissions each role is
 * described with (seed/data/adminUsers.js). Enforced on every API route (middlewares/auth.js) and
 * sent to the UI (as `access` on the signed-in user) so it can hide what a role can't open.
 */

const SUPER = 'Super Admin';
const PLATFORM = 'Platform Admin';
const SUPPORT = 'Support Agent';
const FINANCE = 'Finance Admin';
const READ_ONLY = 'Read Only';

export const ACCESS = Object.freeze({
  dashboard: [SUPER, PLATFORM, SUPPORT, FINANCE, READ_ONLY],
  photographers: [SUPER, PLATFORM, SUPPORT, READ_ONLY],
  clients: [SUPER, PLATFORM],
  bookings: [SUPER, PLATFORM, SUPPORT],
  payments: [SUPER, FINANCE],
  subscriptions: [SUPER, FINANCE],
  analytics: [SUPER, PLATFORM, FINANCE, READ_ONLY],
  gallery: [SUPER, PLATFORM, SUPPORT],
  activityLogs: [SUPER, PLATFORM],
  support: [SUPER, PLATFORM, SUPPORT],
  notifications: [SUPER, PLATFORM, SUPPORT, FINANCE, READ_ONLY],
  settings: [SUPER, PLATFORM],
  settingsEdit: [SUPER],
  adminUsers: [SUPER],
});

export const canAccess = (role, area) => ACCESS[area]?.includes(role) ?? false;

/** The areas a role can open, e.g. ["dashboard", "photographers", ...]. */
export const accessFor = role => Object.keys(ACCESS).filter(area => canAccess(role, area));
