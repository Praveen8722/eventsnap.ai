import type { Client } from '@/types';
import { apiRequest } from './apiClient';

export function getClients(): Promise<Client[]> {
  return apiRequest('/clients');
}
