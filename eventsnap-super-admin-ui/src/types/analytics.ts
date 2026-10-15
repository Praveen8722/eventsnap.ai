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
  month: string;
  rate: number;
}

export interface HealthMetric {
  metric: string;
  value: number;
}

export interface AnalyticsData {
  userGrowth: UserGrowthPoint[];
  geographicData: GeographicStat[];
  eventTypeData: EventTypeStat[];
  retentionData: RetentionPoint[];
  radarData: HealthMetric[];
}
