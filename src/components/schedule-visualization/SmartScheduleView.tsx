'use client'

import React, { useState, useMemo } from 'react'
import { StaffColorAssignment } from '@/lib/staff-colors'
import { ChevronDown, Clock, User, MapPin, Plus } from 'lucide-react'

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

interface SmartScheduleViewProps {
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

// Time slots from 10am to 11pm
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 10
  return {
    hour,
    display: hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`,
    time24: `${hour.toString().padStart(2, '0')}:00`
  }
})

// Precise time calculations
const timeToMinutes = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

const minutesToHours = (minutes: number) => {
  return minutes / 60
}

const getSchedulePosition = (startTime: string, endTime: string) => {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const businessStartMinutes = 10 * 60 // 10am
  
  const startPosition = (startMinutes - businessStartMinutes) / 60 // Hours from 10am
  const duration = (endMinutes - startMinutes) / 60 // Duration in hours
  
  return { startPosition, duration, endPosition: startPosition + duration }
}

// Smart overlap resolution with better visual grouping
const resolveScheduleLayout = (schedules: ScheduleEntry[]) => {
  const processedSchedules = schedules.map(schedule => {
    const { startPosition, duration, endPosition } = getSchedulePosition(schedule.start_time, schedule.end_time)
    return {
      ...schedule,
      startPosition,
      duration,
      endPosition,
      column: 0,
      totalColumns: 1,
      group: 0
    }
  })

  // Sort by start time
  processedSchedules.sort((a, b) => a.startPosition - b.startPosition)

  // Group overlapping schedules
  const groups: typeof processedSchedules[][] = []
  
  for (const schedule of processedSchedules) {
    let placed = false
    
    // Try to place in existing group
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      const hasOverlap = group.some(existing => 
        schedule.startPosition < existing.endPosition && schedule.endPosition > existing.startPosition
      )
      
      if (hasOverlap) {
        group.push(schedule)
        schedule.group = i
        placed = true
        break
      }
    }
    
    // Create new group if no overlap
    if (!placed) {
      schedule.group = groups.length
      groups.push([schedule])
    }
  }

  // Assign columns within each group
  groups.forEach((group, groupIndex) => {
    group.sort((a, b) => a.startPosition - b.startPosition)
    group.forEach((schedule, index) => {
      schedule.column = index
      schedule.totalColumns = group.length
    })
  })

  return processedSchedules
}

export function SmartScheduleView({
  scheduleData,
  staffAssignments,
  weekStart,
  loading = false
}: SmartScheduleViewProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [hoveredSchedule, setHoveredSchedule] = useState<string | null>(null)

  // Memoized calculations
  const { days, schedulesData } = useMemo(() => {
    const startDate = new Date(weekStart)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      return {
        dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        date: date.getDate(),
        fullDate: dateStr,
        isToday: dateStr === todayStr
      }
    })

    // Process schedules for each day
    const schedulesData = days.reduce((acc, day) => {
      const daySchedules = scheduleData.raw_schedules?.filter(
        schedule => schedule.schedule_date === day.fullDate
      ) || []
      
      acc[day.fullDate] = resolveScheduleLayout(daySchedules)
      return acc
    }, {} as Record<string, ReturnType<typeof resolveScheduleLayout>>)

    return { days, schedulesData }
  }, [scheduleData, weekStart])

  // Get staff color
  const getStaffColor = (staffId: number) => {
    const assignment = staffAssignments.find(a => a.staffId === staffId)
    return assignment?.color || { 
      bg: 'bg-gray-100', 
      text: 'text-gray-800', 
      border: 'border-gray-300', 
      hex: '#6b7280' 
    }
  }

  // Format time for display
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number)
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    const ampm = hours >= 12 ? 'pm' : 'am'
    return minutes === 0 ? `${displayHour}${ampm}` : `${displayHour}:${minutes.toString().padStart(2, '0')}${ampm}`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Schedule Overview</h3>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-6 bg-slate-200 rounded"></div>
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="h-12 bg-slate-100 rounded"></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Smart Schedule View</h3>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            <span>10am - 11pm</span>
          </div>
        </div>
      </div>

      {/* Desktop Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Week Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 z-20">
            <div className="grid grid-cols-8 gap-px">
              <div className="bg-slate-50 p-3 text-xs font-medium text-slate-600">Time</div>
              {days.map((day) => (
                <div key={day.fullDate} className="bg-slate-50 p-3 text-center">
                  <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    day.isToday 
                      ? 'bg-blue-100 text-blue-900 shadow-sm' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}>
                    <span>{day.dayName}</span>
                    <span className="font-bold">{day.date}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {schedulesData[day.fullDate]?.length || 0} shift{schedulesData[day.fullDate]?.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Grid */}
          <div className="relative">
            {TIME_SLOTS.map((slot, slotIndex) => (
              <div key={slot.hour} className="grid grid-cols-8 gap-px border-b border-slate-100 last:border-b-0">
                {/* Time Label */}
                <div className="bg-slate-50 p-3 text-xs text-slate-600 font-medium text-right border-r border-slate-200">
                  {slot.display}
                </div>

                {/* Day Columns */}
                {days.map((day) => {
                  const daySchedules = schedulesData[day.fullDate] || []
                  
                  return (
                    <div 
                      key={`${day.fullDate}-${slot.hour}`} 
                      className="relative bg-white hover:bg-slate-50/50 transition-colors min-h-[60px] border-r border-slate-100 last:border-r-0"
                    >
                      {daySchedules.map((schedule) => {
                        const isInThisSlot = schedule.startPosition <= slotIndex && schedule.endPosition > slotIndex
                        const isStartSlot = Math.floor(schedule.startPosition) === slotIndex
                        
                        if (!isInThisSlot || !isStartSlot) return null

                        const staffColor = getStaffColor(schedule.staff_id)
                        const height = Math.max(schedule.duration * 60, 30) // 60px per hour, minimum 30px
                        const width = schedule.totalColumns > 1 
                          ? `${(100 / schedule.totalColumns) - 1}%` 
                          : '98%'
                        const left = schedule.totalColumns > 1 
                          ? `${(schedule.column * 100) / schedule.totalColumns + 1}%` 
                          : '1%'

                        return (
                          <div
                            key={schedule.id}
                            className={`
                              absolute top-1 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer z-10
                              ${staffColor.bg} ${staffColor.text} ${staffColor.border}
                              ${hoveredSchedule === schedule.id ? 'ring-2 ring-blue-400 ring-opacity-50 shadow-lg' : ''}
                            `}
                            style={{
                              borderLeftColor: staffColor.hex,
                              height: `${height}px`,
                              width,
                              left,
                              maxHeight: `${(14 - slotIndex) * 60}px` // Don't overflow past end of day
                            }}
                            onMouseEnter={() => setHoveredSchedule(schedule.id)}
                            onMouseLeave={() => setHoveredSchedule(null)}
                            title={`${schedule.staff_name}: ${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)} (${schedule.duration.toFixed(1)}h)`}
                          >
                            <div className="p-2 h-full flex flex-col justify-between">
                              {/* Header */}
                              <div className="flex-shrink-0">
                                <div className="font-semibold text-xs leading-tight truncate">
                                  {schedule.staff_name}
                                </div>
                                <div className="text-xs opacity-80 leading-tight">
                                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                </div>
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 flex flex-col justify-center">
                                {schedule.duration >= 2 && (
                                  <div className="text-xs opacity-70 text-center font-medium">
                                    {schedule.duration.toFixed(1)}h
                                  </div>
                                )}
                                
                                {schedule.location && height > 60 && (
                                  <div className="text-xs opacity-60 truncate flex items-center justify-center mt-1">
                                    <MapPin className="h-2.5 w-2.5 mr-1" />
                                    {schedule.location}
                                  </div>
                                )}
                              </div>
                              
                              {/* Footer */}
                              {schedule.is_recurring && (
                                <div className="absolute top-1 right-1">
                                  <div className="w-4 h-4 bg-white/80 rounded-full flex items-center justify-center text-xs">
                                    🔄
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* Empty slot indicator */}
                      {daySchedules.length === 0 && slotIndex === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                          <div className="text-center">
                            <User className="h-6 w-6 mx-auto mb-1 opacity-30" />
                            <div className="text-xs">No shifts</div>
                          </div>
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

      {/* Footer with legend */}
      <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-t border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
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
          <div className="text-slate-500">
            Hover over shifts for details • Today highlighted in blue
          </div>
        </div>
      </div>
    </div>
  )
}

export default SmartScheduleView