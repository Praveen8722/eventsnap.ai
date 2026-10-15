import type { SubscriptionsData } from '@/types';
import { apiRequest } from './apiClient';

export function getSubscriptionsData(): Promise<SubscriptionsData> {
  return apiRequest('/subscriptions');
}
