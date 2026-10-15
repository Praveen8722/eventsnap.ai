import type { AuditLog } from '@/types';
import { apiRequest } from './apiClient';

export function getActivityLogs(): Promise<AuditLog[]> {
  return apiRequest('/activity-logs');
}
