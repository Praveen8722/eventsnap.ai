import type { GalleryStorageData } from '@/types';
import { apiRequest } from './apiClient';

export function getGalleryStorageData(): Promise<GalleryStorageData> {
  return apiRequest('/gallery');
}
