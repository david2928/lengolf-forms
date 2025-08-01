// Sales Dashboard TypeScript Interfaces

// =============================================================================
// CORE DATA INTERFACES
// =============================================================================

export interface PeriodMetrics {
  net_revenue: number;
  gross_profit: number;
  transaction_count: number;
  unique_customers: number;
  avg_transaction_value: number;
  gross_margin_pct: number;
  sim_utilization_count: number;
  sim_utilization_pct: number;
  new_customers: number;
}

export interface ChangeMetrics {
  revenue_change_pct: number | null;
  profit_change_pct: number | null;
  transaction_change_pct: number | null;
  customer_acquisition_change_pct: number | null;
  sim_utilization_change_pct: number | null;
  margin_change_pct: number | null;
}

export interface DashboardSummary {
  current: PeriodMetrics;
  comparison: PeriodMetrics;
  changes: ChangeMetrics;
  trend_data: {
    revenue: Array<{ date: string; value: number }>;
    profit: Array<{ date: string; value: number }>;
    utilization: Array<{ date: string; value: number }>;
    customers: Array<{ date: string; value: number }>;
    transaction: Array<{ date: string; value: number }>;
    margin: Array<{ date: string; value: number }>;
  };
}

// =============================================================================
// CHART DATA INTERFACES
// =============================================================================

export interface RevenueTrendPoint {
  period_date: string;
  total_revenue: number;  // Keep as total_revenue for chart compatibility
  gross_profit: number;
  transaction_count: number;
  avg_transaction_value: number;
  unique_customers: number;
}

export interface SimUtilizationPoint {
  date: string;
  sim_usage_count: number;
  total_transactions: number;
  utilization_pct: number;
  sim_revenue: number;
}

export interface CategoryData {
  parent_category: string;
  revenue: number;
  profit: number;
  margin_pct: number;
  transaction_count: number;
  avg_transaction_value: number;
}

export interface PaymentMethodData {
  payment_type: string;
  transaction_count: number;
  revenue: number;
  avg_transaction_value: number;
  percentage: number;
}

export interface CustomerGrowthPoint {
  date: string;
  new_customers: number;
  returning_customers: number;
  total_customers: number;
}

export interface DashboardCharts {
  revenue_trends: RevenueTrendPoint[];
  sim_utilization: SimUtilizationPoint[];
  category_breakdown: CategoryData[];
  payment_methods: PaymentMethodData[];
  customer_growth: CustomerGrowthPoint[];
}

// =============================================================================
// COMPONENT PROP INTERFACES
// =============================================================================

export interface KPICardData {
  label: string;
  value: string;
  changePercent: number | null;
  changeDirection: 'up' | 'down' | 'neutral';
  trendData: Array<{ date: string; value: number }>;
  format: 'currency' | 'percentage' | 'number';
  icon?: React.ComponentType<{ className?: string }>;
}

export interface KPICardsProps {
  data: DashboardSummary;
  isLoading?: boolean;
}

export interface RevenueTrendsChartProps {
  data: RevenueTrendPoint[];
  isLoading?: boolean;
  periodType?: 'day' | 'week' | 'month';
}

export interface SimUtilizationChartProps {
  data: SimUtilizationPoint[];
  isLoading?: boolean;
  targetUtilization?: number;
}

export interface CategoryBreakdownChartProps {
  data: CategoryData[];
  isLoading?: boolean;
  showProfit?: boolean;
}

export interface PaymentMethodsChartProps {
  data: PaymentMethodData[];
  isLoading?: boolean;
  error?: string | null;
  title?: string;
  showInsights?: boolean;
  displayMode?: 'revenue' | 'transactions';
  className?: string;
  layout?: 'horizontal' | 'vertical';
}

export interface CustomerGrowthChartProps {
  data: CustomerGrowthPoint[];
  isLoading?: boolean;
  showTotal?: boolean;
  summaryData?: PeriodMetrics;
}

// =============================================================================
// DASHBOARD CONFIGURATION INTERFACES
// =============================================================================

export interface DashboardFilters {
  dateRange: {
    start: Date;
    end: Date;
    preset: 'last7days' | 'last30days' | 'last3months' | 'monthToDate' | 'yearToDate' | 'custom';
  };
  comparisonPeriod: 'previousPeriod' | 'previousMonth' | 'previousYear';
  categoryFilter?: string;
  paymentFilter?: string;
}

export interface DashboardConfig {
  refreshInterval: number;
  cacheEnabled: boolean;
  autoRefresh: boolean;
  compactMode: boolean;
  showTrends: boolean;
}

// =============================================================================
// API RESPONSE INTERFACES
// =============================================================================

export interface DashboardSummaryResponse {
  success: boolean;
  data: DashboardSummary;
  cached: boolean;
  performance: {
    query_time_ms: number;
    cache_hit: boolean;
  };
}

export interface DashboardChartsResponse {
  success: boolean;
  data: DashboardCharts;
  cached: boolean;
  performance: {
    query_time_ms: number;
    cache_hit: boolean;
  };
}

export interface DashboardError {
  error: string;
  code: string;
  details?: string;
  timestamp: string;
}

// =============================================================================
// HOOK INTERFACES
// =============================================================================

export interface UseSalesDashboardOptions {
  filters?: DashboardFilters;
  refreshInterval?: number;
  enabled?: boolean;
}

export interface UseSalesDashboardReturn {
  summary: DashboardSummary | null;
  charts: DashboardCharts | null;
  isLoading: boolean;
  isValidating: boolean;
  isError: boolean;
  error: DashboardError | null;
  mutate: () => void;
  refresh: () => Promise<void>;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type DashboardMetricType = 
  | 'revenue' 
  | 'profit' 
  | 'utilization' 
  | 'customers' 
  | 'transaction' 
  | 'margin';

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'pie' 
  | 'donut' 
  | 'area' 
  | 'stacked';

export type DatePreset = 
  | 'today'
  | 'yesterday' 
  | 'last7days' 
  | 'last30days' 
  | 'last3months' 
  | 'monthToDate' 
  | 'yearToDate' 
  | 'custom';

export type ComparisonPeriod = 
  | 'previousPeriod' 
  | 'previousMonth' 
  | 'previousYear';

export type ChartDisplayMode = 
  | 'revenue' 
  | 'transactions';

// =============================================================================
// CONSTANTS
// =============================================================================

export const DASHBOARD_COLORS = {
  primary: '#3b82f6',
  success: '#10b981', 
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  orange: '#f97316',
  pink: '#ec4899',
  gray: '#6b7280'
} as const;

export const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#ec4899'
] as const;

export const DEFAULT_FILTERS: DashboardFilters = {
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
    preset: 'last30days'
  },
  comparisonPeriod: 'previousPeriod'
} as const; 