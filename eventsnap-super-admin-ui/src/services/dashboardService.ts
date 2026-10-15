import type { DashboardData } from '@/types';
import { apiRequest } from './apiClient';

export function getDashboardData(): Promise<DashboardData> {
  return apiRequest('/dashboard');
}
