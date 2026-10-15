import { GENERAL_SETTING_KEYS, PlatformSettings, SETTINGS_ID } from '../models/index.js';
import { HttpError } from '../utils/HttpError.js';
import { isPlainObject, requireEmail, requireObject, requireString } from '../utils/validation.js';
import { recordAudit } from './auditService.js';

const MAX_UPLOAD_MB = 2048;

function toSettingsData(doc) {
  const toggleSettings = {};
  for (const { group, label, description, value, key } of doc.toggles) {
    (toggleSettings[group] ??= []).push({ label, description, value, key });
  }
  return { generalSettings: { ...doc.general }, toggleSettings };
}

async function loadSettings() {
  const doc = await PlatformSettings.findById(SETTINGS_ID);
  if (!doc) throw HttpError.notFound('Platform settings have not been initialised. Run `npm run seed`.');
  return doc;
}

export async function getPlatformSettings() {
  return toSettingsData((await loadSettings()).toObject());
}

const generalValidators = {
  platformName: value => requireString(value, 'Platform name', { maxLength: 100 }),
  platformUrl: value => {
    const url = requireString(value, 'Platform URL', { maxLength: 300 });
    let protocol;
    try {
      protocol = new URL(url).protocol;
    } catch {
      protocol = null;
    }
    if (protocol !== 'https:' && protocol !== 'http:') throw HttpError.badRequest('Platform URL must be a valid http(s) URL.');
    return url;
  },
  supportEmail: value => requireEmail(value, 'Support email'),
  adminEmail: value => requireEmail(value, 'Admin email'),
  maxFileSize: value => {
    const size = requireString(String(value ?? ''), 'Max file size', { maxLength: 10 });
    const megabytes = Number(size);
    if (!Number.isInteger(megabytes) || megabytes < 1 || megabytes > MAX_UPLOAD_MB) {
      throw HttpError.badRequest(`Max file size must be a whole number of MB between 1 and ${MAX_UPLOAD_MB}.`);
    }
    return String(megabytes);
  },
  defaultTimezone: value => {
    const timeZone = requireString(value, 'Default timezone', { maxLength: 100 });
    try {
      new Intl.DateTimeFormat('en-US', { timeZone });
    } catch {
      throw HttpError.badRequest('Default timezone must be a valid IANA timezone, e.g. America/New_York.');
    }
    return timeZone;
  },
};

const describe = value => (typeof value === 'boolean' ? (value ? 'on' : 'off') : value);

/** Applies a partial update: `{ generalSettings?: Partial<GeneralSettings>, toggles?: Record<key, boolean> }`. */
export async function updatePlatformSettings(body, actor, ip) {
  requireObject(body);
  const { generalSettings = {}, toggles = {} } = body;
  if (!isPlainObject(generalSettings)) throw HttpError.badRequest('generalSettings must be an object.');
  if (!isPlainObject(toggles)) throw HttpError.badRequest('toggles must be an object.');

  const doc = await loadSettings();
  const changes = [];

  for (const [key, rawValue] of Object.entries(generalSettings)) {
    if (!GENERAL_SETTING_KEYS.includes(key)) throw HttpError.badRequest(`Unknown general setting: ${key}.`);
    const value = generalValidators[key](rawValue);
    if (doc.general[key] !== value) {
      changes.push(`${key}: ${doc.general[key]} → ${value}`);
      doc.general[key] = value;
    }
  }

  for (const [key, value] of Object.entries(toggles)) {
    const toggle = doc.toggles.find(t => t.key === key);
    if (!toggle) throw HttpError.badRequest(`Unknown toggle setting: ${key}.`);
    if (typeof value !== 'boolean') throw HttpError.badRequest(`Toggle ${key} must be true or false.`);
    if (toggle.value !== value) {
      changes.push(`${key}: ${describe(toggle.value)} → ${describe(value)}`);
      toggle.value = value;
    }
  }

  if (changes.length > 0) {
    await doc.save();
    await recordAudit({
      actor,
      action: 'SETTINGS_UPDATED',
      category: 'settings',
      target: 'Platform Settings',
      details: `Updated ${changes.join('; ')}`,
      ip,
    });
  }

  return toSettingsData(doc.toObject());
}
