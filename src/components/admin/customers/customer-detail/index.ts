/**
 * Customer Detail Modal - Backward Compatibility Exports
 * Maintains existing import patterns while providing optimized implementation
 * Following the time clock dashboard pattern
 */

// Main component export - optimized version
export { CustomerDetailModalOptimized as CustomerDetailModal } from './CustomerDetailModalOptimized';

// Export individual components for advanced usage
export { CustomerHeader } from './components/CustomerHeader';
export { CustomerTabs } from './components/CustomerTabs';

// Export tab components
export { CustomerOverviewTab } from './tabs/CustomerOverviewTab';
export { CustomerTransactionsTab } from './tabs/CustomerTransactionsTab';  
export { CustomerPackagesTab } from './tabs/CustomerPackagesTab';
export { CustomerBookingsTab } from './tabs/CustomerBookingsTab';
export { CustomerAnalyticsTab } from './tabs/CustomerAnalyticsTab';

// Export shared components
export { ResponsiveDataView, PaginatedResponsiveDataView } from './shared/ResponsiveDataView';
export { CustomerDetailSkeleton } from './shared/CustomerDetailSkeleton';
export { CustomerDetailError, CustomerTabError } from './shared/CustomerDetailError';

// Export hooks
export { useCustomerDetailData } from './hooks/useCustomerDetailData';

// Export utilities
export * from './utils/customerFormatters';
export * from './utils/customerTypes';

// Backward compatibility - this maintains existing imports
// Any code importing from '../customer-detail-modal' will get the optimized version
export { CustomerDetailModalOptimized as default } from './CustomerDetailModalOptimized';