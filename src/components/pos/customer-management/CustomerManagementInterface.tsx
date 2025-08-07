'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerSearchBar } from './CustomerSearchBar';
import { CustomerCard } from './CustomerCard';
import { CustomerDetailModal } from './CustomerDetailModal';
import { QuickCustomerForm } from './QuickCustomerForm';
import { POSCustomer, CustomerSearchResult, CustomerFilters } from '@/types/pos';

export interface CustomerManagementInterfaceProps {
  onCustomerSelect?: (customer: POSCustomer) => void;
  selectedCustomerId?: string;
  className?: string;
}

export const CustomerManagementInterface: React.FC<CustomerManagementInterfaceProps> = ({
  onCustomerSelect,
  selectedCustomerId,
  className = ''
}) => {
  // State management
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<CustomerFilters>({
    isActive: true,
    sortBy: 'fullName',
    sortOrder: 'asc',
    page: 1,
    limit: 20
  });
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomer | null>(null);
  const [internalSelectedCustomerId, setInternalSelectedCustomerId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [recentCustomers, setRecentCustomers] = useState<POSCustomer[]>([]);
  
  // Ref to track current request and prevent race conditions
  const currentRequestRef = useRef<AbortController | null>(null);
  
  // Use direct search term - no debouncing needed with submit pattern

  // Fetch customers with search and filters
  const fetchCustomers = useCallback(async () => {
    // Cancel previous request if it exists
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }
    
    // Create new AbortController for this request
    const abortController = new AbortController();
    currentRequestRef.current = abortController;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      if (filters.isActive !== undefined) {
        params.append('isActive', filters.isActive.toString());
      }
      if (filters.sortBy) {
        params.append('sortBy', filters.sortBy);
      }
      if (filters.sortOrder) {
        params.append('sortOrder', filters.sortOrder);
      }
      params.append('page', filters.page?.toString() || '1');
      params.append('limit', filters.limit?.toString() || '20');

      const response = await fetch(`/api/customers?${params.toString()}`, {
        signal: abortController.signal
      });
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }
      
      if (response.ok) {
        const data: CustomerSearchResult = await response.json();
        
        // Transform customer data for POS interface
        const transformedCustomers = data.customers.map((customer: any) => ({
          id: customer.id || '',
          customerCode: customer.customer_code || '',
          name: customer.customer_name || '',
          phone: customer.contact_number || '',
          email: customer.email,
          lifetimeValue: customer.lifetime_spending || 0,
          lastVisit: customer.last_visit_date,
          totalVisits: customer.total_visits || 0,
          activePackages: 0, // Will be populated from detail view
          packageStatus: {
            created: 0,
            active: 0,
            expired: 0,
            depleted: 0,
            total: 0
          }, // Will be populated from detail view
          recentTransactions: customer.total_visits || 0,
          isActive: customer.is_active !== false,
          registrationDate: customer.customer_create_date || ''
        }));
        
        setCustomers(transformedCustomers);
        setTotalCount(data.pagination?.total || transformedCustomers.length);
        
        // Store recent customers for quick access
        if (!searchTerm.trim() && filters.page === 1) {
          setRecentCustomers(transformedCustomers.slice(0, 5));
        }
      } else {
        console.error('Failed to fetch customers');
      }
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error fetching customers:', error);
    } finally {
      // Only set loading to false if this is still the current request
      if (currentRequestRef.current === abortController) {
        setLoading(false);
        currentRequestRef.current = null;
      }
    }
  }, [searchTerm, filters]);

  // Initial load and search effect
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
    };
  }, []);

  // Handle customer selection
  const handleCustomerSelect = (customer: POSCustomer) => {
    setSelectedCustomer(customer);
    setInternalSelectedCustomerId(customer.id); // Update internal selection for visual feedback
    onCustomerSelect?.(customer);
  };

  // Handle customer detail view
  const handleCustomerDetail = (customer: POSCustomer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  // Handle new customer creation success
  const handleCustomerCreated = (newCustomer: any) => {
    setShowCreateForm(false);
    
    // Transform the customer data to POSCustomer format
    const posCustomer: POSCustomer = {
      id: newCustomer.id,
      customerCode: newCustomer.customer_code,
      name: newCustomer.customer_name,
      phone: newCustomer.contact_number,
      email: newCustomer.email,
      lifetimeValue: 0,
      lastVisit: undefined,
      totalVisits: 0,
      activePackages: 0,
      packageStatus: {
        created: 0,
        active: 0,
        expired: 0,
        depleted: 0,
        total: 0
      },
      recentTransactions: 0,
      isActive: true,
      registrationDate: newCustomer.created_at || new Date().toISOString()
    };
    
    // Select the newly created customer
    handleCustomerSelect(posCustomer);
    
    // Refresh customer list
    fetchCustomers();
  };

  // Handle selecting an existing customer (from duplicate selection)
  const handleExistingCustomerSelect = (existingCustomer: any) => {
    setShowCreateForm(false);
    
    // Clear any existing search to make sure the selected customer is visible
    setSearchTerm('');
    setFilters(prev => ({ 
      ...prev, 
      page: 1,
      isActive: true // Show active customers 
    }));
    
    // Transform the existing customer data to POSCustomer format
    const posCustomer: POSCustomer = {
      id: existingCustomer.id,
      customerCode: existingCustomer.customer_code,
      name: existingCustomer.customer_name,
      phone: existingCustomer.contact_number,
      email: existingCustomer.email,
      lifetimeValue: 0,
      lastVisit: undefined,
      totalVisits: 0,
      activePackages: 0,
      packageStatus: {
        created: 0,
        active: 0,
        expired: 0,
        depleted: 0,
        total: 0
      },
      recentTransactions: 0,
      isActive: true,
      registrationDate: new Date().toISOString()
    };
    
    // Select the existing customer directly
    handleCustomerSelect(posCustomer);
    
    // Open the customer detail modal immediately to show the selected customer
    setShowDetailModal(true);
    
    // Refresh the customer list to ensure the selected customer is visible
    setTimeout(() => {
      fetchCustomers();
    }, 100);
  };

  // Handle search term change - only called on explicit search submission
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setFilters(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Handle filter changes - memoized to prevent unnecessary re-renders
  const handleFilterChange = useCallback((newFilters: Partial<CustomerFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  // Search component now uses local state with explicit submission

  return (
    <div className={`h-full flex flex-col bg-gray-50 ${className}`}>
      <div className="flex-1 flex flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full space-y-6">
          
          {/* Header with Search and Quick Actions */}
          <div className="space-y-4">
            {/* Search and Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <CustomerSearchBar
                  searchTerm={searchTerm}
                  onSearchChange={handleSearchChange}
                  filters={filters}
                  onFiltersChange={handleFilterChange}
                  loading={loading}
                />
              </div>
              
              <Button
                onClick={() => setShowCreateForm(true)}
                className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </div>

          {/* Customer Results */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {searchTerm.trim()
                  ? `Search Results (${totalCount})`
                  : `All Customers (${totalCount})`
                }
              </h2>
              
              {searchTerm.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setFilters(prev => ({ ...prev, page: 1 }));
                  }}
                >
                  Clear Search
                </Button>
              )}
            </div>

            {/* Customer Grid */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-gray-500">Loading customers...</span>
                  </div>
                </div>
              ) : customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Users className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm.trim() ? 'No customers found' : 'No customers yet'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm.trim() 
                      ? 'Try adjusting your search terms'
                      : 'Get started by adding your first customer'
                    }
                  </p>
                  {!searchTerm.trim() && (
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Customer
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {customers.map((customer) => (
                    <CustomerCard
                      key={customer.id}
                      customer={customer}
                      onSelect={() => handleCustomerSelect(customer)}
                      onDetail={() => handleCustomerDetail(customer)}
                      isSelected={selectedCustomerId === customer.id || internalSelectedCustomerId === customer.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <QuickCustomerForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={handleCustomerCreated}
        onSelectExisting={handleExistingCustomerSelect}
      />

      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onCustomerUpdated={fetchCustomers}
      />
    </div>
  );
};