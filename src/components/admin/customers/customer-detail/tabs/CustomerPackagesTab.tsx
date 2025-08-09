/**
 * Customer Packages Tab
 * Displays package history with status tracking
 * TODO: Full implementation in next phase
 */

import React from 'react';
import { ResponsiveDataView } from '../shared/ResponsiveDataView';
import { CustomerTabError } from '../shared/CustomerDetailError';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatPackageStatus } from '../utils/customerFormatters';
import type { PackageRecord } from '../utils/customerTypes';

interface CustomerPackagesTabProps {
  customerId: string;
  data: PackageRecord[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/**
 * Package card for mobile view
 */
const PackageCard: React.FC<{ package: PackageRecord }> = ({ package: pkg }) => {
  const statusConfig = formatPackageStatus(pkg.status);
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{pkg.package_name}</p>
              <p className="text-sm text-muted-foreground">
                Purchased: {formatDate(pkg.purchase_date)}
              </p>
            </div>
            <Badge variant={statusConfig.variant}>
              {statusConfig.label}
            </Badge>
          </div>
          
          {/* Usage progress */}
          {pkg.original_uses && pkg.uses_remaining !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Usage</span>
                <span>{pkg.original_uses - (pkg.uses_remaining || 0)}/{pkg.original_uses}</span>
              </div>
              <Progress 
                value={pkg.usage_percentage || 0} 
                className="h-2" 
              />
            </div>
          )}
          
          {/* Key dates */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {pkg.first_use_date && (
              <div>
                <span className="block">First Use:</span>
                <span>{formatDate(pkg.first_use_date)}</span>
              </div>
            )}
            {pkg.expiration_date && (
              <div>
                <span className="block">Expires:</span>
                <span>{formatDate(pkg.expiration_date)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Packages table for desktop view
 */
const PackagesTable: React.FC<{ packages: PackageRecord[] }> = ({ packages }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Package Name</TableHead>
        <TableHead>Purchase Date</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Usage</TableHead>
        <TableHead>First Use</TableHead>
        <TableHead>Expiration</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {packages.map((pkg) => {
        const statusConfig = formatPackageStatus(pkg.status);
        
        return (
          <TableRow key={pkg.id}>
            <TableCell className="font-medium">{pkg.package_name}</TableCell>
            <TableCell>{formatDate(pkg.purchase_date)}</TableCell>
            <TableCell>
              <Badge variant={statusConfig.variant}>
                {statusConfig.label}
              </Badge>
            </TableCell>
            <TableCell>
              {pkg.original_uses && pkg.uses_remaining !== null ? (
                <div className="space-y-1">
                  <div className="text-sm">
                    {pkg.original_uses - (pkg.uses_remaining || 0)}/{pkg.original_uses}
                  </div>
                  <Progress 
                    value={pkg.usage_percentage || 0} 
                    className="h-1 w-16" 
                  />
                </div>
              ) : (
                <span className="text-muted-foreground">N/A</span>
              )}
            </TableCell>
            <TableCell>
              {pkg.first_use_date ? formatDate(pkg.first_use_date) : 'Not used'}
            </TableCell>
            <TableCell>
              {pkg.expiration_date ? formatDate(pkg.expiration_date) : 'No expiration'}
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
);

/**
 * Customer Packages Tab Component
 */
export const CustomerPackagesTab: React.FC<CustomerPackagesTabProps> = ({
  customerId,
  data,
  loading,
  error,
  onRefresh
}) => {
  if (error) {
    return (
      <CustomerTabError 
        error={error} 
        onRetry={onRefresh}
        tabName="packages"
      />
    );
  }

  return (
    <ResponsiveDataView
      data={data}
      loading={loading}
      renderCard={(pkg) => <PackageCard package={pkg} />}
      renderTable={() => <PackagesTable packages={data} />}
      emptyState="No packages found for this customer"
      onRefresh={onRefresh}
      onRetry={onRefresh}
    />
  );
};