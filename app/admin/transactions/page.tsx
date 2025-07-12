'use client';

import { useState, useMemo } from 'react';
import { Search, RefreshCw, Calendar, X, User, CreditCard, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useTransactions, useTransactionFilters, useTransactionPagination, useTransactionKPIs } from '@/hooks/use-transactions';
import { useTransactionDetails } from '@/hooks/use-transactions';
import type { TransactionSummary } from '@/types/transactions';
import { PAYMENT_METHODS } from '@/types/transactions';
import { createTransactionColumns } from './components/transaction-columns';
import { TransactionsDataTable } from './components/transactions-data-table';
import { TransactionKPIs } from './components/transaction-kpis';

// Helper function to format date for transaction details (treat DB timestamp as already BKK time)
const formatTransactionDateTime = (dateTimeString: string) => {
  if (!dateTimeString) return 'Invalid Date';
  
  try {
    // The database timestamp is already in BKK timezone but marked as UTC
    // Remove the timezone info and parse as local time
    const cleanDateTime = dateTimeString.replace(/(\+00:00|Z)$/, '');
    const date = new Date(cleanDateTime);
    
    // Format as "June 12 2025, 23:18"
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${month} ${day} ${year}, ${hours}:${minutes}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

// Transaction Detail Modal Component - Streamlined for mobile
function TransactionDetailModal({ 
  receiptNumber, 
  isOpen, 
  onClose 
}: { 
  receiptNumber: string | null; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const { transactionDetails, isLoading, error } = useTransactionDetails(receiptNumber);

  if (!receiptNumber) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Transaction Details</DialogTitle>
        </DialogHeader>
        
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-500">Loading...</span>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            Failed to load: {error.error}
          </div>
        )}
        
        {transactionDetails && (
          <div className="space-y-4">
            {/* Transaction Header */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-mono text-lg font-bold">
                    {transactionDetails.transaction.receipt_number}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatTransactionDateTime(transactionDetails.transaction.sales_timestamp)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">
                    ฿{transactionDetails.summary.total.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {transactionDetails.summary.payment_method}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">
                  {transactionDetails.transaction.customer_name || 'Walk-in Customer'}
                </span>
                {transactionDetails.transaction.staff_name && (
                  <div className="flex items-center">
                    {(() => {
                      const staffColors = {
                        'dolly': 'bg-pink-400', 'net': 'bg-blue-400', 'may': 'bg-green-400',
                        'winnie': 'bg-purple-400', 'bank': 'bg-yellow-400', 'chris': 'bg-red-400', 'david': 'bg-indigo-400'
                      };
                      const colorClass = staffColors[transactionDetails.transaction.staff_name.toLowerCase() as keyof typeof staffColors] || 'bg-gray-400';
                      return <div className={`w-2 h-2 rounded-full ${colorClass} mr-2`} />;
                    })()}
                    <span>{transactionDetails.transaction.staff_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="font-medium mb-3">Items ({transactionDetails.items.length})</h3>
              <div className="space-y-2">
                {transactionDetails.items.map((item, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-3">
                        <div className="font-medium text-sm">
                          {item.item_cnt} x {item.product_name}
                          {item.is_sim_usage === 1 && (
                            <span className="ml-1 px-1 bg-blue-100 text-blue-700 text-xs rounded">SIM</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.product_category}
                          {item.item_notes && item.item_notes.trim() && item.item_notes !== '-' && (
                            <span className="ml-2">• {item.item_notes}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">฿{item.sales_total.toFixed(2)}</div>
                        {item.item_price_incl_vat > 0 && (
                          <div className="text-xs text-gray-500">
                            ฿{item.item_price_incl_vat.toFixed(2)}/ea
                          </div>
                        )}
                        {(item.sales_discount && item.sales_discount > 0) && (
                          <div className="text-xs text-green-600">
                            -{Math.round((item.sales_discount / (item.sales_total + item.sales_discount)) * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="border-t pt-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>฿{transactionDetails.summary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT:</span>
                  <span>฿{transactionDetails.summary.vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Total:</span>
                  <span>฿{transactionDetails.summary.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function TransactionsPage() {
  const filters = useTransactionFilters();
  const pagination = useTransactionPagination();
  
  const { transactions, isLoading, isError, refresh } = useTransactions({
    filters: filters.filters,
    pagination: pagination.pagination,
    sortBy: pagination.sortBy,
    sortOrder: pagination.sortOrder,
    enabled: true
  });

  // Add KPI data fetching
  const { kpis, isLoading: kpisLoading, error: kpisError, refresh: refreshKpis } = useTransactionKPIs(filters.filters);
  
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTransactionClick = (receiptNumber: string) => {
    setSelectedReceipt(receiptNumber);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReceipt(null);
  };

  const columns = useMemo(
    () => createTransactionColumns(handleTransactionClick),
    []
  );

  const handleRefresh = async () => {
    await refresh();
    await refreshKpis();
  };

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 p-4 text-red-600">
            Failed to load transactions. Please try again.
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="ml-2"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
        
          {/* Header - Directly on gray background */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Transactions</h1>
              <p className="text-sm sm:text-base text-gray-600">POS transaction management</p>
            </div>
            <Button 
              onClick={handleRefresh}
              disabled={isLoading || kpisLoading}
              variant="outline"
              className="flex items-center gap-2 h-9 sm:h-10 px-3 sm:px-4 bg-white"
            >
              <RefreshCw className={`h-4 w-4 ${(isLoading || kpisLoading) ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>

          {/* KPIs - Directly on gray background */}
          <TransactionKPIs 
            kpis={kpis || null} 
            isLoading={kpisLoading} 
            error={kpisError} 
          />

          {/* Filters Section - No wrapper */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-lg font-medium text-gray-900">Filters</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={filters.resetFilters}
                className="text-gray-500 hover:text-gray-700 -mr-2"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>

            {/* Date Range - Individual cards */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <DateRangePicker
                  startDate={filters.filters.dateRange.start}
                  endDate={filters.filters.dateRange.end}
                  onStartDateChange={(date) => date && filters.updateDateRange({ start: date })}
                  onEndDateChange={(date) => date && filters.updateDateRange({ end: date })}
                />
                <Button 
                  variant={filters.selectedPreset === 'today' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => filters.setDatePreset('today')}
                  className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                >
                  Today
                </Button>
                <Button 
                  variant={filters.selectedPreset === 'yesterday' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => filters.setDatePreset('yesterday')}
                  className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                >
                  Yesterday
                </Button>
                <Button 
                  variant={filters.selectedPreset === 'last7days' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => filters.setDatePreset('last7days')}
                  className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                >
                  7 Days
                </Button>
                <Button 
                  variant={filters.selectedPreset === 'last30days' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => filters.setDatePreset('last30days')}
                  className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                >
                  30 Days
                </Button>
              </div>
            </div>

            {/* Filter inputs - Mobile optimized layout */}
            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <Select 
                  value={filters.filters.paymentMethod || 'all'} 
                  onValueChange={(value) => filters.updateFilters({ 
                    paymentMethod: value === 'all' ? undefined : value 
                  })}
                >
                  <SelectTrigger className="h-9 text-sm bg-white">
                    <SelectValue placeholder="All methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    {PAYMENT_METHODS.map(method => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Staff</label>
                <Input
                  placeholder="Staff name"
                  value={filters.filters.staffName || ''}
                  onChange={(e) => filters.updateFilters({ staffName: e.target.value || undefined })}
                  className="h-9 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Customer</label>
                <Input
                  placeholder="Customer name"
                  value={filters.filters.customerName || ''}
                  onChange={(e) => filters.updateFilters({ customerName: e.target.value || undefined })}
                  className="h-9 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Min Amount (฿)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.filters.minAmount || ''}
                  onChange={(e) => filters.updateFilters({ 
                    minAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  className="h-9 text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* Transactions Section */}
          <div>
            <h2 className="text-sm sm:text-lg font-medium text-gray-900 mb-4">Transaction History</h2>
            <TransactionsDataTable 
              data={transactions}
              columns={columns}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              onTransactionClick={handleTransactionClick}
            />
          </div>

          {/* Transaction Detail Modal */}
          <TransactionDetailModal
            receiptNumber={selectedReceipt}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
          />
        </div>
      </div>
    </div>
  );
}