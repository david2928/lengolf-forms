'use client';

import { useState, useEffect } from 'react';
import { PackageGrid } from '@/components/package-monitor/package-grid';
import { CustomerSelector } from '@/components/package-monitor/customer-selector';
import { InactivePackages } from '@/components/package-monitor/inactive-packages';
import { usePackageMonitor } from '@/hooks/use-package-monitor';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Clock, Diamond, Users, Activity, Bird, Pause } from 'lucide-react';

interface InactivePackage {
  id: string
  customer_name: string
  package_type_name: string
  package_type: string
  purchase_date: string
  employee_name: string
}

export default function PackageMonitorPage() {
  const { data, isLoading, error } = usePackageMonitor();
  const [activeTab, setActiveTab] = useState('overview');
  const [inactivePackages, setInactivePackages] = useState<InactivePackage[]>([]);
  const [isLoadingInactive, setIsLoadingInactive] = useState(true);

  // Fetch inactive packages
  useEffect(() => {
    const fetchInactivePackages = async () => {
      try {
        setIsLoadingInactive(true);
        const response = await fetch('/api/packages/inactive');
        if (response.ok) {
          const data = await response.json();
          setInactivePackages(data);
        }
      } catch (err) {
        console.error('Error fetching inactive packages:', err);
      } finally {
        setIsLoadingInactive(false);
      }
    };

    fetchInactivePackages();
  }, []);

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

  // Separate diamond and early bird packages using name-based logic for now
  // This will work until the SQL update is applied
  const diamondPackages = data?.unlimited.packages?.filter(pkg => 
    pkg.package_type_name.toLowerCase().includes('diamond')
  ) ?? [];
  
  const earlyBirdPackages = data?.unlimited.packages?.filter(pkg => 
    pkg.package_type_name.toLowerCase().includes('early bird')
  ) ?? [];

  // Filter out fully used packages from expiring packages, but keep unlimited packages
  const expiringPackages = data?.expiring.packages?.filter(pkg => {
    // Always include unlimited packages (diamond/early bird) as they can expire
    const isUnlimited = pkg.package_type === 'Unlimited' || 
                       pkg.package_type_name.toLowerCase().includes('diamond') ||
                       pkg.package_type_name.toLowerCase().includes('early bird');
    
    // For unlimited packages, always show them if they're in expiring list
    if (isUnlimited) {
      return true;
    }
    
    // For regular packages, only show if they have remaining hours
    if (pkg.remaining_hours === undefined || pkg.remaining_hours === null) {
      return false;
    }
    
    // Handle both string and number types for remaining_hours
    const remainingHoursNum = typeof pkg.remaining_hours === 'string' ? 
      parseFloat(pkg.remaining_hours) : pkg.remaining_hours;
    
    return !isNaN(remainingHoursNum) && remainingHoursNum > 0;
  }) ?? [];

  const inactiveCount = isLoadingInactive ? '...' : inactivePackages.length;

  // Handle card clicks to switch tabs
  const handleCardClick = (tabName: string) => {
    setActiveTab(tabName);
  };

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">Package Monitor</h1>
        <p className="text-muted-foreground mt-2">
          Track active Unlimited packages, packages nearing expiration, and packages waiting for activation
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex items-center gap-2">
              <Pause className="h-4 w-4" />
              <span className="hidden sm:inline">Inactive</span>
            </TabsTrigger>
            <TabsTrigger value="unlimited" className="flex items-center gap-2">
              <Diamond className="h-4 w-4" />
              <span className="hidden sm:inline">Unlimited</span>
            </TabsTrigger>
            <TabsTrigger value="expiring" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Expiring</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleCardClick('unlimited')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Diamond Packages</CardTitle>
                  <Diamond className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{diamondPackages.length}</div>
                  <p className="text-xs text-muted-foreground">Active unlimited</p>
                </CardContent>
              </Card>
              
              <Card 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleCardClick('unlimited')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Early Bird Packages</CardTitle>
                  <Bird className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{earlyBirdPackages.length}</div>
                  <p className="text-xs text-muted-foreground">Active unlimited</p>
                </CardContent>
              </Card>
              
              <Card 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleCardClick('expiring')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{expiringPackages.length}</div>
                  <p className="text-xs text-muted-foreground">Next 7 days</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleCardClick('inactive')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inactive Packages</CardTitle>
                  <Pause className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{inactiveCount}</div>
                  <p className="text-xs text-muted-foreground">Awaiting activation</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inactive" className="space-y-6">
            <InactivePackages />
          </TabsContent>

          <TabsContent value="unlimited" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <PackageGrid
                title="Diamond Packages"
                packages={diamondPackages}
                emptyMessage="No active diamond packages"
                type="unlimited"
                icon="diamond"
              />
              
              <PackageGrid
                title="Early Bird Packages"
                packages={earlyBirdPackages}
                emptyMessage="No active early bird packages"
                type="unlimited"
                icon="bird"
              />
            </div>
          </TabsContent>

          <TabsContent value="expiring" className="space-y-6">
            <PackageGrid
              title="Packages Expiring Soon"
              packages={expiringPackages}
              emptyMessage="No packages expiring soon"
              type="expiring"
            />
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <CustomerSelector
              onCustomerSelect={(customerId) => {
                console.log('Selected customer:', customerId);
              }}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}