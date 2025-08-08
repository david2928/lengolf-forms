/**
 * Customer Detail Data Management Hook
 * Centralized data fetching and state management for customer detail modal
 * Replaces scattered useState hooks and API calls from original component
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCustomer } from '@/hooks/useCustomerManagement';
import type {
  Customer,
  TransactionRecord,
  PackageRecord,
  BookingRecord,
  CustomerAnalytics,
  UseCustomerDetailDataReturn,
  CustomerTab,
  LoadingStates,
  ErrorStates
} from '../utils/customerTypes';

/**
 * Main hook for customer detail data management
 * Implements lazy loading pattern - only fetches tab data when tab becomes active
 */
export const useCustomerDetailData = (customerId: string | null): UseCustomerDetailDataReturn => {
  // Tab state
  const [activeTab, setActiveTab] = useState<CustomerTab>('overview');
  
  // Data state
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  
  // Loading states
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    customer: false,
    transactions: false,
    packages: false,
    bookings: false,
    analytics: false
  });
  
  // Error states  
  const [errorStates, setErrorStates] = useState<ErrorStates>({
    customer: null,
    transactions: null,
    packages: null,
    bookings: null,
    analytics: null
  });
  
  // Pagination state
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsTotalPages, setBookingsTotalPages] = useState(1);
  
  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<CustomerTab>>(new Set(['overview']));
  
  // Main customer data from existing hook
  const { customer, loading: customerLoading, error: customerError, refreshCustomer } = useCustomer(customerId);
  
  // Helper to update loading state for specific tab
  const setTabLoading = useCallback((tab: keyof LoadingStates, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [tab]: loading }));
  }, []);
  
  // Helper to update error state for specific tab
  const setTabError = useCallback((tab: keyof ErrorStates, error: string | null) => {
    setErrorStates(prev => ({ ...prev, [tab]: error }));
  }, []);
  
  // Fetch transactions data
  const fetchTransactions = useCallback(async () => {
    if (!customerId || loadingStates.transactions) return;
    
    try {
      setTabLoading('transactions', true);
      setTabError('transactions', null);
      
      const response = await fetch(`/api/customers/${customerId}/transactions`);
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTransactions(data.transactions || []);
      setLoadedTabs(prev => new Set([...prev, 'transactions']));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTabError('transactions', error instanceof Error ? error.message : 'Failed to load transactions');
      setTransactions([]);
    } finally {
      setTabLoading('transactions', false);
    }
  }, [customerId, loadingStates.transactions, setTabLoading, setTabError]);
  
  // Fetch packages data
  const fetchPackages = useCallback(async () => {
    if (!customerId || loadingStates.packages) return;
    
    try {
      setTabLoading('packages', true);
      setTabError('packages', null);
      
      const response = await fetch(`/api/customers/${customerId}/packages`);
      if (!response.ok) {
        throw new Error(`Failed to fetch packages: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPackages(data.packages || []);
      setLoadedTabs(prev => new Set([...prev, 'packages']));
    } catch (error) {
      console.error('Error fetching packages:', error);
      setTabError('packages', error instanceof Error ? error.message : 'Failed to load packages');
      setPackages([]);
    } finally {
      setTabLoading('packages', false);
    }
  }, [customerId, loadingStates.packages, setTabLoading, setTabError]);
  
  // Fetch bookings data with pagination
  const fetchBookings = useCallback(async (page = 1) => {
    if (!customerId || loadingStates.bookings) return;
    
    try {
      setTabLoading('bookings', true);
      setTabError('bookings', null);
      
      const response = await fetch(`/api/customers/${customerId}/bookings?page=${page}&limit=20`);
      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.statusText}`);
      }
      
      const data = await response.json();
      setBookings(data.bookings || []);
      setBookingsPage(page);
      setBookingsTotalPages(data.totalPages || 1);
      setLoadedTabs(prev => new Set([...prev, 'bookings']));
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setTabError('bookings', error instanceof Error ? error.message : 'Failed to load bookings');
      setBookings([]);
    } finally {
      setTabLoading('bookings', false);
    }
  }, [customerId, loadingStates.bookings, setTabLoading, setTabError]);
  
  // Fetch analytics data (computed from customer data)
  const fetchAnalytics = useCallback(async () => {
    if (!customerId || !customer || loadingStates.analytics) return;
    
    try {
      setTabLoading('analytics', true);
      setTabError('analytics', null);
      
      // For now, compute analytics from customer data
      // Later this could be moved to a dedicated endpoint
      const analyticsData: CustomerAnalytics = {
        engagementScore: calculateEngagementScore(customer),
        customerTier: calculateCustomerTier(customer),
        spendingTrend: calculateSpendingTrend(customer),
        frequencyScore: calculateFrequencyScore(customer),
        monthlySpend: [], // Would be populated from transactions
        preferredTimes: [] // Would be populated from bookings
      };
      
      setAnalytics(analyticsData);
      setLoadedTabs(prev => new Set([...prev, 'analytics']));
    } catch (error) {
      console.error('Error computing analytics:', error);
      setTabError('analytics', error instanceof Error ? error.message : 'Failed to compute analytics');
      setAnalytics(null);
    } finally {
      setTabLoading('analytics', false);
    }
  }, [customerId, customer, loadingStates.analytics, setTabLoading, setTabError]);
  
  // Lazy load tab data when tab becomes active
  useEffect(() => {
    if (!customerId || !activeTab) return;
    
    // Only fetch if tab hasn't been loaded yet
    if (!loadedTabs.has(activeTab)) {
      switch (activeTab) {
        case 'transactions':
          fetchTransactions();
          break;
        case 'packages':
          fetchPackages();
          break;
        case 'bookings':
          fetchBookings(1);
          break;
        case 'analytics':
          fetchAnalytics();
          break;
      }
    }
  }, [activeTab, customerId, loadedTabs, fetchTransactions, fetchPackages, fetchBookings, fetchAnalytics]);
  
  // Refresh specific tab data
  const refreshTab = useCallback((tab: CustomerTab) => {
    if (!customerId) return;
    
    // Remove from loaded tabs to force refresh
    setLoadedTabs(prev => {
      const newSet = new Set(prev);
      newSet.delete(tab);
      return newSet;
    });
    
    // Clear existing data and trigger fetch
    switch (tab) {
      case 'transactions':
        setTransactions([]);
        fetchTransactions();
        break;
      case 'packages':
        setPackages([]);
        fetchPackages();
        break;
      case 'bookings':
        setBookings([]);
        fetchBookings(1);
        break;
      case 'analytics':
        setAnalytics(null);
        fetchAnalytics();
        break;
    }
  }, [customerId, fetchTransactions, fetchPackages, fetchBookings, fetchAnalytics]);
  
  // Handle bookings pagination
  const handleBookingsPageChange = useCallback((page: number) => {
    fetchBookings(page);
  }, [fetchBookings]);
  
  return {
    // Main customer data
    customer,
    customerLoading,
    customerError,
    
    // Tab data (lazy loaded)
    transactions,
    transactionsLoading: loadingStates.transactions,
    transactionsError: errorStates.transactions,
    
    packages,
    packagesLoading: loadingStates.packages,
    packagesError: errorStates.packages,
    
    bookings,
    bookingsLoading: loadingStates.bookings,
    bookingsError: errorStates.bookings,
    
    // Tab state
    activeTab,
    setActiveTab,
    
    // Pagination
    bookingsPage,
    setBookingsPage: handleBookingsPageChange,
    bookingsTotalPages,
    
    // Analytics
    analytics,
    analyticsLoading: loadingStates.analytics,
    analyticsError: errorStates.analytics,
    
    // Actions
    refreshCustomer,
    refreshTab
  };
};

