export interface RevenuePoint {
  month: string;
  revenue: number;
  bookings: number;
}

export interface PlanDistribution {
  name: string;
  value: number;
  color: string;
}

export interface TopPhotographer {
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

export interface DashboardData {
  revenueData: RevenuePoint[];
  subscriptionData: PlanDistribution[];
  topPhotographers: TopPhotographer[];
  recentActivity: ActivityEvent[];
}
