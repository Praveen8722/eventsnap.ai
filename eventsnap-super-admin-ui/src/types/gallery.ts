export interface GalleryUser {
  id: string;
  name: string;
  plan: string;
  usedGB: number;
  limitGB: number;
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
}

export interface GalleryStorageData {
  storageOverview: StorageOverview;
  galleryUsers: GalleryUser[];
}
