// Dashboard Utilities
// Comprehensive utility functions for dashboard calculations, formatting, and data transformations

import { format, parseISO, subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { getBangkokNow, formatBangkokTime, parseBangkokTime } from './bangkok-timezone';
import { DashboardFilters, DatePreset, PeriodMetrics, ChangeMetrics } from '@/types/sales-dashboard';

// =============================================================================
// CONSTANTS
// =============================================================================

export const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  accent: '#10B981',
  muted: '#6B7280',
  info: '#06B6D4',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626'
};

export const DASHBOARD_COLORS = {
  revenue: '#3B82F6',
  profit: '#10B981',
  utilization: '#8B5CF6',
  customers: '#F59E0B',
  transactions: '#06B6D4',
  margin: '#EF4444'
};

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Format currency values in Thai Baht
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format compact currency (e.g., ฿1.2M, ฿45K)
 */
export const formatCompactCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000) {
    return `฿${(value / 1000000).toFixed(1)}M`;
  } else if (absValue >= 1000) {
    return `฿${(value / 1000).toFixed(1)}K`;
  } else {
    return formatCurrency(value);
  }
};

/**
 * Format percentage values
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format number with thousands separator
 */
export const formatNumber = (value: number): string => {
  return value.toLocaleString('th-TH');
};

/**
 * Format change percentage with + or - sign
 */
