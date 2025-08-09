'use client';

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
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
import { 
  Edit, 
  ArrowRightLeft, 
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface Package {
  id: string;
  customer_name: string;
  customer_id?: string;
  package_type_name: string;
  purchase_date: string;
  expiration_date: string;
  first_use_date?: string;
  total_hours?: number;
  total_used_hours: number;
  remaining_hours?: number;
  is_unlimited: boolean;
  last_modified_by?: string;
  last_modified_at?: string;
  stable_hash_id?: string;
}

interface PackageListTableProps {
  packages: Package[];
  onPackageEdit: (pkg: Package) => void;
  onPackageTransfer: (pkg: Package) => void;
  onUsageManage: (pkg: Package) => void;
  isLoading: boolean;
}

type SortKey = 'customer_name' | 'package_type_name' | 'remaining_hours' | 'expiration_date';
type SortOrder = 'asc' | 'desc';

const getStatusBadge = (pkg: Package) => {
  const expiry = new Date(pkg.expiration_date);
  const today = new Date();
  const daysToExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysToExpiry < 0) {
    return <Badge variant="destructive" className="text-xs">Expired</Badge>;
  } else if (!pkg.is_unlimited && pkg.remaining_hours !== undefined && pkg.remaining_hours <= 0) {
    return <Badge variant="secondary" className="text-xs">No Hours</Badge>;
  } else if (daysToExpiry <= 7) {
    return <Badge variant="secondary" className="text-xs">Expiring</Badge>;
  } else {
    return <Badge variant="default" className="text-xs bg-green-100 text-green-800">Active</Badge>;
  }
};

export const PackageListTable: React.FC<PackageListTableProps> = ({
  packages,
  onPackageEdit,
  onPackageTransfer,
  onUsageManage,
  isLoading
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('customer_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedPackages = useMemo(() => {
    const sorted = [...packages].sort((a, b) => {
      let aValue: any = a[sortKey];
      let bValue: any = b[sortKey];

      // Handle special cases
      if (sortKey === 'remaining_hours') {
        aValue = a.is_unlimited ? Infinity : (a.remaining_hours || 0);
        bValue = b.is_unlimited ? Infinity : (b.remaining_hours || 0);
      } else if (sortKey === 'expiration_date') {
        aValue = new Date(a.expiration_date).getTime();
        bValue = new Date(b.expiration_date).getTime();
      }

      // Compare values
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [packages, sortKey, sortOrder]);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">No packages found. Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b bg-gray-50/50">
          <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[30%]">
            <button
              className="flex items-center hover:text-gray-700"
              onClick={() => handleSort('customer_name')}
            >
              Customer
              <SortIcon columnKey="customer_name" />
            </button>
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%]">
            <button
              className="flex items-center hover:text-gray-700"
              onClick={() => handleSort('package_type_name')}
            >
              Package
              <SortIcon columnKey="package_type_name" />
            </button>
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center">
            <button
              className="flex items-center justify-center hover:text-gray-700 w-full"
              onClick={() => handleSort('remaining_hours')}
            >
              Hours
              <SortIcon columnKey="remaining_hours" />
            </button>
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center">
            <button
              className="flex items-center justify-center hover:text-gray-700 w-full"
              onClick={() => handleSort('expiration_date')}
            >
              Expires
              <SortIcon columnKey="expiration_date" />
            </button>
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%] text-center">
            Status
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-right">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedPackages.map((pkg) => {
          const expiry = new Date(pkg.expiration_date);
          const daysToExpiry = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <TableRow key={pkg.id} className="hover:bg-gray-50/50 transition-colors">
              <TableCell className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-700">
                        {pkg.customer_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-base">
                      {pkg.customer_name}
                    </p>
                    {pkg.last_modified_by && (
                      <p className="text-xs text-gray-500 mt-1">
                        Modified by {pkg.last_modified_by.split('@')[0]}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              
              <TableCell className="px-4 py-4">
                <Badge variant="outline" className="font-medium">
                  {pkg.package_type_name}
                </Badge>
              </TableCell>
              
              <TableCell className="px-4 py-4 text-center">
                {pkg.is_unlimited ? (
                  <span className="text-sm font-medium text-blue-600">Unlimited</span>
                ) : (
                  <div>
                    <div className="font-semibold text-gray-900">
                      {pkg.remaining_hours || 0}/{pkg.total_hours || 0}h
                    </div>
                    {pkg.total_hours && pkg.total_hours > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {((pkg.remaining_hours || 0) / pkg.total_hours * 100).toFixed(0)}% left
                      </div>
                    )}
                  </div>
                )}
              </TableCell>
              
              <TableCell className="px-4 py-4 text-center">
                <div>
                  <div className="font-medium text-gray-900">
                    {format(expiry, 'MMM dd, yyyy')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {daysToExpiry < 0 
                      ? `${Math.abs(daysToExpiry)}d ago` 
                      : daysToExpiry === 0 
                      ? 'Today'
                      : `${daysToExpiry}d left`
                    }
                  </div>
                </div>
              </TableCell>
              
              <TableCell className="px-4 py-4 text-center">
                {getStatusBadge(pkg)}
              </TableCell>
              
              <TableCell className="px-4 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPackageEdit(pkg)}
                    className="h-8 px-2"
                    title="Edit package"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPackageTransfer(pkg)}
                    className="h-8 px-2"
                    title="Transfer package"
                  >
                    <ArrowRightLeft className="h-3 w-3" />
                  </Button>
                  {!pkg.is_unlimited && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUsageManage(pkg)}
                      className="h-8 px-2"
                      title="Manage usage"
                    >
                      <Clock className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};