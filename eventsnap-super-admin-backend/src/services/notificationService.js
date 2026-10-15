import { Notification } from '../models/index.js';
import { HttpError } from '../utils/HttpError.js';
import { toNotification, toNotificationAlert } from './mappers.js';

const ALERT_LIMIT = 5;

export async function getNotificationsData() {
  const docs = await Notification.find().sort({ createdAt: -1 }).lean();
  const now = new Date();
  const categories = [...new Set(docs.map(doc => doc.category))];
  return {
    notifications: docs.map(doc => toNotification(doc, now)),
    categories: ['All', ...categories],
  };
}

export async function getRecentAlerts() {
  const docs = await Notification.find().sort({ createdAt: -1 }).limit(ALERT_LIMIT).lean();
  const now = new Date();
  return docs.map(doc => toNotificationAlert(doc, now));
}

export async function markNotificationRead(id) {
  const doc = await Notification.findByIdAndUpdate(id, { read: true }, { returnDocument: 'after' }).lean();
  if (!doc) throw HttpError.notFound('Notification not found.');
  return toNotification(doc);
}

export async function markAllNotificationsRead() {
  const result = await Notification.updateMany({ read: false }, { read: true });
  return { updated: result.modifiedCount };
}

export async function dismissNotification(id) {
  const result = await Notification.deleteOne({ _id: id });
  if (result.deletedCount === 0) throw HttpError.notFound('Notification not found.');
}
