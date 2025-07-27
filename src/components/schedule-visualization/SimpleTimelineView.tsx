'use client'

import React, { useState } from 'react'
import { StaffColorAssignment } from '@/lib/staff-colors'
import { ChevronDown, Clock, User } from 'lucide-react'

interface ScheduleEntry {
  id: string
  staff_id: number
  staff_name: string
  start_time: string
  end_time: string
  schedule_date: string
  location?: string
  is_recurring?: boolean
}

interface SimpleTimelineViewProps {
  scheduleData: {
    raw_schedules: ScheduleEntry[]
    week_period: {
      start_date: string
      end_date: string
    }
  }
  staffAssignments: StaffColorAssignment[]
  weekStart: string
  loading?: boolean
}

export function SimpleTimelineView({
  scheduleData,
  staffAssignments,
  weekStart,
  loading = false
}: SimpleTimelineViewProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Schedule Overview</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded mb-4"></div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Generate time slots from 10am to 11pm
  const timeSlots = []
  for (let hour = 10; hour <= 23; hour++) {
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    const ampm = hour >= 12 ? 'pm' : 'am'
    timeSlots.push({
      hour,
      display: `${displayHour}${ampm}`,
      time24: `${hour.toString().padStart(2, '0')}:00`
    })
  }

  // Generate days of the week
  const startDate = new Date(weekStart)
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    days.push({
      dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      date: date.getDate(),
      fullDate: date.toISOString().split('T')[0]
    })
  }

  // Get staff color
  const getStaffColor = (staffId: number) => {
    const assignment = staffAssignments.find(a => a.staffId === staffId)
    return assignment?.color || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', hex: '#6b7280' }
  }

  // Format time for display
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number)
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    const ampm = hours >= 12 ? 'pm' : 'am'
    return minutes === 0 ? `${displayHour}${ampm}` : `${displayHour}:${minutes.toString().padStart(2, '0')}${ampm}`
  }

  // Get schedules for a specific day
  const getSchedulesForDay = (dateStr: string) => {
    return scheduleData.raw_schedules?.filter(schedule => schedule.schedule_date === dateStr) || []
  }

  // Calculate schedule duration in hours
  const calculateDuration = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    const startTotal = startHour + startMin / 60
    const endTotal = endHour + endMin / 60
    return endTotal - startTotal
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900">Schedule Overview</h3>
        <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
          View Only
        </div>
      </div>

      {/* Calendar Grid - Simple Table Layout */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="text-xs font-medium text-slate-600 p-2">Time</div>
            {days.map((day) => (
              <div key={day.fullDate} className="text-center p-2 border-b border-slate-200">
                <div className="text-xs font-medium text-slate-600">{day.dayName}</div>
                <div className="text-sm font-bold text-slate-900">{day.date}</div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="space-y-1">
            {timeSlots.map((slot) => (
              <div key={slot.hour} className="grid grid-cols-8 gap-1 items-start">
                {/* Time Label */}
                <div className="text-xs text-slate-600 p-2 text-right">
                  {slot.display}
                </div>

                {/* Day Columns */}
                {days.map((day) => {
                  const daySchedules = getSchedulesForDay(day.fullDate)
                  
                  // Find schedules that start in this time slot
                  const schedulesStartingHere = daySchedules.filter(schedule => {
                    const startHour = parseInt(schedule.start_time.split(':')[0])
                    return startHour === slot.hour
                  })

                  return (
                    <div key={`${day.fullDate}-${slot.hour}`} className="min-h-[50px] p-1 border border-slate-100 bg-slate-50/30">
                      {schedulesStartingHere.map((schedule) => {
                        const staffColor = getStaffColor(schedule.staff_id)
                        const duration = calculateDuration(schedule.start_time, schedule.end_time)
                        
                        return (
                          <div
                            key={schedule.id}
                            className={`
                              relative mb-1 text-xs p-2 rounded-md border-l-4 ${staffColor.bg} ${staffColor.text} ${staffColor.border}
                              shadow-sm hover:shadow-md transition-all cursor-pointer
                            `}
                            style={{
                              borderLeftColor: staffColor.hex,
                              minHeight: `${Math.max(duration * 35, 35)}px` // Scale height with duration
                            }}
                            title={`${schedule.staff_name}: ${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)} (${duration}h)`}
                          >
                            {/* Staff name */}
                            <div className="font-semibold truncate text-xs leading-tight">
                              {schedule.staff_name}
                            </div>
                            
                            {/* Time range */}
                            <div className="text-xs opacity-80 leading-tight mt-0.5">
                              {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                            </div>
                            
                            {/* Duration indicator for longer shifts */}
                            {duration > 2 && (
                              <div className="text-xs opacity-70 leading-tight">
                                {duration}h
                              </div>
                            )}
                            
                            {/* Location */}
                            {schedule.location && (
                              <div className="text-xs opacity-60 truncate leading-tight mt-0.5">
                                📍 {schedule.location}
                              </div>
                            )}
                            
                            {/* Recurring indicator */}
                            {schedule.is_recurring && (
                              <div className="absolute top-1 right-1">
                                <span className="text-xs opacity-75">🔄</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      {/* Empty state for time slots */}
                      {schedulesStartingHere.length === 0 && (
                        <div className="h-8 flex items-center justify-center text-slate-300 text-xs">
                          {/* Optional: show available indicator */}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-50 border-l-4 border-l-blue-500 rounded"></div>
              <span>Scheduled</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>🔄</span>
              <span>Recurring</span>
            </div>
          </div>
          <div>Business hours: 10am - 11pm</div>
        </div>
      </div>
    </div>
  )
}

export default SimpleTimelineView