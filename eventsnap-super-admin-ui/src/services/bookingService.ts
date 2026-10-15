import type { Booking } from '@/types';
import { apiRequest } from './apiClient';

export function getBookings(): Promise<Booking[]> {
  return apiRequest('/bookings');
}
