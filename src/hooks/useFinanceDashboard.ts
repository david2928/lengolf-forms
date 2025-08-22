import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';

// Types for finance dashboard data
export interface PLData {
  month: string;
  is_current_month: boolean;
  days_elapsed: number;
  days_in_month: number;
  data_sources: {
    has_historical_data: boolean;
    has_pos_data: boolean;
    has_marketing_data: boolean;
  };
  revenue: {
    total_sales: number;
    net_sales: number;
    manual_revenue: number;
    combined_total: number;
    combined_net: number;
    historical_total_sales: number;
    historical_net_sales: number;
  };
  cogs: {
    pos_cogs: number;
    total_cogs: number;
    historical_cogs: number;
  };
  gross_profit: {
    calculated: number;
    pos_gross_profit: number;
    historical_gross_profit: number;
  };
  operating_expenses: {
    calculated_total: number;
    historical_total: number;
    detail?: Record<string, number>;
    by_category?: Record<string, Array<{
      expense_category: string;
      expense_subcategory: string;
      expense_type_name: string;
      subcategory_name: string;
      amount: number;
      full_monthly_amount: number;
      display_order: number;
      is_fixed: boolean;
    }>>;
  };
  marketing_expenses: {
    google_ads: number;
    meta_ads: number;
    manual_expenses: number;
    calculated_total: number;
    historical_total: number;
  };
  ebitda: {
    calculated: number;
    historical_ebitda: number;
  };
  run_rate_projections?: {
    total_sales: number;
    net_sales: number;
    combined_total: number;
    combined_net: number;
    total_cogs: number;
    gross_profit: number;
    google_ads: number;
    meta_ads: number;
    operating_expenses: number;
    operating_expenses_detail?: Record<string, number>;
    operating_expenses_by_category?: Record<string, Array<{
      expense_category: string;
      expense_subcategory: string;
      expense_type_name: string;
      subcategory_name: string;
      amount: number;
      full_monthly_amount: number;
      display_order: number;
      is_fixed: boolean;
    }>>;
    ebitda: number;
  };
  historical_data: Record<string, any>;
}

export interface TrendsData {
  trends: Array<{
    month: string;
    total_sales: number;
    gross_profit: number;
    ebitda: number;
    historical_total_sales: number;
    historical_ebitda: number;
  }>;
}

export interface KPIData {
  total_revenue: number;
  gross_margin_pct: number;
  ebitda: number;
  mom_growth_pct: number;
  revenue_runrate?: number;
  ebitda_runrate?: number;
}

interface FinanceDashboardOptions {
  month: string;
  includeRunRate?: boolean;
  refreshInterval?: number;
  enabled?: boolean;
}

interface FinanceDashboardData {
  plData: PLData | null;
  trendsData: TrendsData | null;
  kpiData: KPIData | null;
}

// Fetcher functions
const fetchPLStatement = async (url: string): Promise<PLData> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch P&L data: ${response.statusText}`);
  }
  return await response.json();
};

const fetchTrends = async (url: string): Promise<TrendsData> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch trends data: ${response.statusText}`);
  }
  return await response.json();
};

