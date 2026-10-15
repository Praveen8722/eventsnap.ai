export interface Subscriber {
  name: string;
  plan: string;
  email: string;
  since: string;
  status: 'active' | 'trial' | 'past_due';
  nextBilling: string;
  amount: string;
}

export interface PlanLimits {
  bookings: number | 'Unlimited';
  storage: string;
  galleries: number | 'Unlimited';
  staff: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  annualPrice: number;
  color: string;
  bg: string;
  subscribers: number;
  mrr: number;
  growth: string;
  popular?: boolean;
  features: string[];
  limits: PlanLimits;
}

export interface SubscriptionsData {
  plans: SubscriptionPlan[];
  recentSubscribers: Subscriber[];
}
