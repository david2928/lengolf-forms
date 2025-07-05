import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import type { 
  TransactionsListResponse, 
  TransactionDetailsResponse,
  TransactionFilters,
  TransactionSummary,
  TransactionDetails,
  TransactionError,
  TransactionKPIs,
  TransactionKPIResponse,
  UseTransactionsOptions,
  UseTransactionsReturn,
  UseTransactionDetailsReturn
} from '@/types/transactions';
import { DEFAULT_FILTERS, DEFAULT_PAGINATION } from '@/types/transactions';
import { getBangkokToday, getBangkokNow, parseBangkokTime, formatBangkokTime } from '@/lib/bangkok-timezone';

// API fetcher functions
async function fetchTransactions(
  filters: TransactionFilters,
  pagination: { page: number; limit: number },
  sortBy: string,
  sortOrder: string
): Promise<TransactionsListResponse> {
  // Use Bangkok timezone for date formatting to avoid UTC conversion issues
  const startDate = formatBangkokTime(filters.dateRange.start, 'yyyy-MM-dd');
  const endDate = formatBangkokTime(filters.dateRange.end, 'yyyy-MM-dd');

  // Debug logging for API request
  console.log('🔍 API Request Debug:', {
    originalStartDate: filters.dateRange.start.toISOString(),
    originalEndDate: filters.dateRange.end.toISOString(),
    bangkokStartDate: startDate,
    bangkokEndDate: endDate,
    filters: {
      status: filters.status || 'ALL',
      paymentMethod: filters.paymentMethod,
      staffName: filters.staffName,
      customerName: filters.customerName
    }
  });

  const response = await fetch('/api/admin/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate,
      endDate,
      status: filters.status || 'ALL',
      paymentMethod: filters.paymentMethod,
      staffName: filters.staffName,
      customerName: filters.customerName,
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount,
      hasSimUsage: filters.hasSimUsage,
      page: pagination.page,
      limit: pagination.limit,
      sortBy,
      sortOrder
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch transactions');
  }

  return response.json();
}

