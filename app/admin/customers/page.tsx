/**
 * Customer Management - Main Admin Page
 * CMS-010: Customer List UI Implementation
 */

'use client';

import { useState } from 'react';
import { CustomerKPICards } from '@/components/admin/customers/customer-kpi-cards';
import { CustomerFilters } from '@/components/admin/customers/customer-filters';
import { CustomersDataTable } from '@/components/admin/customers/customers-data-table';
import { CustomerDetailModal } from '@/components/admin/customers/customer-detail-modal';
import { CustomerFormModal } from '@/components/admin/customers/customer-form-modal';
import { useCustomers } from '@/hooks/useCustomerManagement';
import type { CustomerFilters as CustomerFiltersType } from '@/hooks/useCustomerManagement';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';

export default function CustomersPage() {
  // State for filters and modals
  const [filters, setFilters] = useState<CustomerFiltersType>({
    page: 1,
    limit: 50,
    sortBy: 'fullName',
    sortOrder: 'asc'
  });
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch customers with current filters
  const { customers, pagination, kpis, loading, error, refetch } = useCustomers(filters);

  // Handle filter changes
  const handleFiltersChange = (newFilters: Partial<CustomerFiltersType>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // Handle sorting
  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sortBy: sortBy as any, sortOrder }));
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setShowDetailModal(true);
  };

  // Handle successful customer creation
  const handleCustomerCreated = () => {
    setShowCreateModal(false);
    refetch(); // Refresh the list
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
              <p className="text-gray-600 mt-2">
                Manage customer information, view analytics, and track customer interactions
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={refetch}
                disabled={loading}
                className="border-gray-300 hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Customer
              </Button>
            </div>
          </div>
        </div>

      {/* KPI Cards */}
      <CustomerKPICards kpis={kpis} loading={loading} />

      {/* Filters */}
      <CustomerFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        loading={loading}
      />

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Customer Data Table */}
        <CustomersDataTable
          customers={customers}
          pagination={pagination}
          loading={loading}
          onCustomerSelect={handleCustomerSelect}
          onPageChange={handlePageChange}
          onSortChange={handleSortChange}
          currentSort={{
            sortBy: filters.sortBy || 'fullName',
            sortOrder: filters.sortOrder || 'asc'
          }}
        />

        {/* Customer Detail Modal */}
        <CustomerDetailModal
          customerId={selectedCustomerId}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          onCustomerUpdated={refetch}
        />

        {/* Customer Create Modal */}
        <CustomerFormModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onCustomerCreated={handleCustomerCreated}
        />
      </div>
    </div>
  );
}