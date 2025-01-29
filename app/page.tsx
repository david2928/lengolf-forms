'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileText, Clock, RefreshCw, CalendarRange, Package2, Diamond } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import { LucideIcon } from 'lucide-react'
import { usePackageMonitor } from '@/hooks/use-package-monitor'
import { useMediaQuery } from '@/hooks/use-media-query'

interface MenuItemProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick: () => void;
  extraInfo?: React.ReactNode;
}

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

  const packageInfo = packageData && (
    <div className="text-sm font-medium flex gap-3">
      <span className="inline-flex items-center gap-1 text-blue-600">
        <Diamond className="h-3 w-3" />
        {packageData.diamond.count}
      </span>
      <span className="inline-flex items-center gap-1 text-amber-600">
        <Clock className="h-3 w-3" />
        {packageData.expiring.count}
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
        <div className="flex items-center gap-2">
          <h2 className="font-medium">{title}</h2>
          {extraInfo}
        </div>
      </div>
    </div>
  )

  const DesktopMenuItem = ({ icon: Icon, title, description, onClick, extraInfo }: MenuItemProps) => (
    <div 
      className="flex flex-col p-6 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center">
        <Icon className="h-12 w-12 mb-4 text-primary" />
        <h2 className="text-xl font-semibold">{title}</h2>
        {extraInfo}
        {description && <p className="text-sm text-muted-foreground mt-2">{description}</p>}
      </div>
      <Button className="w-full mt-6" variant="secondary">{title}</Button>
    </div>
  )

  const menuItems = [
    {
      icon: CalendarRange,
      title: "Create Booking",
      description: !isMobile ? "Book bays and manage appointments" : undefined,
      path: '/create-booking'
    },
    {
      icon: FileText,
      title: "Create Package",
      description: !isMobile ? "Create new packages for customers" : undefined,
      path: '/create-package'
    },
    {
      icon: Clock,
      title: "Update Package Usage",
      description: !isMobile ? "Record package usage for customers" : undefined,
      path: '/update-package'
    },
    {
      icon: Package2,
      title: "Package Monitor",
      description: !isMobile ? "Monitor Diamond and expiring packages" : undefined,
      path: '/package-monitor',
      extraInfo: packageInfo
    }
  ]

  return (
    <div className="container max-w-6xl py-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">LENGOLF Forms System</h1>
        <p className="text-muted-foreground mt-1">Select a form to get started</p>
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

      <div className="space-y-3 md:hidden">
        {menuItems.map((item) => (
          <MobileMenuItem
            key={item.title}
            icon={item.icon}
            title={item.title}
            description={item.description}
            onClick={() => router.push(item.path)}
            extraInfo={item.extraInfo}
          />
        ))}
      </div>

      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {menuItems.map((item) => (
          <DesktopMenuItem
            key={item.title}
            icon={item.icon}
            title={item.title}
            description={item.description}
            onClick={() => router.push(item.path)}
            extraInfo={item.extraInfo}
          />
        ))}
      </div>
    </div>
  )
}