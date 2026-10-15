import type { Photographer } from '@/types';
import { apiRequest } from './apiClient';

export function getPhotographers(): Promise<Photographer[]> {
  return apiRequest('/photographers');
}
