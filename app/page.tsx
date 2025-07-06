'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileText, Clock, RefreshCw, CalendarRange, Package2, Diamond, Calendar, Bird } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import { LucideIcon } from 'lucide-react'
import { usePackageMonitor } from '@/hooks/use-package-monitor'
import { useMediaQuery } from '@/hooks/use-media-query'
import { menuItems as appMenuItems, type MenuItem as AppMenuItemType } from '@/config/menu-items'
import { ScreenSizeIndicator } from '@/components/ui/screen-size-indicator'

interface MenuItemProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick: () => void;
  extraInfo?: React.ReactNode;
}

const bookingItems = appMenuItems.filter(item => 
  item.title === "Create Booking" || item.title === "Manage Bookings" || item.title === "Bookings Calendar"
);

const packageItems = appMenuItems.filter(item => 
  item.title === "Create Package" || item.title === "Update Package Usage" || item.title === "Package Monitor"
);

const operationsItems = appMenuItems.filter(item => 
  item.title === "Inventory Management"
);

const coachingItems = appMenuItems.filter(item => 
  item.title === "Coaching Dashboard"
);

export default function Home() {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const { data: packageData } = usePackageMonitor()
  const isMobile = useMediaQuery('(max-width: 768px)')

  const handleCustomerUpdate = async () => {
    try {
      setIsUpdating(true)
      console.log('Starting customer update process...')

      const response = await fetch('/api/crm/update-customers', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update customers')
      }

      toast({
        title: "Update Started",
        description: `Customer data update has been initiated (Batch ID: ${data.batch_id}). ${data.records_processed} records will be processed. This takes about 30 seconds to complete.`,
      })

      setTimeout(() => {
        setIsUpdating(false)
        toast({
          title: "Update Complete",
          description: "Customer data has been refreshed. You may now proceed to create packages.",
        })
      }, 30000)

    } catch (error) {
      console.error('Error updating customers:', error)
      toast({
        title: "Error",
        description: error instanceof Error 
          ? `Failed to update customers: ${error.message}`
          : "Failed to start customer update. Please try again.",
        variant: "destructive"
      })
      setIsUpdating(false)
    }
  }

  // Calculate separate counts for diamond and early bird packages
  const diamondPackages = packageData?.unlimited.packages?.filter(pkg => 
    pkg.package_type_name.toLowerCase().includes('diamond')
  ) ?? [];
  
  const earlyBirdPackages = packageData?.unlimited.packages?.filter(pkg => 
    pkg.package_type_name.toLowerCase().includes('early bird')
  ) ?? [];

  // Filter expiring packages to exclude fully used ones, but keep unlimited packages
  const expiringPackages = packageData?.expiring.packages?.filter(pkg => {
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

  const packageInfo = packageData && (
    <div className="text-sm font-medium flex gap-2 mt-2">
      <span className="inline-flex items-center gap-1 text-blue-600">
        <Diamond className="h-3 w-3" />
        {diamondPackages.length}
      </span>
      <span className="inline-flex items-center gap-1 text-purple-600">
        <Bird className="h-3 w-3" />
        {earlyBirdPackages.length}
      </span>
      <span className="inline-flex items-center gap-1 text-amber-600">
        <Clock className="h-3 w-3" />
        {expiringPackages.length}
      </span>
    </div>
  )

  const MobileMenuItem = ({ icon: Icon, title, description, onClick, extraInfo }: MenuItemProps) => (
    <div 
      className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">
            {title === "Package Monitor" ? "View Packages" :
             title === "Update Package Usage" ? "Update Package" :
             title}
          </h2>
          {extraInfo && (
             <div className="text-base font-medium flex gap-3">
              <span className="inline-flex items-center gap-1.5 text-blue-600">
                <Diamond className="h-4 w-4" />
                {diamondPackages.length}
              </span>
              <span className="inline-flex items-center gap-1.5 text-purple-600">
                <Bird className="h-4 w-4" />
                {earlyBirdPackages.length}
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-600">
                <Clock className="h-4 w-4" />
                {expiringPackages.length}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const DesktopMenuItem = ({ icon: Icon, title, description, onClick, extraInfo }: MenuItemProps) => (
    <div 
      className="flex flex-col p-6 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer h-full"
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center flex-1">
        <Icon className="h-12 w-12 mb-4 text-primary" />
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-2 flex-grow">{description}</p>}
        {extraInfo}
      </div>
      <Button className="w-full mt-6" variant="secondary">
        {title === "Package Monitor" ? "View Packages" :
         title === "Update Package Usage" ? "Update Package" :
         title}
      </Button>
    </div>
  )

  return (
    <div className="container max-w-6xl py-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">LENGOLF Backoffice</h1>
      </div>

      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          className="w-full flex items-center gap-2 md:w-auto"
          onClick={handleCustomerUpdate}
          disabled={isUpdating}
        >
          <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Updating Customer Data...' : 'Update Customer Data'}</span>
        </Button>
        <p className="text-xs text-muted-foreground mt-1">Click to refresh customer list</p>
      </div>

      <div className="space-y-6 md:hidden">
        <div>
          <h2 className="text-lg font-semibold mb-3">Booking Management</h2>
          <div className="space-y-3">
            {bookingItems.map((item: AppMenuItemType) => (
              <MobileMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Package Management</h2>
          <div className="space-y-3">
            {packageItems.map((item: AppMenuItemType) => (
              <MobileMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                onClick={() => router.push(item.path)}
                extraInfo={item.title === "Package Monitor" ? packageInfo : undefined}
              />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Daily Operations</h2>
          <div className="space-y-3">
            {operationsItems.map((item: AppMenuItemType) => (
              <MobileMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Coaching</h2>
          <div className="space-y-3">
            {coachingItems.map((item: AppMenuItemType) => (
              <MobileMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="hidden md:block space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-center md:text-left">Booking Management</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {bookingItems.map((item: AppMenuItemType) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={isMobile ? undefined : item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4 mt-8 text-center md:text-left">Package Management</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {packageItems.map((item: AppMenuItemType) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={isMobile ? undefined : item.description}
                onClick={() => router.push(item.path)}
                extraInfo={item.title === "Package Monitor" ? packageInfo : undefined}
              />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4 mt-8 text-center md:text-left">Daily Operations</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {operationsItems.map((item: AppMenuItemType) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={isMobile ? undefined : item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4 mt-8 text-center md:text-left">Coaching</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {coachingItems.map((item: AppMenuItemType) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={isMobile ? undefined : item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Screen Size Indicator - Only show in development */}
      <ScreenSizeIndicator />
    </div>
  )
}