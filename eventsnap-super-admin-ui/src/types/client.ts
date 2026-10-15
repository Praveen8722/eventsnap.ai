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
  status: 'active' | 'inactive';
  joinDate: string;
}
