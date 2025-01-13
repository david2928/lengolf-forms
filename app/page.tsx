'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileText, Clock, RefreshCw, CalendarRange } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'

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

  return (
    <div className="container max-w-lg mx-auto px-4 py-4 space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">LENGOLF Forms System</h1>
        <p className="text-sm text-muted-foreground mt-1">Select a form to get started</p>
      </div>

      {/* Update Customer Data Tool */}
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          className="w-auto"
          onClick={handleCustomerUpdate}
          disabled={isUpdating}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Updating Customer Data...' : 'Update Customer Data'}</span>
        </Button>
        <p className="text-xs text-muted-foreground mt-1">Click to refresh customer list</p>
      </div>

      {/* Forms List */}
      <div className="space-y-3">
        {/* Create Booking */}
        <div 
          className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => router.push('/create-booking')}
        >
          <CalendarRange className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-medium">Create Booking</h2>
            <p className="text-sm text-muted-foreground">Book bays and manage appointments</p>
          </div>
        </div>

        {/* Create Package */}
        <div 
          className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => router.push('/create-package')}
        >
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-medium">Create Package</h2>
            <p className="text-sm text-muted-foreground">Create new packages for customers</p>
          </div>
        </div>

        {/* Update Package Usage */}
        <div 
          className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => router.push('/update-package')}
        >
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-medium">Update Package Usage</h2>
            <p className="text-sm text-muted-foreground">Record package usage for customers</p>
          </div>
        </div>
      </div>
    </div>
  )
}