/** "active": used EventSnap in the last 30 days. */
export type PhotographerStatus = 'active' | 'inactive';

export interface Photographer {
  id: string;
  /** Business name (or the owner's name when no business name is set). */
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  plan: string;
  status: PhotographerStatus;
  lastActive: string;
  bookings: number;
  /** Booking volume: payments the photographer recorded from their clients. */
  revenue: string;
  rating: number;
  storage: string;
  specialty: string;
  events: number;
  clients: number;
  portfolioSlug: string;
  portfolioPublished: boolean;
}
