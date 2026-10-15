export type BookingStatus = 'confirmed' | 'in-progress' | 'delivered' | 'cancelled' | 'refunded';

export interface Booking {
  id: string;
  client: string;
  photographer: string;
  eventType: string;
  eventDate: string;
  package: string;
  amount: string;
  status: BookingStatus;
  location: string;
  createdAt: string;
}
