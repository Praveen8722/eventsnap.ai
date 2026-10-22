import { apiRequest } from './apiClient';

export interface SystemStatus {
  api: 'ok';
  platformDatabase: 'connected' | 'not-configured';
}

export function getSystemStatus(): Promise<SystemStatus> {
  return apiRequest('/system/status');
}