async function fetchTransactionDetails(receiptNumber: string): Promise<TransactionDetailsResponse> {
  const response = await fetch(`/api/admin/transactions/${receiptNumber}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.details || 'Failed to fetch transaction details');
  }

  return response.json();
}

// Hook for transactions list
export function useTransactions(options: UseTransactionsOptions): UseTransactionsReturn {
  const {
    filters = DEFAULT_FILTERS,
    pagination = DEFAULT_PAGINATION,
    sortBy = 'sales_timestamp',
    sortOrder = 'desc',
    enabled = true
  } = options;

  const cacheKey = enabled ? [
    'transactions',
    filters,
    pagination,
    sortBy,
    sortOrder
  ] : null;

  const {
    data: response,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR(
    cacheKey,
    () => fetchTransactions(filters, pagination, sortBy, sortOrder),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0,
      dedupingInterval: 5000, // 5 seconds
    }
  );

  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const isError = !!error;
  const transactionError: TransactionError | null = error ? {
    error: error.message,
    code: 'TRANSACTIONS_FETCH_ERROR',
    details: error.message,
    timestamp: new Date().toISOString()
  } : null;

  return {
    transactions: response?.data || [],
    pagination: response?.pagination || { ...pagination, total: 0, totalPages: 0 },
    isLoading,
    isValidating,
    isError,
    error: transactionError,
    mutate,
    refresh
  };
}

// Hook for transaction details
export function useTransactionDetails(receiptNumber: string | null): UseTransactionDetailsReturn {
  const cacheKey = receiptNumber ? ['transaction-details', receiptNumber] : null;

  const {
    data: response,
    error,
    isLoading,
    mutate
  } = useSWR(
    cacheKey,
    () => receiptNumber ? fetchTransactionDetails(receiptNumber) : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0,
      dedupingInterval: 10000, // 10 seconds
    }
  );

  const isError = !!error;
  const transactionError: TransactionError | null = error ? {
    error: error.message,
    code: 'TRANSACTION_DETAILS_ERROR',
    details: error.message,
    timestamp: new Date().toISOString()
  } : null;

  return {
    transactionDetails: response?.data || null,
    isLoading,
    isError,
    error: transactionError,
    mutate
  };
}

// Hook for transaction KPIs
export function useTransactionKPIs(filters: TransactionFilters) {
  const { data, error, isLoading, mutate } = useSWR(
    ['/api/admin/transactions/kpis', filters],
    async ([url, filters]) => {
      // Use Bangkok timezone for date formatting to avoid UTC conversion issues
      const startDate = formatBangkokTime(filters.dateRange.start, 'yyyy-MM-dd');
      const endDate = formatBangkokTime(filters.dateRange.end, 'yyyy-MM-dd');
      
      // Calculate comparison date range (previous period) using Bangkok timezone
      const daysDiff = Math.ceil((filters.dateRange.end.getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      const compareStart = new Date(filters.dateRange.start.getTime() - (daysDiff * 24 * 60 * 60 * 1000));
      const compareEnd = new Date(filters.dateRange.start.getTime() - (1 * 24 * 60 * 60 * 1000));
      const compareStartDate = formatBangkokTime(compareStart, 'yyyy-MM-dd');
      const compareEndDate = formatBangkokTime(compareEnd, 'yyyy-MM-dd');

      // Debug logging for KPI request
      console.log('📊 KPI Request Debug:', {
        startDate,
        endDate,
        compareStartDate,
        compareEndDate,
        originalDates: {
          start: filters.dateRange.start.toISOString(),
          end: filters.dateRange.end.toISOString()
        }
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          compareStartDate,
          compareEndDate
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch KPIs');
      }

      const result: TransactionKPIResponse = await response.json();
      return result.data.current_period;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0
    }
  );

  return {
    kpis: data,
    isLoading,
    error,
    refresh: mutate
  };
}

// Utility to get comparison date range
export function getComparisonDateRange(start: Date, end: Date): { start: Date; end: Date } {
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const compareStart = new Date(start.getTime() - (daysDiff * 24 * 60 * 60 * 1000));
  const compareEnd = new Date(start.getTime() - (1 * 24 * 60 * 60 * 1000));
  
  return { start: compareStart, end: compareEnd };
}

// Utility hooks
export function useTransactionFilters() {
  // Initialize with correct Bangkok timezone
  const [filters, setFilters] = useState<TransactionFilters>(() => {
    const bangkokToday = getBangkokToday();
    return {
      ...DEFAULT_FILTERS,
      dateRange: {
        start: parseBangkokTime(`${bangkokToday} 00:00:00`),
        end: parseBangkokTime(`${bangkokToday} 23:59:59`)
      }
    };
  });
  const [selectedPreset, setSelectedPreset] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | null>('today');

  const updateFilters = useCallback((newFilters: Partial<TransactionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    // Clear preset selection when manually updating filters
    setSelectedPreset(null);
  }, []);

  const updateDateRange = useCallback((dateUpdate: Partial<{ start: Date; end: Date }>) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        ...dateUpdate
      }
    }));
    // Clear preset selection when manually updating date range
    setSelectedPreset(null);
  }, []);

  const setDatePreset = useCallback((preset: 'today' | 'yesterday' | 'last7days' | 'last30days') => {
    // Get Bangkok today as YYYY-MM-DD string
    const bangkokToday = getBangkokToday();
    let startDateStr: string, endDateStr: string;

    // Debug logging
    console.log('🕐 Date Filter Debug:', {
      preset,
      bangkokToday,
      systemDate: new Date().toISOString()
    });

    switch (preset) {
      case 'today':
        startDateStr = bangkokToday;
        endDateStr = bangkokToday;
        break;
      case 'yesterday':
        // Calculate yesterday in Bangkok timezone
        const yesterdayDate = new Date(bangkokToday);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
        startDateStr = yesterdayStr;
        endDateStr = yesterdayStr;
        break;
      case 'last7days':
        // Calculate 6 days ago to today (7 days total)
        const sevenDaysAgoDate = new Date(bangkokToday);
        sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 6);
        const sevenDaysAgoStr = sevenDaysAgoDate.toISOString().split('T')[0];
        startDateStr = sevenDaysAgoStr;
        endDateStr = bangkokToday;
        break;
      case 'last30days':
        // Calculate 29 days ago to today (30 days total)
        const thirtyDaysAgoDate = new Date(bangkokToday);
        thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 29);
        const thirtyDaysAgoStr = thirtyDaysAgoDate.toISOString().split('T')[0];
        startDateStr = thirtyDaysAgoStr;
        endDateStr = bangkokToday;
        break;
      default:
        startDateStr = bangkokToday;
        endDateStr = bangkokToday;
    }

    // Create Date objects with Bangkok timezone that will format correctly for API
    const start = parseBangkokTime(`${startDateStr} 00:00:00`);
    const end = parseBangkokTime(`${endDateStr} 23:59:59`);

    // Debug logging for calculated dates
    console.log('📅 Calculated Date Range:', {
      preset,
      startDateStr,
      endDateStr,
      bangkokFormatted: {
        start: formatBangkokTime(start, 'yyyy-MM-dd'),
        end: formatBangkokTime(end, 'yyyy-MM-dd')
      },
      isoFormatted: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    });

    setFilters(prev => ({
      ...prev,
      dateRange: { start, end }
    }));
    setSelectedPreset(preset);
  }, []);

  const resetFilters = useCallback(() => {
    const bangkokToday = getBangkokToday();
    setFilters({
      ...DEFAULT_FILTERS,
      dateRange: {
        start: parseBangkokTime(`${bangkokToday} 00:00:00`),
        end: parseBangkokTime(`${bangkokToday} 23:59:59`)
      }
    });
    setSelectedPreset('today');
  }, []);

  return {
    filters,
    selectedPreset,
    updateFilters,
    updateDateRange,
    setDatePreset,
    resetFilters,
    setFilters
  };
}

export function useTransactionPagination() {
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [sortBy, setSortBy] = useState<'sales_timestamp' | 'total_amount' | 'customer_name'>('sales_timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const updatePagination = useCallback((newPagination: Partial<typeof pagination>) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
  }, []);

  const updateSort = useCallback((field: typeof sortBy, order: typeof sortOrder) => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  const resetPagination = useCallback(() => {
    setPagination(DEFAULT_PAGINATION);
  }, []);

  return {
    pagination,
    sortBy,
    sortOrder,
    updatePagination,
    updateSort,
    resetPagination
  };
} 