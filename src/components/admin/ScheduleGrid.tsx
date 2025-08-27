'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

interface Schedule {
  id: string
  staffId: string
  staffName: string
  date: string
  startTime: string
  endTime: string
  position: string
  isRecurring?: boolean
}

interface ScheduleGridProps {
  onScheduleClick?: (schedule: Schedule) => void
  onCreateSchedule?: (date: string, timeSlot: string) => void
}

export function ScheduleGrid({ onScheduleClick, onCreateSchedule }: ScheduleGridProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ]

  const getWeekStart = useCallback((date: Date) => {
    const start = new Date(date)
    const day = start.getDay()
    const diff = start.getDate() - day
    return new Date(start.setDate(diff))
  }, [])

  const getWeekEnd = useCallback((date: Date) => {
    const end = getWeekStart(date)
    return new Date(end.setDate(end.getDate() + 6))
  }, [getWeekStart])

  const fetchSchedules = useCallback(async () => {
    try {
      const startDate = getWeekStart(currentWeek)
      const endDate = getWeekEnd(currentWeek)
      
      const response = await fetch(
        `/api/admin/staff-scheduling/schedules?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
    } finally {
      setLoading(false)
    }
  }, [currentWeek, getWeekStart, getWeekEnd])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const getWeekDays = () => {
    const start = getWeekStart(currentWeek)
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentWeek(newWeek)
  }

  const getSchedulesForSlot = (date: Date, timeSlot: string) => {
    const dateStr = date.toISOString().split('T')[0]
    return schedules.filter(schedule => 
      schedule.date === dateStr && schedule.startTime.startsWith(timeSlot.slice(0, 2))
    )
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  const weekDays = getWeekDays()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Schedule Grid</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header Row */}
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div className="p-2 text-sm font-medium text-gray-600">Time</div>
              {weekDays.map((day, index) => (
                <div key={index} className="p-2 text-sm font-medium text-center">
                  {formatDate(day)}
                </div>
              ))}
            </div>

            {/* Time Slots */}
            <div className="space-y-1">
              {timeSlots.map((timeSlot) => (
                <div key={timeSlot} className="grid grid-cols-8 gap-1">
                  <div className="p-2 text-sm text-gray-600 border-r">
                    {timeSlot}
                  </div>
                  {weekDays.map((day, dayIndex) => {
                    const daySchedules = getSchedulesForSlot(day, timeSlot)
                    return (
                      <div
                        key={dayIndex}
                        className="min-h-[60px] p-1 border border-gray-200 rounded relative hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          if (daySchedules.length === 0 && onCreateSchedule) {
                            onCreateSchedule(day.toISOString().split('T')[0], timeSlot)
                          }
                        }}
                      >
                        {daySchedules.length === 0 ? (
                          <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity">
                            <Plus className="h-4 w-4 text-gray-400" />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {daySchedules.map((schedule) => (
                              <div
                                key={schedule.id}
                                className="bg-blue-100 text-blue-800 p-1 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onScheduleClick?.(schedule)
                                }}
                              >
                                <div className="font-medium truncate">
                                  {schedule.staffName}
                                </div>
                                <div className="text-xs opacity-75">
                                  {schedule.startTime}-{schedule.endTime}
                                </div>
                                {schedule.isRecurring && (
                                  <Badge variant="secondary" className="text-xs">
                                    Recurring
                                  </Badge>
                                )}
                              </div>
                            ))}
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
      </CardContent>
    </Card>
  )
}