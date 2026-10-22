import { platformConnected } from '../config/platformDb.js';
import { Notification } from '../models/index.js';
import { HttpError } from '../utils/HttpError.js';
import { toNotification, toNotificationAlert } from './mappers.js';
import { getPlatformAlerts } from './platformService.js';

const ALERT_LIMIT = 5;
const VISIBLE = { dismissed: { $ne: true } };

/**
 * Adds alerts derived from platform data (new signups, photographers near or over the storage
 * limit) to the feed. Each alert has a fixed id, so it is added once and keeps its read/dismissed
 * state; a failure to reach the platform never breaks the feed.
 */
async function syncPlatformAlerts() {
  if (!platformConnected()) return;
  let alerts;
  try {
    alerts = await getPlatformAlerts();
  } catch {
    return;
  }
  if (alerts.length === 0) return;
  await Notification.bulkWrite(
    alerts.map(({ _id, ...alert }) => ({
      updateOne: { filter: { _id }, update: { $setOnInsert: { ...alert, read: false, dismissed: false } }, upsert: true },
    })),
    { ordered: false },
  );
}

export async function getNotificationsData() {
  await syncPlatformAlerts();
  const docs = await Notification.find(VISIBLE).sort({ createdAt: -1 }).lean();
  const now = new Date();
  const categories = [...new Set(docs.map(doc => doc.category))];
  return {
    notifications: docs.map(doc => toNotification(doc, now)),
    categories: ['All', ...categories],
  };
}

export async function getRecentAlerts() {
  await syncPlatformAlerts();
  const docs = await Notification.find(VISIBLE).sort({ createdAt: -1 }).limit(ALERT_LIMIT).lean();
  const now = new Date();
  return docs.map(doc => toNotificationAlert(doc, now));
}

export async function markNotificationRead(id) {
  const doc = await Notification.findOneAndUpdate({ _id: String(id), ...VISIBLE }, { read: true }, { returnDocument: 'after' }).lean();
  if (!doc) throw HttpError.notFound('Notification not found.');
  return toNotification(doc);
}

export async function markAllNotificationsRead() {
  const result = await Notification.updateMany({ read: false, ...VISIBLE }, { read: true });
  return { updated: result.modifiedCount };
}

export async function dismissNotification(id) {
  const result = await Notification.updateOne({ _id: String(id), ...VISIBLE }, { dismissed: true, read: true });
  if (result.matchedCount === 0) throw HttpError.notFound('Notification not found.');
}
