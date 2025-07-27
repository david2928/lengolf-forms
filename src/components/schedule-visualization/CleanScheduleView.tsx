'use client'

import React, { useState, useMemo } from 'react'
import { StaffColorAssignment } from '@/lib/staff-colors'
import { Clock, MapPin, RotateCcw, User, Edit3, Trash2 } from 'lucide-react'

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

interface CleanScheduleViewProps {
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
  onEditSchedule?: (schedule: any) => void
  onDeleteSchedule?: (schedule: any) => void
}

// Time slots from 10am to 11pm (14 slots)
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

const getSchedulePosition = (startTime: string, endTime: string) => {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const businessStartMinutes = 10 * 60 // 10am
  
  const startSlot = (startMinutes - businessStartMinutes) / 60 // Hours from 10am
  const duration = (endMinutes - startMinutes) / 60 // Duration in hours
  
  return { startSlot, duration, endSlot: startSlot + duration }
}

// Simple overlap resolution - side by side
const resolveOverlaps = (schedules: ScheduleEntry[]) => {
  const processed = schedules.map(schedule => {
    const { startSlot, duration, endSlot } = getSchedulePosition(schedule.start_time, schedule.end_time)
    return {
      ...schedule,
      startSlot,
      duration,
      endSlot,
      column: 0,
      totalColumns: 1
    }
  })

  // Sort by start time
  processed.sort((a, b) => a.startSlot - b.startSlot)

  // Group overlapping schedules
  const groups: typeof processed[][] = []
  
  for (const schedule of processed) {
    let placed = false
    
    for (const group of groups) {
      const hasOverlap = group.some(existing => 
        schedule.startSlot < existing.endSlot && schedule.endSlot > existing.startSlot
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

  return processed
}

export function CleanScheduleView({
  scheduleData,
  staffAssignments,
  weekStart,
  loading = false,
  onEditSchedule,
  onDeleteSchedule
}: CleanScheduleViewProps) {
  const [hoveredSchedule, setHoveredSchedule] = useState<any>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [showActions, setShowActions] = useState<string | null>(null)

  // Generate week data
  const { days, schedulesData, uniqueStaff } = useMemo(() => {
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
    const schedulesData: Record<string, ReturnType<typeof resolveOverlaps>> = {}
    const uniqueStaffSet = new Set<number>()

    days.forEach(day => {
      const daySchedules = scheduleData.raw_schedules?.filter(
        schedule => schedule.schedule_date === day.fullDate
      ) || []
      
      schedulesData[day.fullDate] = resolveOverlaps(daySchedules)
      
      // Collect unique staff
      daySchedules.forEach(schedule => uniqueStaffSet.add(schedule.staff_id))
    })

    const uniqueStaff = Array.from(uniqueStaffSet).map(staffId => {
      const assignment = staffAssignments.find(a => a.staffId === staffId)
      const schedule = scheduleData.raw_schedules?.find(s => s.staff_id === staffId)
      return {
        id: staffId,
        name: schedule?.staff_name || 'Unknown',
        color: assignment?.color || { bg: 'bg-gray-100', text: 'text-gray-800', hex: '#6b7280' }
      }
    })

    return { days, schedulesData, uniqueStaff }
  }, [scheduleData, weekStart, staffAssignments])

  // Get staff color
  const getStaffColor = (staffId: number) => {
    const assignment = staffAssignments.find(a => a.staffId === staffId)
    return assignment?.color || { bg: 'bg-gray-100', text: 'text-gray-800', hex: '#6b7280' }
  }

  // Format time
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number)
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    const ampm = hours >= 12 ? 'pm' : 'am'
    return minutes === 0 ? `${displayHour}${ampm}` : `${displayHour}:${minutes.toString().padStart(2, '0')}${ampm}`
  }

  const handleMouseEnter = (schedule: any, event: React.MouseEvent) => {
    setHoveredSchedule(schedule)
    setMousePosition({ x: event.clientX, y: event.clientY })
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredSchedule) {
      setMousePosition({ x: event.clientX, y: event.clientY })
    }
  }

  const handleMouseLeave = () => {
    setHoveredSchedule(null)
    setShowActions(null)
  }

  const handleScheduleClick = (schedule: any) => {
    if (onEditSchedule) {
      onEditSchedule(schedule)
    }
  }

  const handleDeleteClick = (schedule: any, event: React.MouseEvent) => {
    event.stopPropagation()
    if (onDeleteSchedule) {
      onDeleteSchedule(schedule)
    }
  }

  const toggleActions = (scheduleId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setShowActions(showActions === scheduleId ? null : scheduleId)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded mb-4 w-48"></div>
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-8 bg-slate-100 rounded"></div>
                {Array.from({ length: 10 }).map((_, j) => (
                  <div key={j} className="h-8 bg-slate-50 rounded"></div>
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
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Staff Schedule</h3>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            <span>10am - 11pm</span>
          </div>
        </div>

        {/* Staff Legend */}
        <div className="flex flex-wrap gap-3">
          {uniqueStaff.map(staff => (
            <div key={staff.id} className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded border-2"
                style={{ backgroundColor: staff.color.hex, borderColor: staff.color.hex }}
              />
              <span className="text-sm font-medium text-slate-700">{staff.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto lg:overflow-x-visible" onMouseMove={handleMouseMove}>
        <div className="min-w-[800px] lg:min-w-0">
          {/* Week Header */}
          <div className="grid grid-cols-8 border-b border-slate-200">
            <div className="p-3 text-xs font-medium text-slate-600 border-r border-slate-200">Time</div>
            {days.map((day) => (
              <div key={day.fullDate} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  day.isToday 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'text-slate-700'
                }`}>
                  <span>{day.dayName}</span>
                  <span className="font-bold">{day.date}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          {TIME_SLOTS.map((slot, slotIndex) => (
            <div key={slot.hour} className="grid grid-cols-8 border-b border-slate-100 last:border-b-0">
              {/* Time Label */}
              <div className="p-3 text-xs font-medium text-slate-600 text-right border-r border-slate-200 bg-slate-50">
                {slot.display}
              </div>

              {/* Day Columns */}
              {days.map((day) => {
                const daySchedules = schedulesData[day.fullDate] || []
                
                return (
                  <div 
                    key={`${day.fullDate}-${slot.hour}`} 
                    className="relative h-12 border-r border-slate-100 last:border-r-0 bg-white hover:bg-slate-50/50 transition-colors"
                  >
                    {daySchedules.map((schedule, scheduleIndex) => {
                      // Check if this schedule should be rendered in this time slot
                      const isStartSlot = Math.floor(schedule.startSlot) === slotIndex
                      if (!isStartSlot) return null

                      const staffColor = getStaffColor(schedule.staff_id)
                      
                      // Fixed duration calculation - use precise time arithmetic
                      const startMinutes = timeToMinutes(schedule.start_time)
                      const endMinutes = timeToMinutes(schedule.end_time)
                      const preciseDuration = (endMinutes - startMinutes) / 60
                      
                      const heightSlots = preciseDuration
                      const height = heightSlots * 48 // 48px per hour (h-12 = 48px)
                      
                      const width = schedule.totalColumns > 1 
                        ? `${(100 / schedule.totalColumns) - 1}%` 
                        : '96%'
                      const left = schedule.totalColumns > 1 
                        ? `${(schedule.column * 100) / schedule.totalColumns + 2}%` 
                        : '2%'

                      return (
                        <div
                          key={`${schedule.id}-${slotIndex}-${scheduleIndex}`}
                          className="absolute top-1 rounded-md shadow-sm hover:shadow-lg transition-all cursor-pointer z-10 border-2 group"
                          style={{
                            backgroundColor: staffColor.hex,
                            borderColor: staffColor.hex,
                            height: `${height - 4}px`,
                            width,
                            left
                          }}
                          onClick={() => handleScheduleClick(schedule)}
                          onMouseEnter={(e) => handleMouseEnter(schedule, e)}
                          onMouseLeave={handleMouseLeave}
                        >
                          {/* Recurring indicator */}
                          {schedule.is_recurring && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-white/90 rounded-full flex items-center justify-center z-20">
                              <RotateCcw className="h-2.5 w-2.5 text-slate-600" />
                            </div>
                          )}
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

      {/* Beautiful Hover Tooltip */}
      {hoveredSchedule && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-4 max-w-xs">
            <div className="flex items-start space-x-3">
              <div 
                className="w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5"
                style={{ 
                  backgroundColor: getStaffColor(hoveredSchedule.staff_id).hex,
                  borderColor: getStaffColor(hoveredSchedule.staff_id).hex
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-sm">
                  {hoveredSchedule.staff_name}
                </div>
                <div className="flex items-center space-x-1 text-xs text-slate-600 mt-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatTime(hoveredSchedule.start_time)} - {formatTime(hoveredSchedule.end_time)}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="font-medium">{((timeToMinutes(hoveredSchedule.end_time) - timeToMinutes(hoveredSchedule.start_time)) / 60).toFixed(1)}h</span>
                </div>
                
                {hoveredSchedule.location && (
                  <div className="flex items-center space-x-1 text-xs text-slate-600 mt-1">
                    <MapPin className="h-3 w-3" />
                    <span>{hoveredSchedule.location}</span>
                  </div>
                )}
                
                {hoveredSchedule.is_recurring && (
                  <div className="flex items-center space-x-1 text-xs text-slate-600 mt-1">
                    <RotateCcw className="h-3 w-3" />
                    <span>Recurring schedule</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <RotateCcw className="h-3 w-3" />
              <span>Recurring</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Today</span>
            </div>
            {onEditSchedule && (
              <div className="flex items-center space-x-1">
                <Edit3 className="h-3 w-3" />
                <span>Click to edit</span>
              </div>
            )}
          </div>
          <span>Hover over shifts for details{onEditSchedule ? ' • Click to edit' : ''}</span>
        </div>
      </div>
    </div>
  )
}

export default CleanScheduleView