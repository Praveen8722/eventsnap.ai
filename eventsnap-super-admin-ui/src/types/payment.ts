export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'refunded';

export interface Transaction {
  id: string;
  photographer: string;
  type: 'subscription' | 'commission' | 'refund';
  amount: string;
  method: string;
  status: TransactionStatus;
  date: string;
  description: string;
}

export interface MonthlyRevenuePoint {
  month: string;
  platform: number;
  subscriptions: number;
}

export interface PaymentsData {
  monthlyRevenue: MonthlyRevenuePoint[];
  transactions: Transaction[];
}
