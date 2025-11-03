'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SimpleCalendar } from '@/components/ui/simple-calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  const formatDateRange = () => {
    if (!startDate && !endDate) {
      return 'Select date range...'
    }

    const currentYear = new Date().getFullYear()

    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      // Show year only if different from current year
      return year === currentYear
        ? format(date, 'MMM d')
        : format(date, 'MMM d, yyyy')
    }

    if (startDate && !endDate) {
      return `From ${formatDate(startDate)}`
    }

    if (!startDate && endDate) {
      return `Until ${formatDate(endDate)}`
    }

    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`
    }

    return 'Select date range...'
  }

  const DesktopCalendarContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">Start Date</label>
          <SimpleCalendar
            mode="single"
            selected={startDate || undefined}
            onSelect={(date) => onStartDateChange(date || null)}
            disabled={(date) => endDate ? date > endDate : false}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">End Date</label>
          <SimpleCalendar
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
  )

  const MobileCalendarContent = () => (
    <>
      <div className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto">
          <div>
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h3 className="text-base font-semibold text-gray-900">Start Date</h3>
            </div>
            <div className="p-2">
              <div className="[&_.flex]:grid [&_.flex]:grid-cols-7 [&_.flex]:gap-0 [&_.flex>div]:w-full [&_.flex>div]:flex [&_.flex>div]:justify-center [&_button]:w-full [&_.w-9]:w-full">
                <SimpleCalendar
                  mode="single"
                  selected={startDate || undefined}
                  onSelect={(date) => onStartDateChange(date || null)}
                  disabled={(date) => endDate ? date > endDate : false}
                  className="border-0"
                />
              </div>
            </div>
          </div>
          <div>
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h3 className="text-base font-semibold text-gray-900">End Date</h3>
            </div>
            <div className="p-2">
              <div className="[&_.flex]:grid [&_.flex]:grid-cols-7 [&_.flex]:gap-0 [&_.flex>div]:w-full [&_.flex>div]:flex [&_.flex>div]:justify-center [&_button]:w-full [&_.w-9]:w-full">
                <SimpleCalendar
                  mode="single"
                  selected={endDate || undefined}
                  onSelect={(date) => onEndDateChange(date || null)}
                  disabled={(date) => startDate ? date < startDate : false}
                  className="border-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t bg-white p-4 flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            onStartDateChange(null)
            onEndDateChange(null)
          }}
        >
          Clear
        </Button>
        <Button
          className="flex-1"
          onClick={() => setIsOpen(false)}
        >
          Apply
        </Button>
      </div>
    </>
  )

  return (
    <div className={cn("space-y-2", className)}>
      {isMobile ? (
        <>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal text-sm h-8',
              (!startDate && !endDate) && 'text-muted-foreground'
            )}
            disabled={disabled}
            onClick={() => setIsOpen(true)}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
          <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent
              className="max-w-full w-full h-full max-h-screen p-0 gap-0 flex flex-col [&>button[aria-label='Close']]:hidden [&>button:last-child]:hidden"
            >
              <DialogHeader className="p-4 pb-3 border-b flex-row items-center justify-between space-y-0">
                <DialogTitle className="text-lg font-semibold">Select Date Range</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="p-2 h-auto hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DialogHeader>
              <MobileCalendarContent />
            </DialogContent>
          </Dialog>
        </>
      ) : (
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
            <DesktopCalendarContent />
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
} 