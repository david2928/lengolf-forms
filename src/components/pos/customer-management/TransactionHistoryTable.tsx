'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Eye, Receipt, Search, X, CalendarIcon } from 'lucide-react';
import { formatCurrency, formatThaiDateTime, getPaymentIcon } from '@/lib/pos-utils';
import { useResponsive } from '@/hooks/use-responsive';
import { cn, formatDateToLocalString } from '@/lib/utils';
import { TransactionDetailModal } from '@/components/pos/transactions/TransactionDetailModal';

interface Transaction {
  id: string;
  receipt_number: string;
  date: string;
  sales_net: number;
  sales_gross?: number;
  vat_amount?: number;
  items: string;
  item_count: number;
  payment_method: string;
  staff: string;
  status?: string;
}

interface TransactionHistoryTableProps {
  customerId?: string;
}

export const TransactionHistoryTable: React.FC<TransactionHistoryTableProps> = ({ customerId }) => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedReceiptNumber, setSelectedReceiptNumber] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const { isTablet } = useResponsive();

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!customerId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/customers/${customerId}/transactions`);
        if (response.ok) {
          const data = await response.json();
          const transactions = data.transactions || [];
          setAllTransactions(transactions);
          setFilteredTransactions(transactions);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [customerId]);

  // Filter transactions based on search term and date
  useEffect(() => {
    let filtered = allTransactions;

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => (
        transaction.receipt_number.toLowerCase().includes(searchLower) ||
        transaction.date.includes(searchTerm) ||
        transaction.payment_method.toLowerCase().includes(searchLower) ||
        transaction.staff.toLowerCase().includes(searchLower)
      ));
    }

    // Filter by selected date
    if (selectedDate) {
      const selectedDateStr = formatDateToLocalString(selectedDate);
      filtered = filtered.filter(transaction => transaction.date === selectedDateStr);
    }
    
    setFilteredTransactions(filtered);
  }, [searchTerm, selectedDate, allTransactions]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleClearDate = () => {
    setSelectedDate(undefined);
    setCalendarOpen(false);
  };

  const handleClearAll = () => {
    setSearchTerm('');
    setSelectedDate(undefined);
    setCalendarOpen(false);
  };

  const handleTransactionClick = (receiptNumber: string) => {
    setSelectedReceiptNumber(receiptNumber);
    setShowTransactionModal(true);
  };

  const handleCloseTransactionModal = () => {
    setShowTransactionModal(false);
    setSelectedReceiptNumber(null);
  };

  // Format date from YYYY-MM-DD to readable format
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Calculate customer paid amount (gross amount)
  const getCustomerPaidAmount = (transaction: Transaction) => {
    // If we have sales_gross, use that
    if (transaction.sales_gross && transaction.sales_gross > 0) {
      return transaction.sales_gross;
    }
    
    // Otherwise, add VAT to net sales to get gross amount
    const netAmount = transaction.sales_net || 0;
    const vatAmount = transaction.vat_amount || (netAmount * 0.07); // Default 7% VAT if not provided
    return netAmount + vatAmount;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-500">Loading transactions...</span>
        </div>
      </div>
    );
  }

  if (allTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Receipt className="h-12 w-12 text-gray-300 mb-2" />
        <p className="text-gray-500">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-3 mb-3">
          {/* Text Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by receipt, payment method, or staff..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Date Picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal min-w-[140px]",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? formatDate(formatDateToLocalString(selectedDate)) : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setCalendarOpen(false);
                }}
                defaultMonth={new Date()}
                initialFocus
              />
              {selectedDate && (
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearDate}
                    className="w-full"
                  >
                    Clear Date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Active Filters & Results */}
        {(searchTerm || selectedDate) && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found {filteredTransactions.length} of {allTransactions.length} transactions
              {selectedDate && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Date: {formatDate(formatDateToLocalString(selectedDate))}
                </span>
              )}
              {searchTerm && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Search: &quot;{searchTerm}&quot;
                </span>
              )}
            </p>
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* No Results */}
      {filteredTransactions.length === 0 && searchTerm && (
        <div className="flex flex-col items-center justify-center py-8">
          <Search className="h-12 w-12 text-gray-300 mb-2" />
          <p className="text-gray-500">No transactions match your search</p>
          <Button variant="outline" onClick={handleClearSearch} className="mt-2">
            Clear search
          </Button>
        </div>
      )}

      {/* Desktop Table View */}
      {filteredTransactions.length > 0 && (
        <div className="hidden lg:block flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-gray-50/50">
                <TableHead className="font-semibold text-gray-900 px-3 py-2 text-sm">Receipt</TableHead>
                <TableHead className="font-semibold text-gray-900 px-3 py-2 text-sm">Date</TableHead>
                <TableHead className="font-semibold text-gray-900 px-3 py-2 text-sm">Payment</TableHead>
                <TableHead className="font-semibold text-gray-900 text-right px-3 py-2 text-sm">Amount</TableHead>
                <TableHead className="font-semibold text-gray-900 px-3 py-2 text-sm">Staff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => {
                const isVoided = transaction.status === 'voided';
                
                return (
                  <TableRow 
                    key={transaction.id}
                    className={cn(
                      "transition-colors cursor-pointer",
                      isVoided ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"
                    )}
                    onClick={() => handleTransactionClick(transaction.receipt_number)}
                  >
                    <TableCell className="px-3 py-2">
                      <div className={cn(
                        "font-mono font-semibold text-sm",
                        isVoided && "text-red-700"
                      )}>
                        {transaction.receipt_number}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="text-sm">
                        {formatDate(transaction.date)}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="text-sm text-gray-600">
                        {transaction.payment_method || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-3 py-2">
                      <div className={cn(
                        "font-semibold text-sm",
                        isVoided ? "text-red-700 line-through" : ""
                      )}>
                        {formatCurrency(getCustomerPaidAmount(transaction))}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="text-sm text-gray-600">
                        {transaction.staff || 'N/A'}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile/Tablet Card View */}
      {filteredTransactions.length > 0 && (
        <div className="lg:hidden flex-1 overflow-auto">
          <div className="space-y-3 p-4">
            {filteredTransactions.map((transaction) => {
              const isVoided = transaction.status === 'voided';
              
              return (
                <div 
                  key={transaction.id}
                  className={cn(
                    "bg-white border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer",
                    isVoided ? "border-red-200 bg-red-50 hover:bg-red-100" : "border-gray-200 hover:shadow-lg"
                  )}
                  onClick={() => handleTransactionClick(transaction.receipt_number)}
                >
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      "font-mono font-bold",
                      isTablet ? "text-lg" : "text-base",
                      isVoided ? "text-red-700" : "text-gray-900"
                    )}>
                      {transaction.receipt_number}
                    </div>
                    {isVoided && (
                      <span className="text-xs text-red-600 font-semibold bg-red-100 px-2 py-1 rounded">
                        VOIDED
                      </span>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Date</p>
                      <p className={cn(
                        "font-medium",
                        isTablet ? "text-sm" : "text-sm"
                      )}>
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Payment</p>
                      <p className={cn(
                        "font-medium text-gray-600",
                        isTablet ? "text-sm" : "text-sm"
                      )}>
                        {transaction.payment_method || 'N/A'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Amount</p>
                      <p className={cn(
                        "font-bold",
                        isTablet ? "text-lg" : "text-base",
                        isVoided ? "text-red-700 line-through" : "text-green-600"
                      )}>
                        {formatCurrency(getCustomerPaidAmount(transaction))}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Items</p>
                      <p className={cn(
                        "font-medium",
                        isTablet ? "text-sm" : "text-sm",
                        isVoided ? "text-red-600" : "text-gray-600"
                      )}>
                        {transaction.item_count || 0} items
                      </p>
                    </div>
                  </div>

                  {/* Staff Info */}
                  {transaction.staff && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Staff: <span className="text-gray-700 font-medium">{transaction.staff}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        receiptNumber={selectedReceiptNumber}
        isOpen={showTransactionModal}
        onClose={handleCloseTransactionModal}
      />
    </div>
  );
};