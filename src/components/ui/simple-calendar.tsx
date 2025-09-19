'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  startOfDay
} from 'date-fns'

interface SimpleCalendarProps {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  className?: string
  mode?: 'single'
}

export function SimpleCalendar({
  selected,
  onSelect,
  disabled,
  className,
  mode = 'single'
}: SimpleCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const dateFormat = 'MMM yyyy'
  const rows = []
  let days = []
  let day = startDate
  let formattedDate = ''

  // Create header
  const header = (
    <div className="flex items-center justify-between p-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-sm font-medium">
        {format(monthStart, dateFormat)}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )

  // Create weekdays header
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const weekdaysRow = (
    <div className="flex">
      {weekDays.map(day => (
        <div
          key={day}
          className="text-muted-foreground flex h-9 w-9 items-center justify-center text-[0.8rem] font-normal"
        >
          {day}
        </div>
      ))}
    </div>
  )

  // Create calendar body
  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, 'd')
      const cloneDay = day
      const isDisabled = disabled ? disabled(cloneDay) : false
      const isSelectedDay = selected && isSameDay(day, selected)
      const isTodayDay = isToday(day)
      const isCurrentMonth = isSameMonth(day, monthStart)

      days.push(
        <div key={day.toString()} className="flex h-9 w-9 items-center justify-center">
          <Button
            variant="ghost"
            className={cn(
              "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
              isSelectedDay && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              isTodayDay && !isSelectedDay && "bg-accent text-accent-foreground",
              !isCurrentMonth && "text-muted-foreground opacity-50",
              isDisabled && "text-muted-foreground opacity-50 cursor-not-allowed"
            )}
            disabled={isDisabled}
            onClick={() => {
              if (!isDisabled && onSelect) {
                onSelect(cloneDay)
              }
            }}
          >
            <time dateTime={format(cloneDay, 'yyyy-MM-dd')}>{formattedDate}</time>
          </Button>
        </div>
      )
      day = addDays(day, 1)
    }
    rows.push(
      <div className="flex w-full" key={day.toString()}>
        {days}
      </div>
    )
    days = []
  }

  return (
    <div className={cn("p-3", className)}>
      {header}
      {weekdaysRow}
      <div className="space-y-1">
        {rows}
      </div>
    </div>
  )
}

SimpleCalendar.displayName = "SimpleCalendar"