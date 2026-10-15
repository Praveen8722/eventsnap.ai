import mongoose from 'mongoose';

export const SETTINGS_ID = 'platform';
export const GENERAL_SETTING_KEYS = ['platformName', 'platformUrl', 'supportEmail', 'adminEmail', 'maxFileSize', 'defaultTimezone'];

const toggleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    group: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, default: '' },
    value: { type: Boolean, required: true },
  },
  { _id: false },
);

const settingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: SETTINGS_ID },
    general: {
      platformName: { type: String, required: true },
      platformUrl: { type: String, required: true },
      supportEmail: { type: String, required: true },
      adminEmail: { type: String, required: true },
      maxFileSize: { type: String, required: true },
      defaultTimezone: { type: String, required: true },
    },
    toggles: { type: [toggleSchema], default: [] },
  },
  { versionKey: false },
);

export const PlatformSettings = mongoose.model('PlatformSettings', settingsSchema);
