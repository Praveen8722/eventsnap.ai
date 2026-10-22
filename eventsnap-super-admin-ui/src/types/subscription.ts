export interface Subscriber {
  id: string;
  name: string;
  plan: string;
  email: string;
  since: string;
  status: 'active' | 'trial' | 'past_due';
  /** Null while there is no billing. */
  nextBilling: string | null;
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
  billing: { enabled: boolean; message: string };
  plans: SubscriptionPlan[];
  recentSubscribers: Subscriber[];
}
