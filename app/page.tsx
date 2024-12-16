'use client'

import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Clock, RefreshCw } from 'lucide-react'
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

      // Show batch details in success message
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
    <div className="container mx-auto py-6 md:py-10">
      <div className="flex flex-col items-center gap-6 md:gap-8">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold">LENGOLF Forms System</h1>
          <p className="text-muted-foreground mt-2">
            Select a form to get started
          </p>
        </div>

        <div className="w-full max-w-4xl">
          <Button 
            variant="outline" 
            className="w-full mb-6 py-6 flex items-center gap-2"
            onClick={handleCustomerUpdate}
            disabled={isUpdating}
          >
            <RefreshCw className={`h-5 w-5 text-primary ${isUpdating ? 'animate-spin' : ''}`} />
            <div className="flex flex-col items-center">
              <span className="font-medium">
                {isUpdating ? 'Updating Customer Data...' : 'Update Customer Data'}
              </span>
              <span className="text-sm text-muted-foreground">
                {isUpdating ? 'This will take about 30 seconds' : 'Click to refresh customer data from CRM'}
              </span>
            </div>
          </Button>
          
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <Card className="cursor-pointer transition-all hover:shadow-lg" 
                  onClick={() => router.push('/create-package')}>
              <CardHeader className="text-center space-y-2 md:space-y-3 py-4 md:py-6">
                <FileSpreadsheet className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-1 md:mb-2 text-primary" />
                <CardTitle className="text-lg md:text-xl">Create Package</CardTitle>
                <CardDescription className="text-sm">
                  Create new packages for customers
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4 md:pb-6">
                <Button className="w-full" variant="secondary">
                  Create Package
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-lg"
                  onClick={() => router.push('/update-package')}>
              <CardHeader className="text-center space-y-2 md:space-y-3 py-4 md:py-6">
                <Clock className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-1 md:mb-2 text-primary" />
                <CardTitle className="text-lg md:text-xl">Update Package Usage</CardTitle>
                <CardDescription className="text-sm">
                  Record package usage for customers
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4 md:pb-6">
                <Button className="w-full" variant="secondary">
                  Update Package
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}