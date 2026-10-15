export type PhotographerStatus = 'active' | 'pending' | 'suspended';

export interface Photographer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  plan: 'Starter' | 'Professional' | 'Studio';
  status: PhotographerStatus;
  bookings: number;
  revenue: string;
  rating: number;
  storage: string;
  specialty: string;
}
