'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileText, Clock, RefreshCw, CalendarRange } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import { LucideIcon } from 'lucide-react'

interface MenuItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}

export default function Home() {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

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

  const MobileMenuItem = ({ icon: Icon, title, description, onClick }: MenuItemProps) => (
    <div 
      className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )

  const DesktopMenuItem = ({ icon: Icon, title, description, onClick }: MenuItemProps) => (
    <div 
      className="flex flex-col space-y-4 p-6 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <Icon className="h-12 w-12 mx-auto text-primary" />
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button className="mt-auto" variant="secondary">{title}</Button>
    </div>
  )

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
        <MobileMenuItem
          icon={CalendarRange}
          title="Create Booking"
          description="Book bays and manage appointments"
          onClick={() => router.push('/create-booking')}
        />
        <MobileMenuItem
          icon={FileText}
          title="Create Package"
          description="Create new packages for customers"
          onClick={() => router.push('/create-package')}
        />
        <MobileMenuItem
          icon={Clock}
          title="Update Package Usage"
          description="Record package usage for customers"
          onClick={() => router.push('/update-package')}
        />
      </div>

      <div className="hidden md:grid md:grid-cols-3 md:gap-6">
        <DesktopMenuItem
          icon={CalendarRange}
          title="Create Booking"
          description="Book bays and manage appointments"
          onClick={() => router.push('/create-booking')}
        />
        <DesktopMenuItem
          icon={FileText}
          title="Create Package"
          description="Create new packages for customers"
          onClick={() => router.push('/create-package')}
        />
        <DesktopMenuItem
          icon={Clock}
          title="Update Package Usage"
          description="Record package usage for customers"
          onClick={() => router.push('/update-package')}
        />
      </div>
    </div>
  )
}