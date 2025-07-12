"use client";

import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RefreshCw, User, CreditCard, Receipt, Calendar } from "lucide-react";
import { TransactionSummary } from "@/types/transactions";

interface TransactionsDataTableProps {
  data: TransactionSummary[];
  columns: ColumnDef<TransactionSummary>[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onTransactionClick?: (receiptNumber: string) => void;
}

// Ultra Compact Mobile Card Component
function TransactionCard({ transaction, onClick }: { transaction: TransactionSummary; onClick: (receiptNumber: string) => void }) {
  const formatThaiDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return 'Invalid Date';
    try {
      const cleanDateTime = dateTimeString.replace(/(\+00:00|Z)$/, '');
      const date = new Date(cleanDateTime);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month} ${hours}:${minutes}`;
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getPaymentIcon = (paymentMethod: string) => {
    if (!paymentMethod) return <div className="w-2 h-2 rounded-full bg-gray-300" />;
    if (paymentMethod.toLowerCase().includes('cash')) {
      return <div className="w-2 h-2 rounded-full bg-green-500" />;
    } else if (paymentMethod.toLowerCase().includes('card') || paymentMethod.toLowerCase().includes('visa') || paymentMethod.toLowerCase().includes('mastercard')) {
      return <CreditCard className="h-3 w-3 text-blue-500" />;
    } else if (paymentMethod.toLowerCase().includes('promptpay')) {
      return <div className="w-2 h-2 rounded-full bg-purple-500" />;
    }
    return <div className="w-2 h-2 rounded-full bg-gray-300" />;
  };

  const getStaffIndicator = (staffName: string) => {
    if (!staffName) return null;
    const staffColors: { [key: string]: string } = {
      'dolly': 'bg-pink-500', 'net': 'bg-blue-500', 'may': 'bg-green-500',
      'winnie': 'bg-purple-500', 'bank': 'bg-yellow-500', 'chris': 'bg-red-500', 'david': 'bg-indigo-500'
    };
    const colorClass = staffColors[staffName.toLowerCase()] || 'bg-gray-400';
    return <div className={`w-2 h-2 rounded-full ${colorClass}`} />;
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border p-3 hover:shadow active:bg-gray-50 transition-all cursor-pointer"
      onClick={() => onClick(transaction.receipt_number)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-mono text-sm font-semibold text-gray-900 mb-1">
            {transaction.receipt_number}
          </div>
          <div className="text-xs text-gray-500">
            {formatThaiDateTime(transaction.sales_timestamp)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            ฿{typeof transaction.total_amount === 'string' ? parseFloat(transaction.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : transaction.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500">
            {transaction.item_count} items
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <span className="font-medium text-gray-900">
            {transaction.customer_name || 'Walk-in'}
          </span>
          {transaction.staff_name && (
            <div className="flex items-center space-x-1">
              {getStaffIndicator(transaction.staff_name)}
              <span className="text-gray-600">{transaction.staff_name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {getPaymentIcon(transaction.payment_method || '')}
          <span className="text-gray-600 text-xs">{transaction.payment_method || 'N/A'}</span>
        </div>
      </div>

      {transaction.sim_usage_count > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
            SIM Usage: {transaction.sim_usage_count}
          </span>
        </div>
      )}
    </div>
  );
}

export function TransactionsDataTable({
  data,
  columns,
  isLoading = false,
  onRefresh,
  onTransactionClick,
}: TransactionsDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "sales_timestamp", desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  return (
    <>
      {/* Search Bar - Directly positioned */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 mb-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search transactions..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-10 h-9 w-64 sm:w-80 bg-white"
            />
          </div>
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9 px-3 bg-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
        
        <div className="text-sm text-gray-600">
          {table.getFilteredRowModel().rows.length} of {table.getCoreRowModel().rows.length} transactions
        </div>
      </div>

      {/* Desktop Table View - White background only for table */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-gray-200">
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    className="text-xs sm:text-sm font-semibold text-gray-700 py-3 px-4"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={`loading-${index}`} className="border-b border-gray-100">
                  {columns.map((_, cellIndex) => (
                    <TableCell key={cellIndex} className="py-3 px-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 px-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center">
                    <Receipt className="h-12 w-12 text-gray-300 mb-4" />
                    <p>No transactions found</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View - Individual cards have white bg */}
      <div className="lg:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={`loading-${index}`} className="bg-white rounded-lg shadow-sm border p-3 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-full animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-3/4 animate-pulse" />
              </div>
            </div>
          ))
        ) : table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TransactionCard
              key={row.id}
              transaction={row.original}
              onClick={(receiptNumber) => onTransactionClick?.(receiptNumber)}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <Receipt className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">No transactions found</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or date range</p>
          </div>
        )}
      </div>

      {/* Pagination - Clean without container */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 mt-4 space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Show</span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-9 w-20 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-700">per page</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="bg-white"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="bg-white"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="bg-white"
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="bg-white"
            >
              Last
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}