'use client'

import { Calendar } from '@/components/ui/calendar'
import { SimpleCalendar } from '@/components/ui/simple-calendar'
import { useState } from 'react'
import { startOfDay } from 'date-fns'

export default function TestCalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date())

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Calendar Test Page</h1>

      <div className="space-y-8">
        {/* Test: New Simple Calendar (React 19 Compatible) */}
        <div>
          <h2 className="text-lg font-semibold mb-4">✅ NEW: Simple Calendar (React 19 Compatible)</h2>
          <div className="border rounded-md max-w-sm">
            <SimpleCalendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) => {
                const today = startOfDay(new Date())
                const targetDate = startOfDay(date)
                return targetDate < today
              }}
            />
          </div>
        </div>

        {/* Test 1: Basic calendar with container */}
        <div>
          <h2 className="text-lg font-semibold mb-4">❌ OLD: Basic Calendar (Broken)</h2>
          <div className="border p-4 max-w-sm">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </div>
        </div>

        {/* Test 2: Calendar without any wrapper styling */}
        <div>
          <h2 className="text-lg font-semibold mb-4">❌ OLD: Minimal Calendar (Broken)</h2>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Current Selected Date</h2>
          <p>{date ? date.toDateString() : "No date selected"}</p>
        </div>
      </div>
    </div>
  )
}