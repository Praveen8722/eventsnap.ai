import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = ['success', 'warning', 'error', 'info'];

const notificationSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    category: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);

/** Platform activity feed shown on the dashboard. */
const activityEventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['info', 'success', 'warning', 'error'], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

activityEventSchema.index({ createdAt: -1 });

export const ActivityEvent = mongoose.model('ActivityEvent', activityEventSchema);
