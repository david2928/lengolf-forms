'use client'

import React, { useState, useMemo } from 'react'
import { StaffColorAssignment } from '@/lib/staff-colors'
import { ChevronDown, Clock, User, MapPin } from 'lucide-react'

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

interface ModernScheduleGridProps {
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

// Time slot configuration
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 10 // Start from 10am
  return {
    hour,
    display: hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`,
    time24: `${hour.toString().padStart(2, '0')}:00`
  }
})

// Calculate time slot position (more precise)
const getTimePosition = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes
  const startMinutes = 10 * 60 // 10am in minutes
  
  return (totalMinutes - startMinutes) / 60 // Convert to hours from 10am
}

// Calculate duration in hours (more precise)
const getDuration = (startTime: string, endTime: string) => {
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  
  const startTotal = startHours + startMinutes / 60
  const endTotal = endHours + endMinutes / 60
  
  return endTotal - startTotal
}

// Modern overlap resolution with smart stacking
const resolveOverlaps = (schedules: ScheduleEntry[]) => {
  const result = schedules.map(schedule => ({
    ...schedule,
    startPos: getTimePosition(schedule.start_time),
    endPos: getTimePosition(schedule.end_time),
    duration: getDuration(schedule.start_time, schedule.end_time),
    column: 0,
    totalColumns: 1
  }))

  // Sort by start time
  result.sort((a, b) => a.startPos - b.startPos)

  // Group overlapping schedules
  const groups: typeof result[][] = []
  
  for (const schedule of result) {
    let placed = false
    
    for (const group of groups) {
      // Check if this schedule overlaps with any in this group
      const hasOverlap = group.some(existing => 
        schedule.startPos < existing.endPos && schedule.endPos > existing.startPos
      )
      
      if (hasOverlap) {
        group.push(schedule)
        placed = true
        break
      }
    }
    
    if (!placed) {
      groups.push([schedule])
    }
  }

  // Assign columns within each group
  groups.forEach(group => {
    group.forEach((schedule, index) => {
      schedule.column = index
      schedule.totalColumns = group.length
    })
  })

  return result
}

export function ModernScheduleGrid({
  scheduleData,
  staffAssignments,
  weekStart,
  loading = false
}: ModernScheduleGridProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Schedule Overview</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded mb-6"></div>
          <div className="grid grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-8 bg-slate-100 rounded"></div>
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-16 bg-slate-50 rounded"></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Generate days of the week
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

  // Get schedules for a specific day with overlap resolution
  const getSchedulesForDay = (dateStr: string) => {
    const daySchedules = scheduleData.raw_schedules?.filter(
      schedule => schedule.schedule_date === dateStr
    ) || []
    
    return resolveOverlaps(daySchedules)
  }

  // Toggle day expansion for mobile
  const toggleDay = (dayDate: string) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dayDate)) {
      newExpanded.delete(dayDate)
    } else {
      newExpanded.add(dayDate)
    }
    setExpandedDays(newExpanded)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Schedule Overview</h3>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            <span>10am - 11pm</span>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden">
        {days.map((day) => {
          const daySchedules = getSchedulesForDay(day.fullDate)
          const isExpanded = expandedDays.has(day.fullDate)
          
          return (
            <div key={day.fullDate} className="border-b border-slate-100 last:border-b-0">
              {/* Day Header */}
              <button
                onClick={() => toggleDay(day.fullDate)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${day.isToday ? 'bg-blue-500' : 'bg-slate-300'}`} />
                  <div>
                    <div className="font-medium text-slate-900">{day.dayName}</div>
                    <div className="text-sm text-slate-500">{day.date}</div>
                  </div>
                  <div className="text-sm text-slate-600">
                    {daySchedules.length} schedule{daySchedules.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* Day Content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {daySchedules.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No schedules</p>
                    </div>
                  ) : (
                    daySchedules.map((schedule) => {
                      const staffColor = getStaffColor(schedule.staff_id)
                      return (
                        <div
                          key={schedule.id}
                          className={`p-3 rounded-lg border-l-4 ${staffColor.bg} ${staffColor.text} shadow-sm`}
                          style={{ borderLeftColor: staffColor.hex }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{schedule.staff_name}</div>
                              <div className="text-xs opacity-80 flex items-center mt-1">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                <span className="ml-2">({schedule.duration.toFixed(1)}h)</span>
                              </div>
                              {schedule.location && (
                                <div className="text-xs opacity-70 flex items-center mt-1">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {schedule.location}
                                </div>
                              )}
                            </div>
                            {schedule.is_recurring && (
                              <div className="text-xs bg-white/50 px-2 py-1 rounded">🔄</div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop Grid View */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="min-w-[800px] p-6">
          {/* Week Header */}
          <div className="grid grid-cols-8 gap-2 mb-4">
            <div className="text-xs font-medium text-slate-600 p-2">Time</div>
            {days.map((day) => (
              <div key={day.fullDate} className="text-center p-2">
                <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${
                  day.isToday ? 'bg-blue-100 text-blue-900' : 'text-slate-600'
                }`}>
                  <span className="text-xs font-medium">{day.dayName}</span>
                  <span className="text-sm font-bold">{day.date}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="relative">
            {TIME_SLOTS.map((slot, slotIndex) => (
              <div key={slot.hour} className="grid grid-cols-8 gap-2 mb-1">
                {/* Time Label */}
                <div className="text-xs text-slate-500 p-2 text-right font-medium">
                  {slot.display}
                </div>

                {/* Day Columns */}
                {days.map((day) => {
                  const daySchedules = getSchedulesForDay(day.fullDate)
                  const schedulesAtThisTime = daySchedules.filter(
                    schedule => schedule.startPos <= slotIndex && schedule.endPos > slotIndex
                  )

                  return (
                    <div 
                      key={`${day.fullDate}-${slot.hour}`} 
                      className="relative min-h-[50px] border border-slate-100 rounded-md bg-slate-50/30 p-1"
                    >
                      {schedulesAtThisTime.map((schedule) => {
                        const staffColor = getStaffColor(schedule.staff_id)
                        const isStartSlot = Math.floor(schedule.startPos) === slotIndex
                        
                        // Only render the schedule block at its start time
                        if (!isStartSlot) return null

                        // Calculate visual height and width for overlaps
                        const heightInSlots = Math.max(schedule.duration, 0.5)
                        const slotHeight = 51 // Height of each time slot including border
                        const height = Math.round(heightInSlots * slotHeight - 2) // More precise height calculation
                        
                        // Smarter overlap handling
                        const width = schedule.totalColumns > 1 
                          ? `calc(${100 / schedule.totalColumns}% - 2px)` 
                          : 'calc(100% - 2px)'
                        const left = schedule.totalColumns > 1 
                          ? `calc(${(schedule.column * 100) / schedule.totalColumns}% + 1px)` 
                          : '1px'

                        return (
                          <div
                            key={schedule.id}
                            className={`
                              absolute rounded-md border-l-4 ${staffColor.bg} ${staffColor.text} 
                              shadow-sm hover:shadow-md transition-all cursor-pointer z-10
                              overflow-hidden
                            `}
                            style={{
                              borderLeftColor: staffColor.hex,
                              height: `${height}px`,
                              width,
                              left,
                              top: '1px'
                            }}
                            title={`${schedule.staff_name}: ${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)} (${schedule.duration.toFixed(1)}h)`}
                          >
                            <div className="p-2 h-full flex flex-col">
                              {/* Staff name */}
                              <div className="font-semibold text-xs leading-tight truncate">
                                {schedule.staff_name}
                              </div>
                              
                              {/* Time range */}
                              <div className="text-xs opacity-80 leading-tight mt-0.5 flex-shrink-0">
                                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                              </div>
                              
                              {/* Duration for longer shifts */}
                              {schedule.duration > 2 && height > 60 && (
                                <div className="text-xs opacity-70 leading-tight">
                                  {schedule.duration.toFixed(1)}h
                                </div>
                              )}
                              
                              {/* Location if space permits */}
                              {schedule.location && height > 80 && (
                                <div className="text-xs opacity-60 truncate leading-tight mt-auto">
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
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-6 bg-slate-50 border-t border-slate-200">
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
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3" />
            <span>Business hours: 10am - 11pm</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModernScheduleGrid