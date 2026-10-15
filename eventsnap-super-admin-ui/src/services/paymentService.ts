import type { PaymentsData } from '@/types';
import { apiRequest } from './apiClient';

export function getPaymentsData(): Promise<PaymentsData> {
  return apiRequest('/payments');
}
