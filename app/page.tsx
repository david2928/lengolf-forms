'use client'

import { useRouter } from 'next/navigation'
import { CoachRedirect } from '@/components/coach-redirect'
import { Button } from '@/components/ui/button'
import { Clock, Diamond, Bird } from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { usePackageMonitor } from '@/hooks/use-package-monitor'
import { menuItems as appMenuItems, type MenuItem as AppMenuItemType } from '@/config/menu-items'
import { ScreenSizeIndicator } from '@/components/ui/screen-size-indicator'
import { useSession } from 'next-auth/react'
import React from 'react'

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

// Note: operationsItems is dynamically filtered below based on admin status

const coachingItems = appMenuItems.filter(item => 
  item.title === "Coaching Assistant"
);

export default function Home() {
  const router = useRouter()
  const { data: packageData } = usePackageMonitor()
  const { data: session } = useSession()
  const [isClient, setIsClient] = React.useState(false)
  
  React.useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Development bypass - show admin features even without authentication
  const shouldBypass = (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
  );
  
  // Only apply role-based filtering after client hydration to avoid hydration mismatch
  const isAdmin = isClient && (shouldBypass ? true : (session?.user?.isAdmin || false));
  
  // Filter operations items based on admin status
  const operationsItems = appMenuItems.filter(item => {
    if (item.title === "Inventory Management" || item.title === "Staff Time Clock" || item.title === "Staff Schedule") {
      return true; // Available to all users
    }
    if (item.title === "POS System") {
      return isAdmin; // Only available to admins
    }
    return false;
  });


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

  const MobileMenuItem = ({ icon: Icon, title, onClick, extraInfo }: MenuItemProps) => (
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

  const DesktopMenuItem = ({ icon: Icon, title, onClick, extraInfo }: MenuItemProps) => (
    <div 
      className="flex flex-col p-6 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer h-full"
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center flex-1">
        <Icon className="h-12 w-12 mb-4 text-primary" />
        <h2 className="text-xl font-semibold">{title}</h2>
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
    <>
      <CoachRedirect />
      <div className="container max-w-6xl py-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">LENGOLF Backoffice</h1>
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
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>
      </div>

        {/* Screen Size Indicator - Only show in development */}
        <ScreenSizeIndicator />
      </div>
    </>
  )
}