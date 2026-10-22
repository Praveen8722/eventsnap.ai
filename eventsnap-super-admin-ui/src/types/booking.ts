export type BookingStatus = 'inquiry' | 'confirmed' | 'in-progress' | 'delivered' | 'cancelled';

export interface BookingDay {
  name: string;
  date: string;
  location: string;
}

export interface Booking {
  /** Unique id. */
  id: string;
  /** The photographer's own booking number, e.g. "BK001" (unique per photographer only). */
  reference: string;
  client: string;
  /** Masked, e.g. "r***@gmail.com". */
  clientEmail: string;
  /** Masked, e.g. "98****3210". */
  clientPhone: string;
  photographer: string;
  eventType: string;
  eventDate: string;
  package: string;
  /** Package price. */
  amount: string;
  paid: string;
  balance: string;
  status: BookingStatus;
  /** The platform's status, e.g. "Editing". */
  stage: string;
  source: 'portfolio' | 'internal';
  location: string;
  days: BookingDay[];
  createdAt: string;
}
