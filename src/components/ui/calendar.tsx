"use client"

import * as React from "react"
import { SimpleCalendar } from "@/components/ui/simple-calendar"

export interface CalendarProps {
  mode?: 'single'
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  className?: string
  defaultMonth?: Date
  initialFocus?: boolean
}

/**
 * Calendar component — thin wrapper around SimpleCalendar for backward compatibility.
 * SimpleCalendar is a custom implementation that works reliably (unlike react-day-picker v9
 * which has class name API breaking changes from v8).
 */
function Calendar({
  initialFocus: _initialFocus,
  ...props
}: CalendarProps) {
  return <SimpleCalendar {...props} />
}

Calendar.displayName = "Calendar"

export { Calendar }
