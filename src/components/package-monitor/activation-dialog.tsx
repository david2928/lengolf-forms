'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SimpleCalendar } from '@/components/ui/simple-calendar'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { Loader2, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

interface ActivationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  package: {
    id: string
    customer_name: string
    package_type_name: string
    purchase_date: string
    employee_name: string
  } | null
  onActivationComplete: () => void
}

export function ActivationDialog({ 
  open, 
  onOpenChange, 
  package: packageData, 
  onActivationComplete 
}: ActivationDialogProps) {
  const [activationDate, setActivationDate] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(false)

  const handleActivate = async () => {
    if (!packageData || !activationDate) return

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/packages/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: packageData.id,
          firstUseDate: format(activationDate, 'yyyy-MM-dd'),
          employeeName: packageData.employee_name
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to activate package')
      }

      toast({
        title: 'Package Activated',
        description: `Package for ${packageData.customer_name} has been activated successfully.`
      })

      onActivationComplete()
      onOpenChange(false)
      setActivationDate(new Date()) // Reset for next use
    } catch (error) {
      console.error('Error activating package:', error)
      toast({
        title: 'Activation Failed',
        description: error instanceof Error ? error.message : 'Failed to activate package',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!packageData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Activate Package</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Customer</div>
            <div className="font-medium">{packageData.customer_name}</div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Package Type</div>
            <div className="font-medium">{packageData.package_type_name}</div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Purchase Date</div>
            <div className="font-medium">{format(new Date(packageData.purchase_date), 'PP')}</div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Sold By</div>
            <div className="font-medium">{packageData.employee_name}</div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Activation Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {activationDate ? format(activationDate, 'PPP') : 'Select date...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <SimpleCalendar
                  mode="single"
                  selected={activationDate}
                  onSelect={(date) => {
                    if (date) setActivationDate(date)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleActivate}
              disabled={isLoading || !activationDate}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                'Activate Package'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 