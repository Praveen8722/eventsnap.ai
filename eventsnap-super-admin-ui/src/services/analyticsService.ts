import type { AnalyticsData, AnalyticsPeriod } from '@/types';
import { apiRequest } from './apiClient';

export function getAnalyticsData(period: AnalyticsPeriod = '30d'): Promise<AnalyticsData> {
  return apiRequest(`/analytics?period=${encodeURIComponent(period)}`);
}