// Analytics calculation helpers
// TODO: Move these to a separate analytics utility file

const calculateEngagementScore = (customer: Customer): number => {
  const bookings = customer.bookingSummary?.total_bookings || 0;
  const transactions = customer.transactionSummary?.transaction_count || 0;
  const avgSpend = customer.transactionSummary?.average_per_transaction || 0;
  
  // Simple scoring algorithm - can be enhanced
  const bookingScore = Math.min(bookings * 10, 40);
  const transactionScore = Math.min(transactions * 8, 30);
  const spendScore = Math.min(avgSpend / 100, 30);
  
  return Math.round(bookingScore + transactionScore + spendScore);
};

const calculateCustomerTier = (customer: Customer): CustomerAnalytics['customerTier'] => {
  const totalSpent = customer.transactionSummary?.total_spent || 0;
  
  if (totalSpent >= 50000) return 'platinum';
  if (totalSpent >= 20000) return 'gold';
  if (totalSpent >= 5000) return 'silver';
  return 'bronze';
};

const calculateSpendingTrend = (customer: Customer): CustomerAnalytics['spendingTrend'] => {
  // Placeholder - would need historical data to compute properly
  const avgSpend = customer.transactionSummary?.average_per_transaction || 0;
  if (avgSpend > 1000) return 'increasing';
  if (avgSpend > 500) return 'stable';
  return 'decreasing';
};

const calculateFrequencyScore = (customer: Customer): number => {
  const bookings = customer.bookingSummary?.total_bookings || 0;
  // Simple frequency score - can be enhanced with time-based analysis
  return Math.min(bookings * 5, 100);
};