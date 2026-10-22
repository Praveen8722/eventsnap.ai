export interface GalleryUser {
  id: string;
  name: string;
  plan: string;
  usedGB: number;
  limitGB: number;
  usedBytes: number;
  limitBytes: number;
  galleries: number;
  files: number;
  lastUpload: string;
  status: 'ok' | 'warning' | 'exceeded';
}

export interface StorageOverview {
  /** Gigabytes */
  totalAllocated: number;
  /** Gigabytes */
  totalUsed: number;
  totalFiles: number;
  /** Gigabytes */
  avgPerPhotographer: number;
  totalAllocatedBytes: number;
  totalUsedBytes: number;
  /** Per-photographer quota (GB). */
  quotaGB: number;
  photographers: number;
}

export interface GalleryStorageData {
  storageOverview: StorageOverview;
  galleryUsers: GalleryUser[];
}
