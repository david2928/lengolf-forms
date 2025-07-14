'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from 'lucide-react'

interface PayrollMonth {
  month: string
  display: string
  formatted: string
}

interface MonthSelectorProps {
  months: PayrollMonth[]
  selectedMonth: string
  onMonthChange: (month: string) => void
}

export function MonthSelector({ months, selectedMonth, onMonthChange }: MonthSelectorProps) {
  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Select value={selectedMonth} onValueChange={onMonthChange}>
        <SelectTrigger className="w-full sm:w-[180px] min-w-[120px]">
          <SelectValue placeholder="Select month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month.month} value={month.month}>
              {month.formatted}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
} 