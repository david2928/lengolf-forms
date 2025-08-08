/**
 * Customer Detail Modal Tests
 * Tests for the extracted data management layer
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useCustomerDetailData } from './hooks/useCustomerDetailData';
import { formatDate, formatAmount, formatCurrency } from './utils/customerFormatters';

// Mock the useCustomer hook
jest.mock('@/hooks/useCustomerManagement', () => ({
  useCustomer: jest.fn(() => ({
    customer: {
      id: 'test-customer',
      first_name: 'John',
      last_name: 'Doe',
      phone: '1234567890',
      email: 'john@example.com',
      bookingSummary: {
        total_bookings: 5,
        last_booking_date: '2025-01-01'
      },
      transactionSummary: {
        total_spent: 1000,
        transaction_count: 3,
        average_per_transaction: 333.33
      }
    },
    loading: false,
    error: null,
    refreshCustomer: jest.fn()
  }))
}));

// Mock fetch
global.fetch = jest.fn();

describe('Customer Detail Data Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('useCustomerDetailData hook', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useCustomerDetailData('test-customer'));

      expect(result.current.activeTab).toBe('overview');
      expect(result.current.transactions).toEqual([]);
      expect(result.current.packages).toEqual([]);
      expect(result.current.bookings).toEqual([]);
      expect(result.current.analytics).toBeNull();
      expect(result.current.customerLoading).toBe(false);
    });

    it('should return null customer when customerId is null', () => {
      const { result } = renderHook(() => useCustomerDetailData(null));
      
      expect(result.current.customer).toBeNull();
    });

    it('should handle tab switching correctly', () => {
      const { result } = renderHook(() => useCustomerDetailData('test-customer'));

      expect(result.current.activeTab).toBe('overview');
      
      // Switch to transactions tab
      result.current.setActiveTab('transactions');
      expect(result.current.activeTab).toBe('transactions');
    });

    it('should calculate analytics correctly', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ transactions: [] })
      });

      const { result } = renderHook(() => useCustomerDetailData('test-customer'));

      // Switch to analytics tab to trigger calculation
      result.current.setActiveTab('analytics');

      await waitFor(() => {
        expect(result.current.analytics).not.toBeNull();
      });

      // Check that analytics are calculated based on customer data
      expect(result.current.analytics?.customerTier).toBe('bronze'); // 1000 total spent = bronze
      expect(result.current.analytics?.engagementScore).toBeGreaterThan(0);
    });
  });

  describe('Customer Formatters', () => {
    it('should format dates correctly', () => {
      expect(formatDate('2025-01-15')).toBe('15 Jan 2025');
      expect(formatDate(null)).toBe('Invalid Date');
      expect(formatDate(undefined)).toBe('Invalid Date');
      expect(formatDate('invalid-date')).toBe('Invalid Date');
      expect(formatDate('2025-01-15', 'Custom Fallback')).toBe('15 Jan 2025');
      expect(formatDate(null, 'Custom Fallback')).toBe('Custom Fallback');
    });

    it('should format amounts correctly', () => {
      expect(formatAmount(1000)).toBe('฿1,000');
      expect(formatAmount('1500.50')).toBe('฿1,501'); // parseInt rounds
      expect(formatAmount(null)).toBe('฿0');
      expect(formatAmount(undefined)).toBe('฿0');
      expect(formatAmount('invalid')).toBe('฿0');
      expect(formatAmount(0)).toBe('฿0');
    });

    it('should format currency with proper formatting', () => {
      expect(formatCurrency(1000)).toBe('฿1,000.00');
      expect(formatCurrency('1500.75')).toBe('฿1,500.75');
      expect(formatCurrency(null)).toBe('฿0.00');
      expect(formatCurrency(undefined)).toBe('฿0.00');
    });
  });

  describe('Analytics Calculations', () => {
    const mockCustomer = {
      id: 'test',
      bookingSummary: {
        total_bookings: 10,
        last_booking_date: '2025-01-01'
      },
      transactionSummary: {
        total_spent: 25000,
        transaction_count: 8,
        average_per_transaction: 3125
      }
    };

    // Test the analytics calculation functions indirectly through the hook
    it('should calculate customer tier correctly', async () => {
      const mockUseCustomer = require('@/hooks/useCustomerManagement').useCustomer;
      mockUseCustomer.mockReturnValue({
        customer: mockCustomer,
        loading: false,
        error: null,
        refreshCustomer: jest.fn()
      });

      const { result } = renderHook(() => useCustomerDetailData('test-customer'));
      
      result.current.setActiveTab('analytics');

      await waitFor(() => {
        expect(result.current.analytics?.customerTier).toBe('gold'); // 25000 spent = gold tier
      });
    });

    it('should calculate engagement score', async () => {
      const mockUseCustomer = require('@/hooks/useCustomerManagement').useCustomer;
      mockUseCustomer.mockReturnValue({
        customer: mockCustomer,
        loading: false,
        error: null,
        refreshCustomer: jest.fn()
      });

      const { result } = renderHook(() => useCustomerDetailData('test-customer'));
      
      result.current.setActiveTab('analytics');

      await waitFor(() => {
        expect(result.current.analytics?.engagementScore).toBeGreaterThan(50);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useCustomerDetailData('test-customer'));

      result.current.setActiveTab('transactions');

      await waitFor(() => {
        expect(result.current.transactionsError).toBe('Network error');
        expect(result.current.transactionsLoading).toBe(false);
        expect(result.current.transactions).toEqual([]);
      });
    });

    it('should handle HTTP errors correctly', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });

      const { result } = renderHook(() => useCustomerDetailData('test-customer'));

      result.current.setActiveTab('packages');

      await waitFor(() => {
        expect(result.current.packagesError).toBe('Failed to fetch packages: Not Found');
        expect(result.current.packagesLoading).toBe(false);
      });
    });
  });

  describe('Lazy Loading', () => {
    it('should not fetch tab data until tab is active', () => {
      const { result } = renderHook(() => useCustomerDetailData('test-customer'));

      // Should start on overview tab
      expect(result.current.activeTab).toBe('overview');
      
      // Should not have made any fetch calls yet
      expect(fetch).not.toHaveBeenCalled();
      
      // Switching to transactions should trigger fetch
      result.current.setActiveTab('transactions');
      
      expect(fetch).toHaveBeenCalledWith('/api/customers/test-customer/transactions');
    });

    it('should cache loaded tab data', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ transactions: [{ id: '1', date: '2025-01-01', sales_net: 100 }] })
        });

      const { result } = renderHook(() => useCustomerDetailData('test-customer'));

      // Load transactions
      result.current.setActiveTab('transactions');
      
      await waitFor(() => {
        expect(result.current.transactions).toHaveLength(1);
      });

      // Switch away and back
      result.current.setActiveTab('overview');
      result.current.setActiveTab('transactions');

      // Should not make another API call
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result.current.transactions).toHaveLength(1);
    });
  });
});