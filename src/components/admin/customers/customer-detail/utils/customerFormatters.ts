/**
 * Customer Detail Formatters
 * Unified formatting utilities to eliminate code duplication
 * Replaces 4+ duplicate formatting functions from original component
 */

import { format } from 'date-fns';

/**
 * Safely format date strings with consistent fallback behavior
 * Replaces: formatTransactionDate, formatPackageDate, formatBookingDate, safeFormatDate
 */
export const formatDate = (dateStr: string | null | undefined, fallback = 'Invalid Date') => {
  try {
    if (!dateStr) return fallback;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'dd MMM yyyy');
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format monetary amounts with Thai Baht currency
 * Handles string/number inputs with consistent fallback
 */
export const formatAmount = (amount: number | string | null | undefined) => {
  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    if (isNaN(numAmount)) return '฿0';
    return `฿${numAmount.toLocaleString()}`;
  } catch {
    return '฿0';
  }
};

/**
 * Format monetary amounts with proper currency formatting
 * Enhanced version with Intl.NumberFormat for better localization
 */
export const formatCurrency = (amount: number | string | null | undefined) => {
  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    if (isNaN(numAmount)) return '฿0.00';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(numAmount);
  } catch {
    return '฿0.00';
  }
};

/**
 * Format package expiration dates with specific fallbacks
 */
export const formatPackageDate = (dateStr: string | null | undefined) => {
  return formatDate(dateStr, 'N/A');
};

/**
 * Format booking dates with time if available
 */
export const formatBookingDateTime = (dateStr: string, timeStr?: string) => {
  try {
    if (!dateStr) return 'Invalid Date';
    const baseDate = formatDate(dateStr);
    if (baseDate === 'Invalid Date') return baseDate;
    
    if (timeStr) {
      return `${baseDate} at ${timeStr}`;
    }
    return baseDate;
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format time duration in minutes to human readable format
 */
export const formatDuration = (minutes: number | null | undefined) => {
  if (!minutes || minutes <= 0) return 'N/A';
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Format percentage values
 */
export const formatPercentage = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${Math.round(value)}%`;
};

/**
 * Format customer status badges
 */
export const formatCustomerStatus = (status: string) => {
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    'active': { label: 'Active', variant: 'default' },
    'inactive': { label: 'Inactive', variant: 'secondary' },
    'blocked': { label: 'Blocked', variant: 'destructive' },
    'pending': { label: 'Pending', variant: 'outline' }
  };
  
  return statusMap[status?.toLowerCase()] || { label: status || 'Unknown', variant: 'outline' };
};

/**
 * Format package status with appropriate styling
 */
export const formatPackageStatus = (status: string) => {
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    'active': { label: 'Active', variant: 'default' },
    'expired': { label: 'Expired', variant: 'destructive' },
    'unused': { label: 'Unused', variant: 'outline' },
    'fully_used': { label: 'Fully Used', variant: 'secondary' }
  };
  
  return statusMap[status?.toLowerCase()] || { label: status || 'Unknown', variant: 'outline' };
};