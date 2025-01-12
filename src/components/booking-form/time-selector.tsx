'use client'

import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Calendar as CalendarIcon } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format, startOfDay } from 'date-fns'
import { useState } from 'react'

interface TimeSelectorProps {
  date: Date | undefined
  onDateSelect: (date: Date | undefined) => void
  error?: {
    date?: string
  }
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

export function TimeSelector({
  date,
  onDateSelect,
  error,
  disabled,
  minDate,
  maxDate,
}: TimeSelectorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)

  return (
    <div className="space-y-2">
      <Label>Select Date</Label>
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'PPP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate: Date | undefined) => {
              onDateSelect(newDate)
              setCalendarOpen(false)
            }}
            disabled={(date) => {
              if (!date) return false // Handle undefined case
              const today = startOfDay(new Date())
              const targetDate = startOfDay(date)
              
              // Allow today and future dates, but not past dates
              if (targetDate < today) return true
              
              // Apply maxDate if provided
              if (maxDate && targetDate > maxDate) return true
              
              return false
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error?.date && (
        <p className="text-sm text-red-500">{error.date}</p>
      )}
    </div>
  )
}