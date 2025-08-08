/**
 * Customer Detail Modal - Optimized Version
 * Main orchestrator component for customer detail modal
 * Reduced from 1,326 lines to ~200 lines (85% reduction)
 * 
 * Following the successful time clock dashboard optimization pattern:
 * - Single responsibility: Modal orchestration only
 * - Modular components: Header, tabs, content extracted
 * - Centralized data management: useCustomerDetailData hook
 * - Performance optimized: Lazy loading, memoization
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import { CustomerFormModal } from '../customer-form-modal';
import { useCustomerDetailData } from './hooks/useCustomerDetailData';
import { CustomerHeader } from './components/CustomerHeader';
import { CustomerTabs } from './components/CustomerTabs';
import { CustomerDetailSkeleton } from './shared/CustomerDetailSkeleton';
import { CustomerDetailError } from './shared/CustomerDetailError';
import type { CustomerDetailModalProps } from './utils/customerTypes';

/**
 * Optimized Customer Detail Modal
 * 
 * Key improvements:
 * - 85% size reduction (1,326 → 200 lines)
 * - Lazy loading tabs for performance
 * - Centralized state management
 * - Modular component architecture
 * - Consistent error handling
 */
export function CustomerDetailModalOptimized({
  customerId,
  open,
  onOpenChange,
  onCustomerUpdated
}: CustomerDetailModalProps) {
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // Centralized data management with lazy loading
  const {
    customer,
    customerLoading,
    customerError,
    activeTab,
    setActiveTab,
    refreshCustomer,
    refreshTab,
    // Tab data is loaded lazily through the hook
    transactions,
    transactionsLoading,
    transactionsError,
    packages,
    packagesLoading,
    packagesError,
    bookings,
    bookingsLoading,
    bookingsError,
    bookingsPage,
    setBookingsPage,
    bookingsTotalPages,
    analytics,
    analyticsLoading,
    analyticsError
  } = useCustomerDetailData(customerId);

  // Handle customer edit completion
  const handleCustomerUpdated = useCallback(() => {
    setEditModalOpen(false);
    refreshCustomer();
    onCustomerUpdated();
  }, [refreshCustomer, onCustomerUpdated]);

  // Handle tab changes with analytics
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as any);
    
    // Optional: Track tab usage analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'customer_detail_tab_change', {
        tab_name: tab,
        customer_id: customerId
      });
    }
  }, [setActiveTab, customerId]);

  // Loading state - show skeleton while customer data loads
  if (customerLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <CustomerDetailSkeleton />
        </DialogContent>
      </Dialog>
    );
  }

  // Error state - show error with retry option
  if (customerError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <CustomerDetailError 
            error={customerError} 
            onRetry={() => refreshCustomer()}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // No customer found
  if (!customer) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <CustomerDetailError 
            error="Customer not found" 
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      {/* Main Customer Detail Modal */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            {/* Customer Header with basic info and actions */}
            <CustomerHeader
              customer={customer}
              analytics={analytics}
              onEdit={() => setEditModalOpen(true)}
              onRefresh={refreshCustomer}
            />
          </DialogHeader>

          {/* Tab Content - main modal content */}
          <div className="flex-1 overflow-hidden">
            <CustomerTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
              customer={customer}
              // Tab data passed through for lazy loading
              tabData={{
                transactions: {
                  data: transactions,
                  loading: transactionsLoading,
                  error: transactionsError,
                  onRefresh: () => refreshTab('transactions')
                },
                packages: {
                  data: packages,
                  loading: packagesLoading,
                  error: packagesError,
                  onRefresh: () => refreshTab('packages')
                },
                bookings: {
                  data: bookings,
                  loading: bookingsLoading,
                  error: bookingsError,
                  page: bookingsPage,
                  totalPages: bookingsTotalPages,
                  onPageChange: setBookingsPage,
                  onRefresh: () => refreshTab('bookings')
                },
                analytics: {
                  data: analytics,
                  loading: analyticsLoading,
                  error: analyticsError,
                  onRefresh: () => refreshTab('analytics')
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <CustomerFormModal
        customer={customer}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSave={handleCustomerUpdated}
      />
    </>
  );
}

/**
 * Display name for debugging
 */
CustomerDetailModalOptimized.displayName = 'CustomerDetailModalOptimized';