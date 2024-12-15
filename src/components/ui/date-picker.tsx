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
import { Label } from '@/components/ui/label'

interface DatePickerProps {
  value?: Date | null
  onChange: (date: Date | null) => void
  disabled?: boolean
  label?: string
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  label = 'Select Date'
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (date: Date | undefined) => {
    onChange(date || null)
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, 'PPP') : <span>Select date...</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}