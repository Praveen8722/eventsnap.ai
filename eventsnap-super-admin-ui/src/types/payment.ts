export type TransactionStatus = 'completed' | 'pending';

/** A payment a photographer recorded from a client, or a balance still due on a booking. */
export interface Transaction {
  id: string;
  reference: string;
  photographer: string;
  client: string;
  type: 'advance' | 'payment' | 'balance';
  amount: string;
  method: string;
  status: TransactionStatus;
  date: string;
  description: string;
}

export interface MonthlyRevenuePoint {
  month: string;
  /** Payments photographers recorded from clients (INR). */
  bookingVolume: number;
  /** EventSnap's own income (INR); 0 until billing exists. */
  platformIncome: number;
}

export interface PaymentsSummary {
  platformIncome: number;
  billingEnabled: boolean;
  billingMessage: string;
  volumeThisMonth: number;
  volumeLastMonth: number;
  volumeChangePercent: number | null;
  volumeTotal: number;
  paymentsThisMonth: number;
  outstandingAmount: number;
  outstandingBookings: number;
}

export interface PaymentsData {
  summary: PaymentsSummary;
  monthlyRevenue: MonthlyRevenuePoint[];
  transactions: Transaction[];
}
