export interface ToggleSetting {
  label: string;
  description: string;
  value: boolean;
  key: string;
}

export interface GeneralSettings {
  platformName: string;
  platformUrl: string;
  supportEmail: string;
  adminEmail: string;
  maxFileSize: string;
  defaultTimezone: string;
}

export interface PlatformSettingsData {
  generalSettings: GeneralSettings;
  toggleSettings: Record<string, ToggleSetting[]>;
}

/** Partial update payload for `PUT /api/settings`; toggles are keyed by `ToggleSetting.key`. */
export interface PlatformSettingsUpdate {
  generalSettings?: Partial<GeneralSettings>;
  toggles?: Record<string, boolean>;
}
