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
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedMonth} onValueChange={onMonthChange}>
        <SelectTrigger className="w-[180px]">
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