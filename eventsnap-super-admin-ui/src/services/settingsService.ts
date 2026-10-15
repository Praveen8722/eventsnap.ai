import type { PlatformSettingsData, PlatformSettingsUpdate } from '@/types';
import { apiRequest } from './apiClient';

export function getPlatformSettings(): Promise<PlatformSettingsData> {
  return apiRequest('/settings');
}

export function updatePlatformSettings(update: PlatformSettingsUpdate): Promise<PlatformSettingsData> {
  return apiRequest('/settings', { method: 'PUT', body: update });
}
