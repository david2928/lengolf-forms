'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Package, RefreshCw } from 'lucide-react';

// Hooks and Types
import { useAdminPackages } from '@/hooks/use-admin-packages';
import { usePackageTypes } from '@/hooks/use-package-types';

// Components
import { PackageListTable } from './components/PackageListTable';
import { PackageFilters } from './components/PackageFilters';
import { PackageForm } from './components/PackageForm';
import { PackageTransferModal } from './components/PackageTransferModal';
import { UsageManagementModal } from './components/UsageManagementModal';

export default function AdminPackageManagementPage() {
  // State for modals and forms
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(undefined);
  const [transferPackage, setTransferPackage] = useState<any>(undefined);
  const [usagePackage, setUsagePackage] = useState<any>(undefined);

  // Hooks
  const {
    packages,
    isLoading: packagesLoading,
    error: packagesError,
    filters,
    pagination,
    updateFilters,
    refreshPackages
  } = useAdminPackages();

  const { packageTypes, isLoading: typesLoading } = usePackageTypes();

  // Handlers
  const handleEditPackage = (pkg: any) => {
    setEditingPackage(pkg);
    setShowPackageForm(true);
  };

  const handleTransferPackage = (pkg: any) => {
    setTransferPackage(pkg);
  };

  const handleManageUsage = (pkg: any) => {
    setUsagePackage(pkg);
  };

  const handleRefresh = () => {
    refreshPackages();
  };


  // Check if any data is loading
  const isLoading = packagesLoading || typesLoading;
  
  // Check for errors
  const hasError = packagesError;

  return (
    <div className="container mx-auto py-3 sm:py-6 space-y-4 sm:space-y-6 px-3 sm:px-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Package Management</h1>
          <p className="text-muted-foreground">
            Advanced package administration and customer management
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {hasError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800">
              {packagesError || 'An error occurred while loading data.'}
            </p>
          </CardContent>
        </Card>
      )}


      {/* Main Content */}
      <div className="space-y-6">
          {/* Overview Cards */}
          {packagesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pagination?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    All packages in system
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Packages</CardTitle>
                  <Badge className="h-4 w-4 rounded-full bg-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {packages.filter(p => new Date(p.expiration_date) >= new Date()).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Not yet expired
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                  <Badge className="h-4 w-4 rounded-full bg-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {packages.filter(p => {
                      const expiry = new Date(p.expiration_date);
                      const today = new Date();
                      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                      return expiry >= today && expiry <= weekFromNow;
                    }).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Within 7 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unlimited</CardTitle>
                  <Badge className="h-4 w-4 rounded-full bg-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {packages.filter(p => p.is_unlimited).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No hour limits
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters - Always Visible */}
          <Card className="border-dashed">
            <CardContent className="py-4">
              <PackageFilters
                filters={filters}
                packageTypes={packageTypes}
                onFiltersChange={updateFilters}
                onClearFilters={() => updateFilters({ search: '', package_type_id: '', status: '' })}
              />
            </CardContent>
          </Card>

          {/* Packages Table */}
          <div>
            <PackageListTable
              packages={packages}
              onPackageEdit={handleEditPackage}
              onPackageTransfer={handleTransferPackage}
              onUsageManage={handleManageUsage}
              isLoading={packagesLoading}
            />
          </div>
      </div>


      {/* Package Form Modal for Editing */}
      <PackageForm
        isOpen={showPackageForm}
        package={editingPackage}
        packageTypes={packageTypes}
        onClose={() => {
          setShowPackageForm(false);
          setEditingPackage(undefined);
          refreshPackages();
        }}
      />

      {/* Transfer Modal */}
      <PackageTransferModal
        isOpen={!!transferPackage}
        package={transferPackage}
        onClose={() => {
          setTransferPackage(undefined);
          refreshPackages();
        }}
      />

      {/* Usage Management Modal */}
      <UsageManagementModal
        isOpen={!!usagePackage}
        package={usagePackage}
        onClose={() => {
          setUsagePackage(undefined);
          refreshPackages();
        }}
      />
    </div>
  );
}