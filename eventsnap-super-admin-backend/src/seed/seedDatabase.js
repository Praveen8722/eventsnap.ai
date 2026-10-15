import mongoose from 'mongoose';
import {
  ActivityEvent,
  AdminUser,
  AuditLog,
  Booking,
  Client,
  Counter,
  Notification,
  Photographer,
  PlatformSettings,
  Report,
  REPORT_KEYS,
  Role,
  SETTINGS_ID,
  Subscription,
  SubscriptionPlan,
  SupportTicket,
  Transaction,
} from '../models/index.js';
import { hashPassword } from '../services/authService.js';
import { parseCurrency, parseGigabytes, parseRelativeTime } from '../utils/format.js';
import { logs } from './data/activityLogs.js';
import { adminUsers, roles } from './data/adminUsers.js';
import { eventTypeData, geographicData, radarData, retentionData, userGrowth } from './data/analytics.js';
import { bookings } from './data/bookings.js';
import { clients } from './data/clients.js';
import { recentActivity, revenueData, subscriptionData } from './data/dashboard.js';
import { galleryUsers, storageOverview } from './data/gallery.js';
import { initialNotifications } from './data/notifications.js';
import { monthlyRevenue, transactions } from './data/payments.js';
import { photographers } from './data/photographers.js';
import { generalSettings, toggleSettings } from './data/settings.js';
import { plans, recentSubscribers } from './data/subscriptions.js';
import { tickets } from './data/supportTickets.js';

/** The account used to sign in to the admin panel in development. */
export const DEMO_ADMIN = Object.freeze({
  _id: 'ADM000',
  name: 'Super Admin',
  email: 'admin@eventsnap.ai',
  role: 'Super Admin',
  status: 'active',
  joined: '2021-11-01',
  twoFA: true,
});

const sequenceNumber = id => Number(String(id).replace(/\D/g, ''));
const limitOrNull = value => (value === 'Unlimited' ? null : value);

function buildPhotographers() {
  const galleryById = new Map(galleryUsers.map(user => [user.id, user]));
  return photographers.map(({ id, revenue, storage, ...rest }) => {
    const gallery = galleryById.get(id);
    return {
      ...rest,
      _id: id,
      revenue: parseCurrency(revenue),
      storage: {
        usedGB: gallery?.usedGB ?? parseGigabytes(storage),
        galleries: gallery?.galleries ?? 0,
        files: gallery?.files ?? 0,
        lastUpload: gallery?.lastUpload ?? null,
      },
    };
  });
}

function buildPlans() {
  const chartColorByName = new Map(subscriptionData.map(slice => [slice.name, slice.color]));
  return plans.map(({ id, mrr: _derived, limits, ...plan }, order) => ({
    ...plan,
    _id: id,
    chartColor: chartColorByName.get(plan.name) ?? plan.color,
    popular: plan.popular ?? false,
    limits: {
      bookings: limitOrNull(limits.bookings),
      storageGB: parseGigabytes(limits.storage),
      galleries: limitOrNull(limits.galleries),
      staff: limits.staff,
    },
    order,
  }));
}

function buildSubscriptions() {
  const photographerIdByEmail = new Map(photographers.map(p => [p.email, p.id]));
  return recentSubscribers.map(({ email, status, since, nextBilling }) => {
    const photographer = photographerIdByEmail.get(email);
    if (!photographer) throw new Error(`Seed subscriber ${email} has no matching photographer.`);
    return { photographer, status, since, nextBilling };
  });
}

function buildToggles() {
  return Object.entries(toggleSettings).flatMap(([group, toggles]) =>
    toggles.map(({ key, label, description, value }) => ({ key, group, label, description, value })),
  );
}

/**
 * Replaces all data with the demo dataset. Every seeded admin (including the demo account) gets
 * `adminPassword`; relative timestamps ("3 min ago") are anchored to the time of seeding.
 */
export async function seedDatabase({ adminPassword }) {
  if (!adminPassword) throw new Error('An admin password is required to seed admin accounts.');
  const now = new Date();
  const passwordHash = await hashPassword(adminPassword);

  await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));

  const seededAdmins = [DEMO_ADMIN, ...adminUsers].map(({ id, lastLogin, ...admin }) => ({
    ...admin,
    _id: admin._id ?? id,
    lastLogin: lastLogin ? new Date(lastLogin) : null,
    passwordHash,
  }));

  await Promise.all([
    AdminUser.insertMany(seededAdmins),
    Role.insertMany(Object.entries(roles).map(([name, role], order) => ({ _id: name, ...role, order }))),
    Photographer.insertMany(buildPhotographers()),
    Client.insertMany(clients.map(({ id, totalSpent, ...client }) => ({ ...client, _id: id, totalSpent: parseCurrency(totalSpent) }))),
    Booking.insertMany(bookings.map(({ id, amount, ...booking }) => ({ ...booking, _id: id, amount: parseCurrency(amount) }))),
    Transaction.insertMany(transactions.map(({ id, amount, ...txn }) => ({ ...txn, _id: id, amount: parseCurrency(amount) }))),
    SubscriptionPlan.insertMany(buildPlans()),
    Subscription.insertMany(buildSubscriptions()),
    SupportTicket.insertMany(
      tickets.map(({ id, created, updated, ...ticket }) => ({ ...ticket, _id: id, created: new Date(created), updated: new Date(updated) })),
    ),
    Notification.insertMany(
      initialNotifications.map(({ id, time, ...notification }) => ({ ...notification, _id: id, createdAt: parseRelativeTime(time, now) })),
    ),
    ActivityEvent.insertMany(
      recentActivity.map(({ time, ...event }) => ({ ...event, createdAt: parseRelativeTime(time, now) })),
    ),
    AuditLog.insertMany(logs.map(({ id, timestamp, ...log }) => ({ ...log, _id: id, timestamp: new Date(timestamp) }))),
    PlatformSettings.create({ _id: SETTINGS_ID, general: generalSettings, toggles: buildToggles() }),
    Report.insertMany([
      { _id: REPORT_KEYS.dashboardRevenue, data: revenueData },
      { _id: REPORT_KEYS.paymentsMonthlyRevenue, data: monthlyRevenue },
      { _id: REPORT_KEYS.analyticsUserGrowth, data: userGrowth },
      { _id: REPORT_KEYS.analyticsGeographic, data: geographicData },
      { _id: REPORT_KEYS.analyticsEventTypes, data: eventTypeData },
      { _id: REPORT_KEYS.analyticsRetention, data: retentionData },
      { _id: REPORT_KEYS.analyticsHealth, data: radarData },
      { _id: REPORT_KEYS.storageOverview, data: storageOverview },
    ]),
    Counter.insertMany([
      { _id: 'adminUser', seq: Math.max(...adminUsers.map(admin => sequenceNumber(admin.id))) },
      { _id: 'auditLog', seq: Math.max(...logs.map(log => sequenceNumber(log.id))) },
    ]),
  ]);

  return { admins: seededAdmins.length, photographers: photographers.length };
}
