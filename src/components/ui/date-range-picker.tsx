'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DateRangePickerProps {
  startDate?: Date | null
  endDate?: Date | null
  onStartDateChange: (date: Date | null) => void
  onEndDateChange: (date: Date | null) => void
  disabled?: boolean
  className?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false,
  className
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const formatDateRange = () => {
    if (!startDate && !endDate) {
      return 'Select date range...'
    }
    
    if (startDate && !endDate) {
      return `${format(startDate, 'MMM dd, yyyy')} - Select end date`
    }
    
    if (!startDate && endDate) {
      return `Select start date - ${format(endDate, 'MMM dd, yyyy')}`
    }
    
    if (startDate && endDate) {
      return `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
    }
    
    return 'Select date range...'
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal text-sm h-8',
              (!startDate && !endDate) && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Start Date</label>
                <Calendar
                  mode="single"
                  selected={startDate || undefined}
                  onSelect={(date) => onStartDateChange(date || null)}
                  disabled={(date) => endDate ? date > endDate : false}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">End Date</label>
                <Calendar
                  mode="single"
                  selected={endDate || undefined}
                  onSelect={(date) => onEndDateChange(date || null)}
                  disabled={(date) => startDate ? date < startDate : false}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  onStartDateChange(null)
                  onEndDateChange(null)
                }}
              >
                Clear
              </Button>
              <Button 
                size="sm" 
                onClick={() => setIsOpen(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 