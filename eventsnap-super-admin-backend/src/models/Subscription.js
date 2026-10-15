import mongoose from 'mongoose';
import { PLAN_NAMES } from './Photographer.js';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, enum: PLAN_NAMES, required: true, unique: true },
    price: { type: Number, required: true, min: 0 },
    annualPrice: { type: Number, required: true, min: 0 },
    color: { type: String, required: true },
    bg: { type: String, required: true },
    // Slice color in the dashboard's plan-distribution chart.
    chartColor: { type: String, required: true },
    subscribers: { type: Number, default: 0, min: 0 },
    growth: { type: String, default: '0%' },
    popular: { type: Boolean, default: false },
    features: { type: [String], default: [] },
    limits: {
      // null means unlimited.
      bookings: { type: Number, default: null },
      storageGB: { type: Number, required: true },
      galleries: { type: Number, default: null },
      staff: { type: Number, required: true },
    },
    order: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

const subscriptionSchema = new mongoose.Schema(
  {
    photographer: { type: String, ref: 'Photographer', required: true, unique: true },
    status: { type: String, enum: ['active', 'trial', 'past_due'], required: true },
    since: { type: String, required: true },
    nextBilling: { type: String, required: true },
  },
  { versionKey: false },
);

subscriptionSchema.index({ since: -1 });

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
