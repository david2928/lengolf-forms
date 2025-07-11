/**
 * Customers Data Table Component
 * CMS-010: Customer List UI - Main Data Table
 */

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Customer } from '@/hooks/useCustomerManagement';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Eye,
  Edit,
  Phone,
  Mail,
  MessageCircle,
  Users
} from 'lucide-react';

interface CustomersDataTableProps {
  customers: Customer[];
  pagination: {
    total: number;
    pages: number;
    current: number;
    limit: number;
  };
  loading: boolean;
  onCustomerSelect: (customerId: string) => void;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  currentSort: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

export function CustomersDataTable({
  customers,
  pagination,
  loading,
  onCustomerSelect,
  onPageChange,
  onSortChange,
  currentSort
}: CustomersDataTableProps) {
  // Column definitions
  const columns = [
    {
      key: 'customerCode',
      label: 'Customer Code',
      sortable: true,
      sortKey: 'customerCode'
    },
    {
      key: 'customer_name',
      label: 'Name',
      sortable: true,
      sortKey: 'fullName'
    },
    {
      key: 'contact_number',
      label: 'Phone',
      sortable: false
    },
    {
      key: 'email',
      label: 'Email',
      sortable: false
    },
    {
      key: 'customer_status',
      label: 'Status',
      sortable: false
    },
    {
      key: 'lifetime_spending',
      label: 'Lifetime Value',
      sortable: true,
      sortKey: 'lifetimeValue'
    },
    {
      key: 'total_bookings',
      label: 'Bookings',
      sortable: false
    },
    {
      key: 'last_visit_date',
      label: 'Last Visit',
      sortable: true,
      sortKey: 'lastVisit'
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false
    }
  ];

  // Handle sorting
  const handleSort = (column: string) => {
    if (currentSort.sortBy === column) {
      // Toggle sort order
      const newOrder = currentSort.sortOrder === 'asc' ? 'desc' : 'asc';
      onSortChange(column, newOrder);
    } else {
      // Set new sort column with ascending order
      onSortChange(column, 'asc');
    }
  };

  // Get sort icon for column
  const getSortIcon = (column: string) => {
    if (currentSort.sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return currentSort.sortOrder === 'asc' 
      ? <ArrowUp className="w-4 h-4" />
      : <ArrowDown className="w-4 h-4" />;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₿${amount.toLocaleString()}`;
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // Get status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Inactive':
        return 'secondary';
      case 'Dormant':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Get contact method icon
  const getContactMethodIcon = (method: string) => {
    switch (method) {
      case 'Phone':
        return <Phone className="w-3 h-3" />;
      case 'LINE':
        return <MessageCircle className="w-3 h-3" />;
      case 'Email':
        return <Mail className="w-3 h-3" />;
      default:
        return null;
    }
  };

  // Loading skeleton
  if (loading && customers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key}>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-4 w-[80px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
              {columns.map((column) => (
                <TableHead key={column.key} className="font-semibold text-gray-700 py-4 px-6 text-left">
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      onClick={() => handleSort(column.sortKey!)}
                      className="h-auto p-0 font-semibold hover:bg-transparent hover:text-gray-900 text-gray-700 flex items-center"
                    >
                      {column.label}
                      <span className="ml-2">
                        {getSortIcon(column.sortKey!)}
                      </span>
                    </Button>
                  ) : (
                    <span className="font-semibold text-gray-700">{column.label}</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center space-y-2">
                    <Users className="h-8 w-8 text-gray-400" />
                    <p>No customers found matching your criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow 
                  key={customer.id}
                  className="cursor-pointer hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100"
                  onClick={() => onCustomerSelect(customer.id)}
                >
                  {/* Customer Code */}
                  <TableCell className="font-medium text-gray-900 py-4 px-6">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {customer.customer_code}
                    </span>
                  </TableCell>

                  {/* Name */}
                  <TableCell className="py-4 px-6">
                    <div className="font-medium text-gray-900">{customer.customer_name}</div>
                  </TableCell>

                  {/* Phone */}
                  <TableCell className="py-4 px-6 text-gray-600">
                    {customer.contact_number || <span className="text-gray-400">-</span>}
                  </TableCell>

                  {/* Email */}
                  <TableCell className="py-4 px-6 text-gray-600">
                    {customer.email || <span className="text-gray-400">-</span>}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-4 px-6">
                    <Badge 
                      variant={getStatusBadgeVariant(customer.customer_status)}
                      className={`
                        ${customer.customer_status === 'Active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                        ${customer.customer_status === 'Inactive' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : ''}
                        ${customer.customer_status === 'Dormant' ? 'bg-gray-100 text-gray-800 hover:bg-gray-100' : ''}
                        border-0 font-medium
                      `}
                    >
                      {customer.customer_status}
                    </Badge>
                  </TableCell>

                  {/* Lifetime Value */}
                  <TableCell className="py-4 px-6 font-medium text-gray-900">
                    {formatCurrency(customer.lifetime_spending)}
                  </TableCell>

                  {/* Bookings */}
                  <TableCell className="py-4 px-6">
                    <div className="text-center font-medium text-gray-900">
                      {customer.total_bookings}
                    </div>
                  </TableCell>

                  {/* Last Visit */}
                  <TableCell className="py-4 px-6 text-gray-600">
                    {formatDate(customer.last_visit_date)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-4 px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100">
                          <MoreVertical className="h-4 w-4 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onCustomerSelect(customer.id);
                        }}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement edit functionality
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Customer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-6 py-4">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{((pagination.current - 1) * pagination.limit) + 1}</span> to{' '}
            <span className="font-medium">{Math.min(pagination.current * pagination.limit, pagination.total)}</span> of{' '}
            <span className="font-medium">{pagination.total}</span> customers
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={pagination.current === 1 || loading}
              className="border-gray-300 hover:bg-gray-50"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.current - 1)}
              disabled={pagination.current === 1 || loading}
              className="border-gray-300 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-2 px-3">
              <span className="text-sm text-gray-600">Page</span>
              <span className="text-sm font-medium text-gray-900">
                {pagination.current} of {pagination.pages}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.current + 1)}
              disabled={pagination.current === pagination.pages || loading}
              className="border-gray-300 hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.pages)}
              disabled={pagination.current === pagination.pages || loading}
              className="border-gray-300 hover:bg-gray-50"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}