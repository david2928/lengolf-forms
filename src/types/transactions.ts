// Transaction TypeScript Interfaces

// =============================================================================
// CORE TRANSACTION INTERFACES
// =============================================================================

export interface TransactionSummary {
  receipt_number: string;
  date: string;
  sales_timestamp: string;
  customer_name: string | null;
  customer_id: string | null;
  staff_name: string | null;
  payment_method: string | null;
  total_amount: number;
  net_amount: number;
  total_profit: number;
  total_cost: number;
  item_count: number;
  sim_usage_count: number;
  status: 'COMPLETED' | 'VOIDED';
}

export interface TransactionItem {
  id: number;
  receipt_number: string;
  product_name: string | null;
  product_category: string | null;
  product_parent_category: string | null;
  item_cnt: number;
  item_price_incl_vat: number;
  item_price_excl_vat: number;
  item_discount?: number;
  sales_total: number;
  sales_net: number;
  sales_discount?: number;
  gross_profit: number;
  is_sim_usage: number;
  item_notes: string | null;
  sku_number: string | null;
  item_cost?: number | string | null;
}

export interface TransactionDetails {
  transaction: TransactionSummary;
  items: TransactionItem[];
  summary: {
    subtotal: number;
    vat: number;
    total: number;
    total_profit: number;
    payment_method: string | null;
    staff_name: string | null;
  };
}

// =============================================================================
// API RESPONSE INTERFACES
// =============================================================================

export interface TransactionsListResponse {
  success: boolean;
  data: TransactionSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  performance: {
    query_time_ms: number;
  };
}

export interface TransactionDetailsResponse {
  success: boolean;
  data: TransactionDetails;
  performance: {
    query_time_ms: number;
  };
}

export interface TransactionError {
  error: string;
  code: string;
  details?: string;
  timestamp: string;
}

// =============================================================================
// FILTER AND SEARCH INTERFACES
// =============================================================================

export interface TransactionFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  status?: 'COMPLETED' | 'VOIDED' | 'ALL';
  paymentMethod?: string;
  staffName?: string;
  customerName?: string;
  minAmount?: number;
  maxAmount?: number;
  hasSimUsage?: boolean;
}

export interface TransactionSearchParams {
  filters: TransactionFilters;
  pagination: {
    page: number;
    limit: number;
  };
  sortBy: 'sales_timestamp' | 'total_amount' | 'customer_name';
  sortOrder: 'asc' | 'desc';
}

// =============================================================================
// COMPONENT PROPS INTERFACES
// =============================================================================

export interface TransactionsTableProps {
  transactions: TransactionSummary[];
  isLoading?: boolean;
  onTransactionClick: (receiptNumber: string) => void;
  onRefresh: () => void;
}

export interface TransactionDetailModalProps {
  receiptNumber: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  onReset: () => void;
}

// =============================================================================
// HOOK INTERFACES
// =============================================================================

export interface UseTransactionsOptions {
  filters: TransactionFilters;
  pagination: {
    page: number;
    limit: number;
  };
  sortBy: 'sales_timestamp' | 'total_amount' | 'customer_name';
  sortOrder: 'asc' | 'desc';
  enabled?: boolean;
}

export interface UseTransactionsReturn {
  transactions: TransactionSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  isValidating: boolean;
  isError: boolean;
  error: TransactionError | null;
  mutate: () => void;
  refresh: () => Promise<void>;
}

export interface UseTransactionDetailsReturn {
  transactionDetails: TransactionDetails | null;
  isLoading: boolean;
  isError: boolean;
  error: TransactionError | null;
  mutate: () => void;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type PaymentMethodType = 
  | 'Cash'
  | 'Mastercard Manual'
  | 'Visa Manual'
  | 'PromptPay Manual'
  | 'Other';

export type TransactionStatus = 'COMPLETED' | 'VOIDED';

export type SortField = 'sales_timestamp' | 'total_amount' | 'customer_name';
export type SortOrder = 'asc' | 'desc';

// =============================================================================
// CONSTANTS
// =============================================================================

export const PAYMENT_METHODS: PaymentMethodType[] = [
  'Cash',
  'Mastercard Manual',
  'Visa Manual',
  'PromptPay Manual',
  'Other'
];

// Note: DEFAULT_FILTERS uses system time initially, but will be overridden by Bangkok timezone in useTransactionFilters
export const DEFAULT_FILTERS: TransactionFilters = {
  dateRange: {
    start: new Date(new Date().setHours(0, 0, 0, 0)), // Start of today (will be overridden)
    end: new Date(new Date().setHours(23, 59, 59, 999)) // End of today (will be overridden)
  },
  status: 'ALL'
};

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 50
};

// =============================================================================
// KPI INTERFACES
// =============================================================================

export interface TransactionKPIs {
  totalSales: number;
  salesGrowth: number;
  transactionCount: number;
  transactionGrowth: number;
  grossProfit: number;
  grossMargin: number;
  averageTransactionValue: number;
  newCustomers: number;
  totalCost: number;
}

export interface TransactionKPIResponse {
  success: boolean;
  data: {
    current_period: TransactionKPIs;
    comparison_period?: TransactionKPIs;
  };
  performance?: {
    query_time_ms: number;
  };
}

export const TRANSACTION_COLORS = {
  completed: '#10b981',
  voided: '#ef4444',
  sim_usage: '#3b82f6',
  cash: '#10b981',
  card: '#6366f1',
  promptpay: '#f59e0b'
} as const; 