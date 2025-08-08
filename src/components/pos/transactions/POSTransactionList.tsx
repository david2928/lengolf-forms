'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar, Search, RefreshCw, Receipt, DollarSign, User, CreditCard, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStaffAuth } from '@/hooks/use-staff-auth';
import { formatBangkokTime, getBangkokNow, getBangkokToday } from '@/lib/bangkok-timezone';
import { formatThaiDateTime, formatCurrency, getPaymentIcon } from '@/lib/pos-utils';
import { formatDateToLocalString } from '@/lib/utils';
import { TransactionDetailModal } from './TransactionDetailModal';

interface Transaction {
  receipt_number: string;
  sales_timestamp: string;
  customer_name: string;
  staff_name: string;
  payment_method: string;
  total_amount: number;
  item_count: number;
  status: string;
}



interface POSTransactionListProps {
  onRegisterRefresh?: (refreshFn: () => void, isLoading: boolean) => void;
}

export const POSTransactionList: React.FC<POSTransactionListProps> = ({ onRegisterRefresh }) => {
  const { staff } = useStaffAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date(getBangkokToday()));
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch transactions for the selected date
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // Use the selected date instead of always using today
      const selectedDateStr = formatDateToLocalString(selectedDate);
      
      // Build query parameters for GET request - fetch transactions for selected date
      const params = new URLSearchParams({
        startDate: selectedDateStr,
        endDate: selectedDateStr,
        page: '1',
        limit: '100',
        sortBy: 'transaction_date',
        sortOrder: 'desc'
      });
      
      const response = await fetch(`/api/pos/transactions?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      } else {
        const errorData = await response.text();
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [selectedDate]); // Depend on selectedDate so it refetches when date changes

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Register refresh function with parent
  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(fetchTransactions, loading);
    }
  }, [onRegisterRefresh, fetchTransactions, loading]);

  // Filter transactions based on search
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.staff_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  // Remove KPI calculations as requested

  const handleTransactionClick = (receiptNumber: string) => {
    setSelectedTransaction(receiptNumber);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Create date without timezone conversion issues
    const dateValue = event.target.value; // YYYY-MM-DD format
    const newDate = new Date(dateValue + 'T00:00:00');
    setSelectedDate(newDate);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 min-h-0">
      <div className="flex-1 flex flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 min-h-0">
        <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full space-y-6 min-h-0">
          
          {/* Filters - removed header as requested */}
          <div className="space-y-4">
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by receipt, customer, or staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
              </div>
              
              <div className="sm:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <Input
                  type="date"
                  value={formatDateToLocalString(selectedDate)}
                  onChange={handleDateChange}
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          {/* Transaction Table */}
          <div className="flex-1 flex flex-col min-h-0">
            <h2 className="text-sm sm:text-lg font-medium text-gray-900 mb-4">
              Transaction History ({filteredTransactions.length})
            </h2>
            
            <Card className="flex-1 flex flex-col min-h-0">
              <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-auto min-h-0 max-h-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b bg-gray-50/50">
                        <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[15%]">Receipt</TableHead>
                        <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[20%]">Date & Time</TableHead>
                        <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] hidden md:table-cell">Customer</TableHead>
                        <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] hidden md:table-cell">Staff</TableHead>
                        <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] hidden lg:table-cell">Payment</TableHead>
                        <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%] text-right">Amount</TableHead>
                        <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%] text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="px-6 py-8 text-center">
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span className="ml-3 text-gray-500">Loading transactions...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="px-6 py-8 text-center">
                            <div className="flex flex-col items-center">
                              <Receipt className="h-12 w-12 text-gray-300 mb-2" />
                              <p className="text-gray-500">No transactions found for this date</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTransactions.map((transaction) => {
                          const paymentInfo = getPaymentIcon(transaction.payment_method);
                          const isVoided = transaction.status === 'voided';
                          return (
                            <TableRow 
                              key={transaction.receipt_number} 
                              className={`transition-colors cursor-pointer ${
                                isVoided 
                                  ? 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500' 
                                  : 'hover:bg-gray-50/50'
                              }`}
                              onClick={() => handleTransactionClick(transaction.receipt_number)}
                            >
                              <TableCell className="px-6 py-4">
                                <div className={`font-mono text-sm font-semibold flex items-center gap-2 ${
                                  isVoided ? 'text-red-700' : ''
                                }`}>
                                  {transaction.receipt_number}
                                  {isVoided && (
                                    <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                      VOIDED
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-4">
                                <div className="text-sm">
                                  {formatThaiDateTime(transaction.sales_timestamp)}
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-4 hidden md:table-cell">
                                <div className="text-sm">
                                  {transaction.customer_name || 'Walk-in'}
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-4 hidden md:table-cell">
                                <div className="flex items-center">
                                  <User className="h-3 w-3 mr-1 text-gray-400" />
                                  <span className="text-sm">{transaction.staff_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-4 hidden lg:table-cell">
                                <div className="flex items-center">
                                  <span className="text-sm mr-1">{paymentInfo.icon}</span>
                                  <span className={`text-sm ${paymentInfo.color}`}>
                                    {transaction.payment_method}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-4 text-right">
                                <div className={`font-semibold ${
                                  isVoided ? 'text-red-700 line-through' : ''
                                }`}>
                                  {formatCurrency(transaction.total_amount)}
                                </div>
                                <div className={`text-xs md:hidden ${
                                  isVoided ? 'text-red-600' : 'text-gray-500'
                                }`}>
                                  {transaction.item_count} items
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-4 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTransactionClick(transaction.receipt_number);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Detail Modal */}
          <TransactionDetailModal
            receiptNumber={selectedTransaction}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onTransactionUpdated={fetchTransactions}
          />
        </div>
      </div>
    </div>
  );
};