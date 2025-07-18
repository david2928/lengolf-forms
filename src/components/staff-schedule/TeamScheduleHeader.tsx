'use client'

import { Users } from 'lucide-react'

interface TeamScheduleHeaderProps {
  teamStats: {
    total_staff: number
    staff_scheduled: number
    total_shifts: number
    staff_with_multiple_shifts?: number
    coverage_percentage?: number
  }
  selectedDate: Date
  className?: string
}

export function TeamScheduleHeader({ 
  teamStats, 
  selectedDate,
  className = '' 
}: TeamScheduleHeaderProps) {
  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  return (
    <div className={`bg-white px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900">
            Team Schedule
          </h2>
        </div>
        <div className="text-sm font-medium text-blue-600">
          {isToday ? 'Today' : ''}
        </div>
      </div>
      
      <p className="text-sm text-slate-600 mb-3">
        {formattedDate}
      </p>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex space-x-3">
          <div>
            <span className="text-slate-500">Staff Working:</span>
            <span className="ml-1 font-medium text-slate-700">
              {teamStats.staff_scheduled}/{teamStats.total_staff}
            </span>
          </div>
          
          <div>
            <span className="text-slate-500">Total Shifts:</span>
            <span className="ml-1 font-medium text-slate-700">
              {teamStats.total_shifts}
            </span>
          </div>
        </div>
        
        {teamStats.coverage_percentage !== undefined && (
          <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
            {teamStats.coverage_percentage}% Coverage
          </div>
        )}
      </div>
    </div>
  )
}