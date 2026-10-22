export interface RevenuePoint {
  month: string;
  /** Booking volume (INR) recorded that month. */
  revenue: number;
  /** Bookings created that month. */
  bookings: number;
}

export interface PlanDistribution {
  name: string;
  value: number;
  color: string;
}

export interface TopPhotographer {
  id: string;
  name: string;
  location: string;
  bookings: number;
  revenue: string;
  status: string;
  plan: string;
}

export type ActivityStatus = 'info' | 'success' | 'warning' | 'error';

export interface ActivityEvent {
  type: string;
  message: string;
  time: string;
  status: ActivityStatus;
}

export interface DashboardStats {
  photographers: { total: number; newThisMonth: number };
  activePhotographers: { value: number; total: number; windowDays: number };
  bookings: { total: number; newThisMonth: number };
  bookingVolume: { thisMonth: number; lastMonth: number; changePercent: number | null; total: number };
  events: { total: number; newThisMonth: number };
  outstanding: { amount: number; bookings: number };
}

export interface DashboardData {
  stats: DashboardStats;
  revenueData: RevenuePoint[];
  subscriptionData: PlanDistribution[];
  topPhotographers: TopPhotographer[];
  recentActivity: ActivityEvent[];
}
