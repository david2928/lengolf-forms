/**
 * Customer Detail TypeScript Interfaces
 * Centralized type definitions for customer detail modal components
 */

// Main component props
export interface CustomerDetailModalProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerUpdated: () => void;
}

// Data record interfaces
export interface TransactionRecord {
  id: string;
  date: string;
  receipt_number: string;
  sales_net: number | string;
  items?: string;
  item_count?: number;
  payment_method?: string;
  staff?: string;
}

export interface PackageRecord {
  id: string;
  package_name: string;
  purchase_date: string;
  expiration_date?: string | null;
  first_use_date?: string | null;
  uses_remaining?: number | null;
  original_uses?: number | null;
  status: 'active' | 'expired' | 'unused' | 'fully_used' | string;
  usage_percentage?: number;
}

export interface BookingRecord {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  package_used?: string | null;
  bay?: string | null;
  duration?: number | null;
  number_of_people?: number;
}

// Customer data structure (from useCustomer hook)
export interface Customer {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  line_user_id?: string;
  created_at: string;
  updated_at: string;
  // Analytics fields
  total_spent?: number;
  total_bookings?: number;
  last_booking_date?: string;
  packages_purchased?: number;
  average_spend_per_visit?: number;
  bookingSummary?: {
    total_bookings: number;
    last_booking_date?: string;
    average_duration?: number;
  };
  transactionSummary?: {
    total_spent: number;
    transaction_count: number;
    average_per_transaction: number;
  };
}

// Tab-specific data interfaces
export interface CustomerTransactionsData {
  transactions: TransactionRecord[];
  pagination?: {
    page: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface CustomerPackagesData {
  packages: PackageRecord[];
  activeCount: number;
  expiredCount: number;
}

export interface CustomerBookingsData {
  bookings: BookingRecord[];
  pagination?: {
    page: number;
    totalPages: number;
    totalCount: number;
  };
}

// Analytics interfaces
export interface CustomerAnalytics {
  engagementScore: number;
  customerTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  spendingTrend: 'increasing' | 'stable' | 'decreasing';
  frequencyScore: number;
  monthlySpend: Array<{
    month: string;
    amount: number;
  }>;
  preferredTimes: Array<{
    timeSlot: string;
    bookingCount: number;
  }>;
}

// Component-specific props
export interface CustomerHeaderProps {
  customer: Customer;
  analytics?: CustomerAnalytics;
  onEdit: () => void;
}

export interface CustomerTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  customer: Customer;
}

export interface CustomerOverviewTabProps {
  customer: Customer;
  analytics?: CustomerAnalytics;
}

export interface CustomerTransactionsTabProps {
  customerId: string;
  isActive?: boolean;
}

export interface CustomerPackagesTabProps {
  customerId: string;
  isActive?: boolean;
}

export interface CustomerBookingsTabProps {
  customerId: string;
  isActive?: boolean;
}

export interface CustomerAnalyticsTabProps {
  customer: Customer;
  analytics: CustomerAnalytics;
}

// Shared component props
export interface ResponsiveDataViewProps<T> {
  data: T[];
  loading: boolean;
  renderCard: (item: T, index: number) => JSX.Element;
  renderTable: () => JSX.Element;
  emptyState: string;
  error?: string | null;
}

// Card component props
export interface TransactionCardProps {
  transaction: TransactionRecord;
}

export interface PackageCardProps {
  package: PackageRecord;
}

export interface BookingCardProps {
  booking: BookingRecord;
}

// Table component props
export interface TransactionsTableProps {
  transactions: TransactionRecord[];
}

export interface PackagesTableProps {
  packages: PackageRecord[];
}

export interface BookingsTableProps {
  bookings: BookingRecord[];
}

// Hook return types
export interface UseCustomerDetailDataReturn {
  // Main customer data
  customer: Customer | null;
  customerLoading: boolean;
  customerError: string | null;
  
  // Tab data (lazy loaded)
  transactions: TransactionRecord[];
  transactionsLoading: boolean;
  transactionsError: string | null;
  
  packages: PackageRecord[];
  packagesLoading: boolean;
  packagesError: string | null;
  
  bookings: BookingRecord[];
  bookingsLoading: boolean;
  bookingsError: string | null;
  
  // Tab state
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Pagination for bookings
  bookingsPage: number;
  setBookingsPage: (page: number) => void;
  bookingsTotalPages: number;
  
  // Analytics
  analytics: CustomerAnalytics | null;
  analyticsLoading: boolean;
  analyticsError: string | null;
  
  // Actions
  refreshCustomer: () => void;
  refreshTab: (tab: string) => void;
}

export interface UseCustomerAnalyticsReturn {
  analytics: CustomerAnalytics | null;
  loading: boolean;
  error: string | null;
}

// API response types
export interface CustomerDetailApiResponse {
  customer: Customer;
  transactions?: TransactionRecord[];
  packages?: PackageRecord[];
  bookings?: BookingRecord[];
}

// Tab identifiers
export type CustomerTab = 'overview' | 'transactions' | 'packages' | 'bookings';

// Loading states
export interface LoadingStates {
  customer: boolean;
  transactions: boolean;
  packages: boolean;
  bookings: boolean;
}

// Error states
export interface ErrorStates {
  customer: string | null;
  transactions: string | null;
  packages: string | null;
  bookings: string | null;
}

// Pagination configuration
export interface PaginationConfig {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}