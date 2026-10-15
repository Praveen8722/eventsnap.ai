import type { AnalyticsData } from '@/types';
import { apiRequest } from './apiClient';

export function getAnalyticsData(): Promise<AnalyticsData> {
  return apiRequest('/analytics');
}