const fetchComparison = async (url: string): Promise<any> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch comparison data: ${response.statusText}`);
  }
  return await response.json();
};

export function useFinanceDashboard(options: FinanceDashboardOptions) {
  const { month, includeRunRate = false, refreshInterval = 0, enabled = true } = options;

  // Construct API URLs
  const plUrl = `/api/finance/pl-statement?month=${month}${includeRunRate ? '&includeRunRate=true' : ''}`;
  const trendsUrl = `/api/finance/trends`;
  const kpisUrl = `/api/finance/kpis?month=${month}`;

  // Fetch P&L data
  const { 
    data: plData, 
    error: plError, 
    isLoading: plLoading,
    isValidating: plValidating
  } = useSWR(
    enabled ? plUrl : null,
    fetchPLStatement,
    {
      refreshInterval,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000
    }
  );

  // Fetch trends data
  const { 
    data: trendsData, 
    error: trendsError, 
    isLoading: trendsLoading 
  } = useSWR(
    enabled ? trendsUrl : null,
    fetchTrends,
    {
      refreshInterval: refreshInterval * 2, // Refresh trends less frequently
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  );

  // Fetch KPI data
  const { 
    data: kpiData, 
    error: kpiError, 
    isLoading: kpiLoading 
  } = useSWR(
    enabled ? kpisUrl : null,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch KPI data: ${response.statusText}`);
      }
      return await response.json();
    },
    {
      refreshInterval,
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  );

  // Combined loading state
  const isLoading = plLoading || trendsLoading || kpiLoading;
  const isValidating = plValidating;
  
  // Combined error state
  const error = plError || trendsError || kpiError;
  const isError = !!error;

  // Refresh function
  const refresh = useCallback(() => {
    mutate(plUrl);
    mutate(trendsUrl);
    mutate(kpisUrl);
  }, [plUrl, trendsUrl, kpisUrl]);

  // Return combined data
  const data: FinanceDashboardData = {
    plData: plData || null,
    trendsData: trendsData || null,
    kpiData: kpiData || null
  };

  return {
    data,
    isLoading,
    isValidating,
    isError,
    error,
    refresh
  };
}

// Hook for manual entries management
export function useManualEntries(type: 'revenue' | 'expense', month?: string) {
  const url = `/api/finance/manual-entries?type=${type}${month ? `&month=${month}` : ''}`;

  const { data, error, isLoading, mutate: refreshEntries } = useSWR(
    url,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} entries`);
      }
      return await response.json();
    }
  );

  const addEntry = useCallback(async (entryData: any) => {
    const response = await fetch('/api/finance/manual-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...entryData })
    });

    if (!response.ok) {
      throw new Error(`Failed to add ${type} entry`);
    }

    const result = await response.json();
    refreshEntries(); // Refresh the list
    return result;
  }, [type, refreshEntries]);

  const updateEntry = useCallback(async (id: string, entryData: any) => {
    const response = await fetch(`/api/finance/manual-entries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...entryData })
    });

    if (!response.ok) {
      throw new Error(`Failed to update ${type} entry`);
    }

    const result = await response.json();
    refreshEntries(); // Refresh the list
    return result;
  }, [type, refreshEntries]);

  const deleteEntry = useCallback(async (id: string) => {
    const response = await fetch(`/api/finance/manual-entries/${id}?type=${type}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete ${type} entry`);
    }

    refreshEntries(); // Refresh the list
  }, [type, refreshEntries]);

  return {
    entries: data || [],
    isLoading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    refresh: refreshEntries
  };
}

// Hook for operating expenses management
export function useOperatingExpenses(effectiveDate?: string) {
  const url = `/api/finance/operating-expenses${effectiveDate ? `?effectiveDate=${effectiveDate}` : ''}`;

  const { data, error, isLoading, mutate: refreshExpenses } = useSWR(
    url,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch operating expenses');
      }
      return await response.json();
    }
  );

  const addExpense = useCallback(async (expenseData: any) => {
    const response = await fetch('/api/finance/operating-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseData)
    });

    if (!response.ok) {
      throw new Error('Failed to add operating expense');
    }

    const result = await response.json();
    refreshExpenses(); // Refresh the list
    return result;
  }, [refreshExpenses]);

  const updateExpense = useCallback(async (id: string, expenseData: any) => {
    const response = await fetch(`/api/finance/operating-expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseData)
    });

    if (!response.ok) {
      throw new Error('Failed to update operating expense');
    }

    const result = await response.json();
    refreshExpenses(); // Refresh the list
    return result;
  }, [refreshExpenses]);

  const deleteExpense = useCallback(async (id: string) => {
    const response = await fetch(`/api/finance/operating-expenses/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete operating expense');
    }

    refreshExpenses(); // Refresh the list
  }, [refreshExpenses]);

  return {
    expenses: data || [],
    isLoading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    refresh: refreshExpenses
  };
}