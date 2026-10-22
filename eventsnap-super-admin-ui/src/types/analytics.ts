export interface UserGrowthPoint {
  month: string;
  photographers: number;
  clients: number;
}

export interface GeographicStat {
  state: string;
  photographers: number;
  revenue: string;
}

export interface EventTypeStat {
  type: string;
  count: number;
  revenue: number;
  color: string;
}

export interface RetentionPoint {
  /** "M1" … "M12": months after signup. */
  month: string;
  rate: number;
}

export interface HealthMetric {
  metric: string;
  value: number;
}

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '1y' | 'all';

export interface AnalyticsSummary {
  healthScore: number;
  retention12m: number | null;
  avgBookingsPerPhotographer: number;
  volumePerPhotographer: number;
  newPhotographers: number;
  bookings: number;
  bookingVolume: number;
}

export interface AnalyticsData {
  period: AnalyticsPeriod;
  summary: AnalyticsSummary;
  userGrowth: UserGrowthPoint[];
  geographicData: GeographicStat[];
  eventTypeData: EventTypeStat[];
  retentionData: RetentionPoint[];
  radarData: HealthMetric[];
}
