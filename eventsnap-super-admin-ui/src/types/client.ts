/** A photographer's client, from their bookings. Contact details are masked by the API. */
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  photographer: string;
  bookings: number;
  totalSpent: string;
  lastBooking: string;
  /** "active": has a booking that isn't delivered or cancelled. */
  status: 'active' | 'inactive';
  joinDate: string;
}
