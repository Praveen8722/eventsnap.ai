import type { Ticket } from '@/types';
import { apiRequest } from './apiClient';

export function getSupportTickets(): Promise<Ticket[]> {
  return apiRequest('/support-tickets');
}
