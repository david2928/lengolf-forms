'use client';

import { PackageGrid } from '@/components/package-monitor/package-grid';
import { CustomerSelector } from '@/components/package-monitor/customer-selector';
import { usePackageMonitor } from '@/hooks/use-package-monitor';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function PackageMonitorPage() {
  const { data, isLoading, error } = usePackageMonitor();

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load package data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">Package Monitor</h1>
        <p className="text-muted-foreground mt-2">
          Track active Unlimited packages and packages nearing expiration
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <>
          <PackageGrid
            title="Active Unlimited Packages"
            packages={data?.unlimited.packages ?? []}
            emptyMessage="No active unlimited packages"
            type="unlimited"
          />
          
          <PackageGrid
            title="Packages Expiring Soon"
            packages={data?.expiring.packages ?? []}
            emptyMessage="No packages expiring soon"
            type="expiring"
          />
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Package List</h2>
            <CustomerSelector
              onCustomerSelect={(customerId) => {
                console.log('Selected customer:', customerId);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}