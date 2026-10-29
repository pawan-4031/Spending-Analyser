export interface Transaction {
  txn_id: string;
  date_time: string;
  txn_date: string;
  statement_month: string;
  txn_type: 'DEBIT' | 'CREDIT' | 'WALLET_TOPUP' | 'SELF_TRANSFER';
  party: string;
  payment_method: string;
  amount: number;
  category: string;
  raw_details?: string;
}

export interface KpiData {
  total_spent: number;
  total_received: number;
  net_spend: number;
  rupay_spend: number;
  bank_spend: number;
  transaction_count: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface MethodBreakdown {
  method: string;
  amount: number;
  percentage: number;
}

export interface DailyTrend {
  date: string;
  amount: number;
}

export interface MonthlyTrend {
  month: string;
  label: string;
  amount: number;
}

export interface TopPayee {
  party: string;
  category: string;
  total_spent: number;
  tx_count: number;
  avg_per_txn: number;
}

export interface AnalyticsResponse {
  has_data: boolean;
  filter_label?: string;
  min_date?: string;
  max_date?: string;
  available_months?: { id: string; label: string }[];
  available_methods?: string[];
  kpis?: KpiData;
  category_breakdown?: CategoryBreakdown[];
  payment_method_breakdown?: MethodBreakdown[];
  daily_trend?: DailyTrend[];
  monthly_trend?: MonthlyTrend[];
  top_payees?: TopPayee[];
}

export interface RuleItem {
  keyword: string;
  category: string;
}