export const formatChangePercentage = (value: number | null): string => {
  if (value === null) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

// =============================================================================
// CALCULATION UTILITIES
// =============================================================================

/**
 * Calculate percentage change between two values
 */
export const calculatePercentageChange = (current: number, previous: number): number | null => {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

/**
 * Calculate Week-over-Week and Month-over-Month changes
 */
export const calculatePeriodChanges = (
  current: PeriodMetrics,
  comparison: PeriodMetrics
): ChangeMetrics => {
  return {
    revenue_change_pct: calculatePercentageChange(
      current.net_revenue, 
      comparison.net_revenue
    ),
    profit_change_pct: calculatePercentageChange(
      current.gross_profit, 
      comparison.gross_profit
    ),
    transaction_change_pct: calculatePercentageChange(
      current.avg_transaction_value, 
      comparison.avg_transaction_value
    ),
    customer_acquisition_change_pct: calculatePercentageChange(
      current.new_customers, 
      comparison.new_customers
    ),
    sim_utilization_change_pct: current.sim_utilization_pct - comparison.sim_utilization_pct,
    margin_change_pct: current.gross_margin_pct - comparison.gross_margin_pct
  };
};

/**
 * Get change direction for trend indicators
 */
export const getChangeDirection = (value: number | null): 'up' | 'down' | 'neutral' => {
  if (value === null || value === 0) return 'neutral';
  return value > 0 ? 'up' : 'down';
};

/**
 * Get comparison period label based on comparison type and date preset
 */
export const getComparisonPeriodLabel = (
  comparisonType: 'previousPeriod' | 'previousMonth' | 'previousYear',
  datePreset?: DatePreset
): string => {
  // For specific presets, provide more contextual labels
  if (datePreset) {
    switch (datePreset) {
      case 'today':
        return comparisonType === 'previousPeriod' ? 'vs Yesterday' : 
               comparisonType === 'previousMonth' ? 'vs Same Day Last Month' : 'vs Same Day Last Year';
      case 'yesterday':
        return comparisonType === 'previousPeriod' ? 'vs Day Before' : 
               comparisonType === 'previousMonth' ? 'vs Same Day Last Month' : 'vs Same Day Last Year';
      case 'last7days':
        return comparisonType === 'previousPeriod' ? 'vs Previous 7 Days' : 
               comparisonType === 'previousMonth' ? 'vs Same Week Last Month' : 'vs Same Week Last Year';
      case 'last30days':
        return comparisonType === 'previousPeriod' ? 'vs Previous 30 Days' : 
               comparisonType === 'previousMonth' ? 'vs Previous Month' : 'vs Same Month Last Year';
      case 'last3months':
        return comparisonType === 'previousPeriod' ? 'vs Previous 3 Months' : 
               comparisonType === 'previousMonth' ? 'vs Previous Quarter' : 'vs Same Quarter Last Year';
      case 'monthToDate':
        return comparisonType === 'previousPeriod' ? 'vs Previous Month' : 
               comparisonType === 'previousMonth' ? 'vs Previous Month' : 'vs Same Month Last Year';
      case 'yearToDate':
        return comparisonType === 'previousPeriod' ? 'vs Previous Year' : 
               comparisonType === 'previousMonth' ? 'vs Previous Year' : 'vs Previous Year';
    }
  }

  // Fallback to original logic
  switch (comparisonType) {
    case 'previousPeriod':
      return 'vs Previous Period';
    case 'previousMonth':
      return 'vs Previous Month';
    case 'previousYear':
      return 'vs Previous Year';
    default:
      return 'vs Previous Period';
  }
};

/**
 * Calculate moving average for trend smoothing
 */
export const calculateMovingAverage = (
  data: Array<{ date: string; value: number }>, 
  windowSize: number = 7
): Array<{ date: string; value: number; movingAverage: number }> => {
  return data.map((point, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const window = data.slice(start, index + 1);
    const average = window.reduce((sum, p) => sum + p.value, 0) / window.length;
    
    return {
      ...point,
      movingAverage: average
    };
  });
};

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Get date range for preset periods using Bangkok timezone
 * All ranges end on yesterday to ensure complete data (not partial current day)
 */
export const getDateRangeForPreset = (preset: DatePreset): { start: Date; end: Date } => {
  // Use Bangkok timezone for date calculations
  const bangkokNow = getBangkokNow();
  const yesterday = new Date(bangkokNow);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);
  
  switch (preset) {
    case 'today':
      // Today in Bangkok timezone
      const today = new Date(bangkokNow);
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      return { start: today, end: todayEnd };
    
    case 'yesterday':
      return { start: yesterday, end: yesterdayEnd };
    
    case 'last7days':
      const sevenDaysAgo = new Date(yesterday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      return { start: sevenDaysAgo, end: yesterdayEnd }; // 7 complete days ending yesterday
    
    case 'last30days':
      const thirtyDaysAgo = new Date(yesterday);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      return { start: thirtyDaysAgo, end: yesterdayEnd }; // 30 complete days ending yesterday
    
    case 'last3months':
      const threeMonthsAgo = new Date(yesterday);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return { start: threeMonthsAgo, end: yesterdayEnd }; // 3 months ending yesterday
    
    case 'monthToDate':
      const monthStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1);
      return { start: monthStart, end: yesterdayEnd }; // Month to yesterday
    
    case 'yearToDate':
      const yearStart = new Date(yesterday.getFullYear(), 0, 1);
      return { start: yearStart, end: yesterdayEnd }; // Year to yesterday
    
    default:
      const defaultStart = new Date(yesterday);
      defaultStart.setDate(defaultStart.getDate() - 29);
      return { start: defaultStart, end: yesterdayEnd }; // Default to last 30 complete days
  }
};

/**
 * Get comparison date range based on current range and comparison type
 */
export const getComparisonDateRange = (
  currentStart: Date,
  currentEnd: Date,
  comparisonType: 'previousPeriod' | 'previousMonth' | 'previousYear'
): { start: Date; end: Date } => {
  const daysDiff = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
  
  switch (comparisonType) {
    case 'previousPeriod':
      return {
        start: subDays(currentStart, daysDiff),
        end: subDays(currentEnd, daysDiff)
      };
    
    case 'previousMonth':
      return {
        start: subMonths(currentStart, 1),
        end: subMonths(currentEnd, 1)
      };
    
    case 'previousYear':
      return {
        start: new Date(currentStart.getFullYear() - 1, currentStart.getMonth(), currentStart.getDate()),
        end: new Date(currentEnd.getFullYear() - 1, currentEnd.getMonth(), currentEnd.getDate())
      };
    
    default:
      return {
        start: subDays(currentStart, daysDiff),
        end: subDays(currentEnd, daysDiff)
      };
  }
};

/**
 * Format date for display
 */
export const formatDisplayDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM dd');
};

