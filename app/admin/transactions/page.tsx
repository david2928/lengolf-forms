'use client';

import { useState, useMemo } from 'react';
import { Search, RefreshCw, Calendar, X, User, CreditCard } from 'lucide-react';
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

// Transaction Detail Modal Component
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Transaction Details</span>
          </DialogTitle>
        </DialogHeader>
        
        {isLoading && (
          <div className="p-8 text-center text-gray-500">
            Loading transaction details...
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
            Failed to load transaction details: {error.error}
          </div>
        )}
        
        {transactionDetails && (
          <div className="space-y-6">
            {/* Transaction Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border">
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Receipt Number</div>
                <div className="font-mono text-sm">{transactionDetails.transaction.receipt_number}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Date & Time</div>
                <div className="text-sm">{formatTransactionDateTime(transactionDetails.transaction.sales_timestamp)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Customer</div>
                <div className="text-sm">{transactionDetails.transaction.customer_name || 'Walk-in Customer'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Staff</div>
                <div className="flex items-center text-sm">
                  {transactionDetails.transaction.staff_name ? (
                    <>
                      {(() => {
                        const staffName = transactionDetails.transaction.staff_name;
                        const staffColors: { [key: string]: string } = {
                          'dolly': 'bg-pink-400',
                          'net': 'bg-blue-400', 
                          'may': 'bg-green-400',
                          'winnie': 'bg-purple-400',
                          'bank': 'bg-yellow-400',
                          'chris': 'bg-red-400',
                          'david': 'bg-indigo-400'
                        };
                        const key = staffName.toLowerCase();
                        const colorClass = staffColors[key] || 'bg-gray-400';
                        return <div className={`w-2 h-2 rounded-full ${colorClass} mr-2`} />;
                      })()}
                      <span>{transactionDetails.transaction.staff_name}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Items</h3>
              <div className="space-y-2">
                {transactionDetails.items.map((item, index) => (
                  <div key={index} className="py-2 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {item.item_cnt} x {item.product_name}
                          {item.is_sim_usage === 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">SIM</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {item.product_category}
                        </div>
                        {item.item_notes && item.item_notes.trim() !== '' && item.item_notes.trim() !== '-' && (
                          <div className="text-xs text-gray-500 mt-1 italic">
                            {item.item_notes}
                          </div>
                        )}
                        {item.item_price_incl_vat > 0 && (
                          <div className="text-xs text-gray-600 mt-1">
                            ฿{item.item_price_incl_vat.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          ฿{item.sales_total.toFixed(2)}
                        </div>
                        {(item.item_discount && item.item_discount > 0) || (item.sales_discount && item.sales_discount > 0) ? (
                          <div className="text-xs text-gray-500 mt-1">
                            {(() => {
                              // Calculate discount percentage using only sales_discount as requested
                              // Formula: sales_discount / (sales_total + sales_discount) * 100
                              const salesDiscount = item.sales_discount || 0;
                              if (salesDiscount > 0) {
                                const originalPrice = item.sales_total + salesDiscount;
                                const discountPercentage = (salesDiscount / originalPrice * 100);
                                return `-${Math.round(discountPercentage)}% discount`;
                              }
                              return '';
                            })()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>฿{transactionDetails.summary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT:</span>
                  <span>฿{transactionDetails.summary.vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t pt-2">
                  <span>Total:</span>
                  <span>฿{transactionDetails.summary.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Payment Method:</span>
                  <div className="flex items-center">
                    {transactionDetails.summary.payment_method ? (
                      <>
                        {(() => {
                          const method = transactionDetails.summary.payment_method;
                          if (method.toLowerCase().includes('cash')) {
                            return <div className="w-2 h-2 rounded-full bg-green-400 mr-2" />;
                          } else if (method.toLowerCase().includes('card') || method.toLowerCase().includes('visa') || method.toLowerCase().includes('mastercard')) {
                            return <CreditCard className="h-3 w-3 text-blue-400 mr-1.5" />;
                          } else if (method.toLowerCase().includes('promptpay')) {
                            return <div className="w-2 h-2 rounded-full bg-purple-400 mr-2" />;
                          } else {
                            return <div className="w-2 h-2 rounded-full bg-gray-400 mr-2" />;
                          }
                        })()}
                        <span>{transactionDetails.summary.payment_method}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </div>
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
      <div className="max-w-full mx-auto p-4 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
            <p className="text-sm text-gray-600 mt-1">
              POS transaction management and analytics
            </p>
          </div>
          <Button 
            onClick={handleRefresh}
            disabled={isLoading || kpisLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${(isLoading || kpisLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* KPIs */}
        <TransactionKPIs 
          kpis={kpis || null} 
          isLoading={kpisLoading} 
          error={kpisError} 
        />

        {/* Filters */}
        <div className="bg-white border border-gray-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Filters</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={filters.resetFilters}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Date Range Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Date Range</h4>
              
              <DateRangePicker
                startDate={filters.filters.dateRange.start}
                endDate={filters.filters.dateRange.end}
                onStartDateChange={(date) => date && filters.updateDateRange({ start: date })}
                onEndDateChange={(date) => date && filters.updateDateRange({ end: date })}
              />

              {/* Quick Date Buttons */}
              <div className="flex flex-wrap gap-1">
                <Button 
                  variant={filters.selectedPreset === 'today' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => filters.setDatePreset('today')}
                  className={`text-xs h-7 px-2 ${filters.selectedPreset === 'today' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                >
                  Today
                </Button>
                <Button 
                  variant={filters.selectedPreset === 'yesterday' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => filters.setDatePreset('yesterday')}
                  className={`text-xs h-7 px-2 ${filters.selectedPreset === 'yesterday' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                >
                  Yesterday
                </Button>
                <Button 
                  variant={filters.selectedPreset === 'last7days' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => filters.setDatePreset('last7days')}
                  className={`text-xs h-7 px-2 ${filters.selectedPreset === 'last7days' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                >
                  Last 7 Days
                </Button>
                <Button 
                  variant={filters.selectedPreset === 'last30days' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => filters.setDatePreset('last30days')}
                  className={`text-xs h-7 px-2 ${filters.selectedPreset === 'last30days' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                >
                  Last 30 Days
                </Button>
              </div>
            </div>

            {/* Payment & Staff Filters */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Payment & Staff</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Payment Method</label>
                  <Select 
                    value={filters.filters.paymentMethod || 'all'} 
                    onValueChange={(value) => filters.updateFilters({ 
                      paymentMethod: value === 'all' ? undefined : value 
                    })}
                  >
                    <SelectTrigger className="text-sm h-8">
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

                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Staff</label>
                  <Input
                    placeholder="Staff name"
                    value={filters.filters.staffName || ''}
                    onChange={(e) => filters.updateFilters({ staffName: e.target.value || undefined })}
                    className="text-sm h-8"
                  />
                </div>
              </div>
            </div>

            {/* Customer & Amount Filters */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Customer & Amount</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Customer</label>
                  <Input
                    placeholder="Customer name"
                    value={filters.filters.customerName || ''}
                    onChange={(e) => filters.updateFilters({ customerName: e.target.value || undefined })}
                    className="text-sm h-8"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Min Amount (฿)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.filters.minAmount || ''}
                    onChange={(e) => filters.updateFilters({ 
                      minAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    className="text-sm h-8"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-200">
          <TransactionsDataTable 
            data={transactions}
            columns={columns}
            isLoading={isLoading}
            onRefresh={handleRefresh}
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
  );
} 