/**
 * Customer Tabs Component
 * Tab navigation and content management for customer detail modal
 * Handles lazy loading of tab content and consistent tab state
 */

import React from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  User,
  CreditCard,
  Package,
  Calendar,
  BarChart3,
  Loader2
} from 'lucide-react';
import { CustomerOverviewTab } from '../tabs/CustomerOverviewTab';
import { CustomerTransactionsTab } from '../tabs/CustomerTransactionsTab';
import { CustomerPackagesTab } from '../tabs/CustomerPackagesTab';
import { CustomerBookingsTab } from '../tabs/CustomerBookingsTab';
import type { 
  Customer, 
  CustomerTab, 
  TransactionRecord,
  PackageRecord,
  BookingRecord
} from '../utils/customerTypes';

interface TabData {
  transactions: {
    data: TransactionRecord[];
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
  };
  packages: {
    data: PackageRecord[];
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
  };
  bookings: {
    data: BookingRecord[];
    loading: boolean;
    error: string | null;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onRefresh: () => void;
  };
}

interface CustomerTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  customer: Customer;
  tabData: TabData;
}

/**
 * Tab configuration with icons and descriptions
 */
const TAB_CONFIG = {
  overview: {
    label: 'Overview',
    icon: User,
    description: 'Basic information and summary'
  },
  transactions: {
    label: 'Transactions',
    icon: CreditCard,
    description: 'Purchase history and payments'
  },
  packages: {
    label: 'Packages',
    icon: Package,
    description: 'Package purchases and usage'
  },
  bookings: {
    label: 'Bookings',
    icon: Calendar,
    description: 'Reservation history'
  }
} as const;

/**
 * Individual tab trigger with loading indicator
 */
const TabTriggerWithIcon: React.FC<{
  value: CustomerTab;
  isLoading?: boolean;
  count?: number;
}> = ({ value, isLoading, count }) => {
  const config = TAB_CONFIG[value];
  const IconComponent = config.icon;

  return (
    <TabsTrigger value={value} className="flex items-center space-x-2 relative">
      <div className="flex items-center space-x-2">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <IconComponent className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">{config.label}</span>
        <span className="sm:hidden">{config.label.slice(0, 3)}</span>
        {count !== undefined && count > 0 && (
          <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.2rem] text-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
    </TabsTrigger>
  );
};

/**
 * Data flow indicator to help users understand tab relationships
 */
const DataFlowIndicator: React.FC = () => (
  <div className="text-center text-xs text-muted-foreground py-2 border-b">
    Overview → Transactions & Packages & Bookings → Analytics
  </div>
);

/**
 * Customer Tabs Component
 * 
 * Features:
 * - Lazy loading of tab content
 * - Loading indicators on tabs
 * - Data count badges
 * - Consistent error handling
 * - Responsive design
 */
export const CustomerTabs: React.FC<CustomerTabsProps> = ({
  activeTab,
  onTabChange,
  customer,
  tabData
}) => {
  return (
    <Tabs 
      value={activeTab} 
      onValueChange={onTabChange} 
      className="flex flex-col h-full"
    >
      {/* Tab Navigation */}
      <div className="flex-shrink-0">
        <TabsList className="grid w-full grid-cols-5 mb-2">
          <TabTriggerWithIcon value="overview" />
          
          <TabTriggerWithIcon 
            value="transactions" 
            isLoading={tabData.transactions.loading}
            count={tabData.transactions.data.length}
          />
          
          <TabTriggerWithIcon 
            value="packages" 
            isLoading={tabData.packages.loading}
            count={tabData.packages.data.length}
          />
          
          <TabTriggerWithIcon 
            value="bookings" 
            isLoading={tabData.bookings.loading}
            count={tabData.bookings.data.length}
          />
          
        </TabsList>

        {/* Data Flow Indicator */}
        <DataFlowIndicator />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {/* Overview Tab - Always available */}
        <TabsContent value="overview" className="h-full m-0">
          <CustomerOverviewTab 
            customer={customer}
            analytics={undefined}
          />
        </TabsContent>

        {/* Transactions Tab - Lazy loaded */}
        <TabsContent value="transactions" className="h-full m-0">
          <CustomerTransactionsTab
            customerId={customer.id}
            data={tabData.transactions.data}
            loading={tabData.transactions.loading}
            error={tabData.transactions.error}
            onRefresh={tabData.transactions.onRefresh}
          />
        </TabsContent>

        {/* Packages Tab - Lazy loaded */}
        <TabsContent value="packages" className="h-full m-0">
          <CustomerPackagesTab
            customerId={customer.id}
            data={tabData.packages.data}
            loading={tabData.packages.loading}
            error={tabData.packages.error}
            onRefresh={tabData.packages.onRefresh}
          />
        </TabsContent>

        {/* Bookings Tab - Lazy loaded with pagination */}
        <TabsContent value="bookings" className="h-full m-0">
          <CustomerBookingsTab
            customerId={customer.id}
            data={tabData.bookings.data}
            loading={tabData.bookings.loading}
            error={tabData.bookings.error}
            currentPage={tabData.bookings.page}
            totalPages={tabData.bookings.totalPages}
            onPageChange={tabData.bookings.onPageChange}
            onRefresh={tabData.bookings.onRefresh}
          />
        </TabsContent>

      </div>
    </Tabs>
  );
};

/**
 * Hook for tab analytics tracking
 */
export const useTabAnalytics = (customerId: string) => {
  const trackTabView = React.useCallback((tabName: string) => {
    // Track tab views for analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'customer_detail_tab_view', {
        tab_name: tabName,
        customer_id: customerId
      });
    }
  }, [customerId]);

  return { trackTabView };
};