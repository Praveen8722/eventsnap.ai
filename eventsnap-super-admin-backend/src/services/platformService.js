import {
  ActivityEvent,
  Booking,
  Client,
  Photographer,
  Report,
  REPORT_KEYS,
  Subscription,
  SubscriptionPlan,
  SupportTicket,
  Transaction,
} from '../models/index.js';
import { formatCurrency } from '../utils/format.js';
import {
  toActivityEvent,
  toBooking,
  toClient,
  toGalleryUser,
  toPhotographer,
  toSubscriptionPlan,
  toTicket,
  toTopPhotographer,
  toTransaction,
} from './mappers.js';

const TOP_PHOTOGRAPHER_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 6;
const RECENT_SUBSCRIBER_LIMIT = 10;

/** Loads report snapshots by key; missing reports resolve to `fallback` so pages still render. */
async function getReports(keys, fallback = []) {
  const docs = await Report.find({ _id: { $in: keys } }).lean();
  const byKey = new Map(docs.map(doc => [doc._id, doc.data]));
  return keys.map(key => byKey.get(key) ?? fallback);
}

export async function getDashboardData() {
  const [[revenueData], plans, topPhotographers, activity] = await Promise.all([
    getReports([REPORT_KEYS.dashboardRevenue]),
    SubscriptionPlan.find().sort({ order: 1 }).lean(),
    Photographer.find({ status: 'active' }).sort({ bookings: -1, _id: 1 }).limit(TOP_PHOTOGRAPHER_LIMIT).lean(),
    ActivityEvent.find().sort({ createdAt: -1 }).limit(RECENT_ACTIVITY_LIMIT).lean(),
  ]);
  const now = new Date();
  return {
    revenueData,
    subscriptionData: plans.map(plan => ({ name: plan.name, value: plan.subscribers, color: plan.chartColor })),
    topPhotographers: topPhotographers.map(toTopPhotographer),
    recentActivity: activity.map(event => toActivityEvent(event, now)),
  };
}

export async function listPhotographers() {
  return (await Photographer.find().sort({ _id: 1 }).lean()).map(toPhotographer);
}

export async function listClients() {
  return (await Client.find().sort({ _id: 1 }).lean()).map(toClient);
}

export async function listBookings() {
  return (await Booking.find().sort({ createdAt: -1, _id: -1 }).lean()).map(toBooking);
}

export async function listSupportTickets() {
  return (await SupportTicket.find().sort({ created: -1 }).lean()).map(toTicket);
}

export async function getPaymentsData() {
  const [[monthlyRevenue], transactions] = await Promise.all([
    getReports([REPORT_KEYS.paymentsMonthlyRevenue]),
    Transaction.find().sort({ date: -1, _id: -1 }).lean(),
  ]);
  return { monthlyRevenue, transactions: transactions.map(toTransaction) };
}

export async function getSubscriptionsData() {
  const [plans, subscriptions] = await Promise.all([
    SubscriptionPlan.find().sort({ order: 1 }).lean(),
    Subscription.find().sort({ since: -1 }).limit(RECENT_SUBSCRIBER_LIMIT).populate('photographer').lean(),
  ]);
  const priceByPlan = new Map(plans.map(plan => [plan.name, plan.price]));
  return {
    plans: plans.map(toSubscriptionPlan),
    recentSubscribers: subscriptions
      .filter(sub => sub.photographer)
      .map(({ photographer, status, since, nextBilling }) => ({
        name: photographer.name,
        plan: photographer.plan,
        email: photographer.email,
        since,
        status,
        nextBilling,
        amount: formatCurrency(priceByPlan.get(photographer.plan) ?? 0),
      })),
  };
}

export async function getAnalyticsData() {
  const [userGrowth, geographicData, eventTypeData, retentionData, radarData] = await getReports([
    REPORT_KEYS.analyticsUserGrowth,
    REPORT_KEYS.analyticsGeographic,
    REPORT_KEYS.analyticsEventTypes,
    REPORT_KEYS.analyticsRetention,
    REPORT_KEYS.analyticsHealth,
  ]);
  return { userGrowth, geographicData, eventTypeData, retentionData, radarData };
}

const EMPTY_STORAGE_OVERVIEW = { totalAllocated: 0, totalUsed: 0, totalFiles: 0, avgPerPhotographer: 0 };

export async function getGalleryStorageData() {
  const [[storageOverview], plans, photographers] = await Promise.all([
    getReports([REPORT_KEYS.storageOverview], EMPTY_STORAGE_OVERVIEW),
    SubscriptionPlan.find({}, { name: 1, 'limits.storageGB': 1 }).lean(),
    Photographer.find({ 'storage.usedGB': { $gt: 0 } }).sort({ 'storage.usedGB': -1 }).lean(),
  ]);
  const limitByPlan = new Map(plans.map(plan => [plan.name, plan.limits.storageGB]));
  return {
    storageOverview,
    galleryUsers: photographers.map(doc => toGalleryUser(doc, limitByPlan.get(doc.plan) ?? 0)),
  };
}