/**
 * Format date for chart axis
 */
export const formatChartDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MM/dd');
};

/**
 * Format date for API queries
 */
export const formatApiDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

// =============================================================================
// CHART DATA UTILITIES
// =============================================================================

/**
 * Generate trend data for mini charts in KPI cards
 */
export const generateTrendData = (
  data: Array<{ date: string; value: number }>,
  datePreset: DatePreset = 'last30days'
): Array<{ date: string; value: number }> => {
  if (!data || data.length === 0) return [];
  
  // Determine the number of points based on the date preset
  const getMaxPoints = (preset: DatePreset): number => {
    switch (preset) {
      case 'today':
      case 'yesterday':
        return 24; // Hourly data for single day
      case 'last7days':
        return 7;
      case 'last30days':
        return 30;
      case 'last3months':
        return 90; // Daily for 3 months
      case 'monthToDate':
        return new Date().getDate(); // Days in current month so far
      case 'yearToDate':
        return Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      default:
        return Math.min(30, data.length);
    }
  };
  
  const maxPoints = getMaxPoints(datePreset);
  
  if (data.length <= maxPoints) return data;
  
  // Sample data evenly across the date range
  const step = Math.floor(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0).slice(0, maxPoints);
};

/**
 * Calculate chart bounds for better visualization
 */
export const calculateChartBounds = (values: number[]): { min: number; max: number } => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1; // 10% padding
  
  return {
    min: Math.max(0, min - padding),
    max: max + padding
  };
};

/**
 * Process category data for charts
 */
export const processCategoryData = (
  categories: Array<{ parent_category: string; revenue: number; profit: number }>
): Array<{ name: string; value: number; profit: number; percentage: number }> => {
  const totalRevenue = categories.reduce((sum, cat) => sum + cat.revenue, 0);
  
  return categories.map(cat => ({
    name: cat.parent_category,
    value: cat.revenue,
    profit: cat.profit,
    percentage: totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0
  }));
};

// =============================================================================
// PERFORMANCE UTILITIES
// =============================================================================

/**
 * Debounce function for search and filter inputs
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for performance-sensitive operations
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate dashboard filters
 */
export const validateFilters = (filters: Partial<DashboardFilters>): boolean => {
  if (!filters.dateRange) return false;
  
  const { start, end } = filters.dateRange;
  return start <= end && start <= new Date() && end <= new Date();
};

/**
 * Get default filters for new dashboard instances
 */
export const getDefaultFilters = (): DashboardFilters => {
  const { start, end } = getDateRangeForPreset('last30days');
  
  return {
    dateRange: {
      start,
      end,
      preset: 'last30days'
    },
    comparisonPeriod: 'previousPeriod'
  };
};

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Safe number formatting that handles null/undefined values
 */
export const safeFormatNumber = (value: number | null | undefined, formatter: (val: number) => string): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return formatter(value);
};

/**
 * Safe calculation that handles edge cases
 */
export const safeCalculate = (
  numerator: number | null | undefined,
  denominator: number | null | undefined,
  fallback: number = 0
): number => {
  if (!numerator || !denominator || denominator === 0) {
    return fallback;
  }
  return numerator / denominator;
};

// =============================================================================
// EXPORT ALL UTILITIES
// =============================================================================

export const dashboardUtils = {
  // Formatting
  formatCurrency,
  formatCompactCurrency,
  formatPercentage,
  formatNumber,
  formatChangePercentage,
  
  // Calculations
  calculatePercentageChange,
  calculatePeriodChanges,
  getChangeDirection,
  calculateMovingAverage,
  
  // Dates
  getDateRangeForPreset,
  getComparisonDateRange,
  formatDisplayDate,
  formatChartDate,
  formatApiDate,
  
  // Charts
  generateTrendData,
  calculateChartBounds,
  processCategoryData,
  
  // Performance
  debounce,
  throttle,
  
  // Validation
  validateFilters,
  getDefaultFilters,
  
  // Safety
  safeFormatNumber,
  safeCalculate
}; 