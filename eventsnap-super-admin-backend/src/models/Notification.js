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
    // Dismissed notifications are kept (hidden) so alerts derived from platform data aren't
    // raised again by the next sync.
    dismissed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
