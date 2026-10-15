import mongoose from 'mongoose';

/**
 * Pre-aggregated platform metrics (time series and rollups) that cannot be derived from the
 * entity collections alone, e.g. monthly revenue history. Produced by reporting jobs or the seed.
 */
export const REPORT_KEYS = Object.freeze({
  dashboardRevenue: 'dashboard.revenue',
  paymentsMonthlyRevenue: 'payments.monthlyRevenue',
  analyticsUserGrowth: 'analytics.userGrowth',
  analyticsGeographic: 'analytics.geographic',
  analyticsEventTypes: 'analytics.eventTypes',
  analyticsRetention: 'analytics.retention',
  analyticsHealth: 'analytics.health',
  storageOverview: 'storage.overview',
});

const reportSchema = new mongoose.Schema(
  {
    _id: { type: String, enum: Object.values(REPORT_KEYS) },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export const Report = mongoose.model('Report', reportSchema);

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Counter = mongoose.model('Counter', counterSchema);

/** Atomically increments and returns the next value of a named sequence. */
export async function nextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  return counter.seq;
}
