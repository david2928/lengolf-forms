'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { useResponsive } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils';

interface PackageItem {
  id: string;
  package_name: string;
  package_type: string;
  purchase_date: string;
  expiration_date?: string;
  first_use_date?: string;
  uses_remaining: number;
  original_uses: number;
  used_hours: number;
  status: 'active' | 'expired' | 'unused' | 'fully_used' | 'unlimited';
  usage_percentage: number;
  employee_name?: string;
}

interface PackageHistoryTableProps {
  customerId?: string;
}

export const PackageHistoryTable: React.FC<PackageHistoryTableProps> = ({ customerId }) => {
  const [allPackages, setAllPackages] = useState<PackageItem[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'unlimited' | 'expired'>('all');
  const { isTablet } = useResponsive();

  useEffect(() => {
    const fetchPackages = async () => {
      if (!customerId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/customers/${customerId}/packages`);
        if (response.ok) {
          const data = await response.json();
          const packages = data.packages || [];
          setAllPackages(packages);
          setFilteredPackages(packages);
        }
      } catch (error) {
        console.error('Error fetching packages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [customerId]);

  // Filter packages based on selected filter
  useEffect(() => {
    let filtered = allPackages;
    
    switch (activeFilter) {
      case 'active':
        filtered = allPackages.filter(pkg => pkg.status === 'active');
        break;
      case 'unlimited':
        filtered = allPackages.filter(pkg => pkg.status === 'unlimited' || pkg.package_type === 'Unlimited');
        break;
      case 'expired':
        filtered = allPackages.filter(pkg => pkg.status === 'expired' || pkg.status === 'fully_used');
        break;
      default:
        filtered = allPackages;
    }
    
    setFilteredPackages(filtered);
  }, [activeFilter, allPackages]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = (status: string, packageType: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>;
      case 'unlimited':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Unlimited</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Expired</Badge>;
      case 'fully_used':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Fully Used</Badge>;
      case 'unused':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Unused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isUnlimitedPackage = (pkg: PackageItem) => {
    return pkg.package_type === 'Unlimited' || pkg.status === 'unlimited';
  };

  // Calculate used hours from remaining hours (used = total - remaining)
  const getUsedHours = (pkg: PackageItem) => {
    return Math.max(0, (pkg.original_uses || 0) - (pkg.uses_remaining || 0));
  };

  // Get filter button counts
  const getFilterCounts = () => {
    return {
      all: allPackages.length,
      active: allPackages.filter(pkg => pkg.status === 'active').length,
      unlimited: allPackages.filter(pkg => pkg.status === 'unlimited' || pkg.package_type === 'Unlimited').length,
      expired: allPackages.filter(pkg => pkg.status === 'expired' || pkg.status === 'fully_used').length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-500">Loading packages...</span>
        </div>
      </div>
    );
  }

  if (allPackages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Package className="h-12 w-12 text-gray-300 mb-2" />
        <p className="text-gray-500">No packages found</p>
      </div>
    );
  }

  const filterCounts = getFilterCounts();

  return (
    <div className="h-full flex flex-col">
      {/* Filter Buttons */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('all')}
            className={cn(
              "transition-all",
              activeFilter === 'all' && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            All ({filterCounts.all})
          </Button>
          <Button
            variant={activeFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('active')}
            className={cn(
              "transition-all",
              activeFilter === 'active' && "bg-green-600 hover:bg-green-700"
            )}
          >
            Active ({filterCounts.active})
          </Button>
          <Button
            variant={activeFilter === 'unlimited' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('unlimited')}
            className={cn(
              "transition-all",
              activeFilter === 'unlimited' && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            Unlimited ({filterCounts.unlimited})
          </Button>
          <Button
            variant={activeFilter === 'expired' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('expired')}
            className={cn(
              "transition-all",
              activeFilter === 'expired' && "bg-red-600 hover:bg-red-700"
            )}
          >
            Expired/Used ({filterCounts.expired})
          </Button>
        </div>
        {activeFilter !== 'all' && (
          <p className="text-sm text-gray-600 mt-2">
            Showing {filteredPackages.length} of {allPackages.length} packages
          </p>
        )}
      </div>

      {/* No Results */}
      {filteredPackages.length === 0 && activeFilter !== 'all' && (
        <div className="flex flex-col items-center justify-center py-8">
          <Package className="h-12 w-12 text-gray-300 mb-2" />
          <p className="text-gray-500">No packages found for this filter</p>
          <Button variant="outline" onClick={() => setActiveFilter('all')} className="mt-2">
            Show All Packages
          </Button>
        </div>
      )}

      {/* Desktop Table View */}
      {filteredPackages.length > 0 && (
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-gray-50/50">
                <TableHead className="font-semibold text-gray-900 px-3 py-2 text-sm">Package</TableHead>
                <TableHead className="font-semibold text-gray-900 px-3 py-2 text-sm">Purchase Date</TableHead>
                <TableHead className="font-semibold text-gray-900 text-center px-3 py-2 text-sm">Usage</TableHead>
                <TableHead className="font-semibold text-gray-900 px-3 py-2 text-sm">Expiry Date</TableHead>
                <TableHead className="font-semibold text-gray-900 text-center px-3 py-2 text-sm">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPackages.map((pkg) => (
                <TableRow 
                  key={pkg.id}
                  className="transition-colors hover:bg-gray-50/50"
                >
                  <TableCell className="px-3 py-2">
                    <div className="font-medium text-sm">
                      {pkg.package_name}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="text-sm">
                      {formatDate(pkg.purchase_date)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center px-3 py-2">
                    {isUnlimitedPackage(pkg) ? (
                      <div className="text-sm text-blue-600 font-medium">
                        Unlimited
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <p className="font-medium text-sm">
                          {getUsedHours(pkg)}/{pkg.original_uses || 0}h
                        </p>
                        {pkg.original_uses > 0 && (
                          <div className="bg-gray-200 rounded-full mt-1 w-16 h-1.5">
                            <div 
                              className="h-full bg-blue-600 rounded-full transition-all"
                              style={{ width: `${pkg.usage_percentage}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="font-medium text-sm">
                      {formatDate(pkg.expiration_date)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center px-3 py-2">
                    <div className="text-xs">
                      {getStatusBadge(pkg.status, pkg.package_type)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile/Tablet Card View */}
      {filteredPackages.length > 0 && (
        <div className="lg:hidden">
          <div className="space-y-3 p-4">
            {filteredPackages.map((pkg) => {
              const isExpired = pkg.status === 'expired';
              const isFullyUsed = pkg.status === 'fully_used';
              const isUnused = pkg.status === 'unused';
              const isUnlimited = isUnlimitedPackage(pkg);
              
              return (
                <div 
                  key={pkg.id}
                  className={cn(
                    "bg-white border rounded-lg p-4 transition-all hover:shadow-md",
                    isExpired ? "border-red-200 bg-red-50" : 
                    isFullyUsed ? "border-gray-200 bg-gray-50" :
                    isUnused ? "border-yellow-200 bg-yellow-50" :
                    isUnlimited ? "border-blue-200 bg-blue-50" : "border-green-200 bg-green-50"
                  )}
                >
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      "font-bold",
                      isTablet ? "text-lg" : "text-base",
                      "text-gray-900"
                    )}>
                      {pkg.package_name}
                    </div>
                    <div className="text-xs">
                      {getStatusBadge(pkg.status, pkg.package_type)}
                    </div>
                  </div>

                  {/* Usage Progress - Only for non-unlimited packages */}
                  {!isUnlimited && pkg.original_uses > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Hours Used</p>
                        <p className={cn(
                          "font-bold",
                          isTablet ? "text-base" : "text-sm"
                        )}>
                          {getUsedHours(pkg)}/{pkg.original_uses || 0}h
                        </p>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            pkg.status === 'active' ? "bg-green-500" :
                            pkg.status === 'expired' ? "bg-red-500" : 
                            pkg.status === 'fully_used' ? "bg-gray-500" : "bg-blue-500"
                          )}
                          style={{ width: `${pkg.usage_percentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Unlimited Package Notice */}
                  {isUnlimited && (
                    <div className="mb-4 p-2 bg-blue-100 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 font-medium text-center">
                        🎉 Unlimited Usage Package
                      </p>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Purchase Date</p>
                      <p className={cn(
                        "font-medium",
                        isTablet ? "text-sm" : "text-sm"
                      )}>
                        {formatDate(pkg.purchase_date)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Expiry Date</p>
                      <p className={cn(
                        "font-medium",
                        isTablet ? "text-sm" : "text-sm",
                        isExpired ? "text-red-600" : "text-gray-900"
                      )}>
                        {formatDate(pkg.expiration_date)}
                      </p>
                    </div>
                    
                    {!isUnlimited && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Remaining</p>
                        <p className={cn(
                          "font-bold",
                          isTablet ? "text-base" : "text-sm",
                          pkg.uses_remaining > 0 ? "text-blue-600" : "text-gray-400"
                        )}>
                          {pkg.uses_remaining || 0}h
                        </p>
                      </div>
                    )}
                    
                    {pkg.first_use_date && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">First Use</p>
                        <p className={cn(
                          "font-medium",
                          isTablet ? "text-sm" : "text-sm"
                        )}>
                          {formatDate(pkg.first_use_date)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Employee info if available */}
                  {pkg.employee_name && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Sold by: <span className="text-gray-700 font-medium">{pkg.employee_name}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};