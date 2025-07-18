'use client'

import { useState, useEffect } from 'react'
import { RouteProtection } from '@/components/auth/RouteProtection'
import { SessionManager } from '@/components/auth/SessionManager'
import { Calendar, Users, Clock, AlertTriangle, Plus, ChevronLeft, ChevronRight, Edit, Trash2, MoreHorizontal, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScheduleForm } from '@/components/admin/ScheduleForm'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

interface ScheduleOverview {
  week_period: {
    start_date: string
    end_date: string
  }
  kpis: {
    total_staff: number
    scheduled_shifts: number
    staff_scheduled: number
    coverage_percentage: number
    conflicts_count: number
  }
  schedule_grid: { [date: string]: any[] }
  conflicts: any[]
  raw_schedules: any[]
}

function KPICard({ title, value, subtitle, icon, trend, className = '' }: KPICardProps) {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-600">{title}</h3>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>
        {trend && (
          <div className={`text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 
            'text-slate-500'
          }`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
          </div>
        )}
      </div>
    </div>
  )
}

function WeeklyCalendarGrid({ 
  scheduleGrid, 
  weekStart, 
  onEditSchedule, 
  onDeleteSchedule 
}: { 
  scheduleGrid: { [date: string]: any[] }, 
  weekStart: string,
  onEditSchedule: (schedule: any) => void,
  onDeleteSchedule: (schedule: any) => void
}) {
  const startDate = new Date(weekStart)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())
  
  const getDaySchedules = (dayOffset: number) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + dayOffset)
    const dateStr = date.toISOString().split('T')[0]
    return scheduleGrid[dateStr] || []
  }

  const formatDate = (dayOffset: number) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + dayOffset)
    return date.getDate()
  }

  const toggleDayExpansion = (dayIndex: number) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dayIndex)) {
      newExpanded.delete(dayIndex)
    } else {
      newExpanded.add(dayIndex)
    }
    setExpandedDays(newExpanded)
  }

  const getShiftColor = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0])
    if (hour < 12) {
      return 'bg-cyan-50 border-cyan-200 text-cyan-900' // Morning - cyan
    } else if (hour < 17) {
      return 'bg-amber-50 border-amber-200 text-amber-900' // Afternoon - amber  
    } else {
      return 'bg-pink-50 border-pink-200 text-pink-900' // Evening - pink
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Weekly Schedule Overview</h3>
      
      <div className="grid grid-cols-7 gap-2">
        {/* Header row */}
        {days.map((day, index) => (
          <div key={day} className="text-center p-3 border-b border-slate-200">
            <div className="text-sm font-medium text-slate-600">{day}</div>
            <div className="text-lg font-bold text-slate-900">{formatDate(index)}</div>
          </div>
        ))}
        
        {/* Schedule rows */}
        {days.map((_, dayIndex) => {
          const daySchedules = getDaySchedules(dayIndex)
          const isExpanded = expandedDays.has(dayIndex)
          const visibleSchedules = isExpanded ? daySchedules : daySchedules.slice(0, 3)
          
          return (
            <div key={dayIndex} className="min-h-[120px] p-2 border border-slate-100 rounded">
              <div className="space-y-1">
                {visibleSchedules.map((schedule: any, scheduleIndex: number) => (
                  <div
                    key={scheduleIndex}
                    className={`text-xs p-2 rounded group hover:opacity-80 transition-colors ${getShiftColor(schedule.start_time || '09:00')}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {schedule.start_time?.substring(0, 5)} - {schedule.end_time?.substring(0, 5)}
                        </div>
                        <div className="truncate">
                          {schedule.staff_name}
                        </div>
                      </div>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditSchedule(schedule)}
                          className="p-1 hover:bg-black/10 rounded"
                          title="Edit schedule"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onDeleteSchedule(schedule)}
                          className="p-1 hover:bg-red-200 rounded text-red-600"
                          title="Delete schedule"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {daySchedules.length > 3 && (
                  <button
                    onClick={() => toggleDayExpansion(dayIndex)}
                    className="w-full text-xs text-slate-500 hover:text-slate-700 text-center py-1 hover:bg-slate-50 rounded transition-colors"
                  >
                    {isExpanded 
                      ? 'Show less' 
                      : `+${daySchedules.length - 3} more`
                    }
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ConflictsPanel({ conflicts }: { conflicts: any[] }) {
  if (conflicts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-slate-900">Schedule Conflicts</h3>
        </div>
        <div className="text-center py-8">
          <div className="text-green-600 mb-2">✓</div>
          <p className="text-slate-600">No scheduling conflicts detected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <h3 className="text-lg font-semibold text-slate-900">Schedule Conflicts</h3>
        <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
          {conflicts.length}
        </span>
      </div>
      
      <div className="space-y-3">
        {conflicts.map((conflict: any, index: number) => (
          <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-red-900">{conflict.staff_name}</h4>
                <p className="text-sm text-red-700">{conflict.date}</p>
                <div className="mt-2 space-y-1">
                  {conflict.conflicting_schedules?.map((schedule: any, schedIndex: number) => (
                    <div key={schedIndex} className="text-xs text-red-600">
                      {schedule.time} - {schedule.location}
                    </div>
                  ))}
                </div>
              </div>
              <Button size="sm" variant="outline" className="text-red-600 border-red-300">
                Resolve
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminStaffSchedulingDashboard() {
  const [overview, setOverview] = useState<ScheduleOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(() => {
    // Get current Monday
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(today.setDate(diff)).toISOString().split('T')[0]
  })

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<any>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [scheduleToDelete, setScheduleToDelete] = useState<any>(null)
  const [formLoading, setFormLoading] = useState(false)
  
  // Quick actions menu
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)

  const fetchOverview = async (weekStart: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/staff-scheduling/overview?week_start=${weekStart}`)
      const data = await response.json()
      
      if (data.success) {
        setOverview(data.data)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch overview')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview(weekStart)
  }, [weekStart])

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentDate = new Date(weekStart)
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    setWeekStart(newDate.toISOString().split('T')[0])
  }

  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const getCurrentWeek = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust to get Monday
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  // Form handlers
  const handleAddSchedule = () => {
    setEditingSchedule(null)
    setIsFormOpen(true)
  }

  const handleEditSchedule = (schedule: any) => {
    setEditingSchedule(schedule)
    setIsFormOpen(true)
  }

  const handleDeleteSchedule = (schedule: any) => {
    setScheduleToDelete(schedule)
    setIsDeleteDialogOpen(true)
  }

  const handleFormSubmit = async (scheduleData: any) => {
    setFormLoading(true)
    try {
      const url = editingSchedule 
        ? `/api/admin/staff-scheduling/schedules/${editingSchedule.schedule_id}`
        : '/api/admin/staff-scheduling/schedules'
      
      const method = editingSchedule ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleData)
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save schedule')
      }

      // Refresh the overview data
      await fetchOverview(weekStart)
      setIsFormOpen(false)
      setEditingSchedule(null)
    } catch (error: any) {
      throw error // Re-throw to let the form handle the error display
    } finally {
      setFormLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return
    
    setFormLoading(true)
    try {
      const response = await fetch(`/api/admin/staff-scheduling/schedules/${scheduleToDelete.schedule_id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete schedule')
      }

      // Refresh the overview data
      await fetchOverview(weekStart)
      setIsDeleteDialogOpen(false)
      setScheduleToDelete(null)
    } catch (error: any) {
      setError(error.message || 'Failed to delete schedule')
    } finally {
      setFormLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading schedule overview...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <Button onClick={() => fetchOverview(weekStart)} className="w-full">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">No schedule data available</p>
        </div>
      </div>
    )
  }

  return (
    <RouteProtection requireAdmin={true} redirectTo="/staff-schedule">
      <SessionManager>
        <div className="min-h-screen bg-slate-50">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-4 py-4 safe-area-left safe-area-right">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Staff Scheduling</h1>
                  <p className="text-slate-600 text-sm sm:text-base mt-1">Manage staff schedules and monitor coverage</p>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Button variant="outline" size="sm" onClick={handleAddSchedule} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Schedule
                  </Button>
                  <DropdownMenu open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <MoreHorizontal className="h-4 w-4" />
                        Quick Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={handleAddSchedule}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Recurring Schedule
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setWeekStart(getCurrentWeek())}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Go to Current Week
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Export Schedule
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-slate-600" />
            <span className="font-medium text-slate-900">
              {formatWeekRange(overview.week_period.start_date, overview.week_period.end_date)}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(getCurrentWeek())}>
          Today
        </Button>
      </div>

      {/* Staff Weekly Hours */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Weekly Staff Hours</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {overview.raw_schedules && Object.entries(
            overview.raw_schedules.reduce((acc: any, schedule: any) => {
              if (!acc[schedule.staff_name]) {
                acc[schedule.staff_name] = 0
              }
              // Calculate hours for this shift
              const startTime = new Date(`2000-01-01T${schedule.start_time}`)
              const endTime = new Date(`2000-01-01T${schedule.end_time}`)
              const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
              acc[schedule.staff_name] += hours
              return acc
            }, {})
          ).map(([staffName, hours]: [string, any]) => {
            const isUnderScheduled = hours < 45
            const isOverScheduled = hours > 48
            const isOptimal = hours >= 45 && hours <= 48
            
            return (
              <div
                key={staffName}
                className={`p-4 rounded-lg border-2 ${
                  isOptimal 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`font-medium ${
                      isOptimal ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {staffName}
                    </h4>
                    <p className={`text-2xl font-bold ${
                      isOptimal ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {hours.toFixed(1)}h
                    </p>
                    <p className={`text-sm ${
                      isOptimal ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isUnderScheduled && 'Under-scheduled'}
                      {isOverScheduled && 'Over-scheduled'}
                      {isOptimal && 'Optimal hours'}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${
                    isOptimal ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <Clock className={`h-5 w-5 ${
                      isOptimal ? 'text-green-600' : 'text-red-600'
                    }`} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Weekly Calendar Grid */}
      <WeeklyCalendarGrid 
        scheduleGrid={overview.schedule_grid} 
        weekStart={overview.week_period.start_date}
        onEditSchedule={handleEditSchedule}
        onDeleteSchedule={handleDeleteSchedule}
      />
          </div>

          {/* Schedule Form Modal */}
          <ScheduleForm
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false)
              setEditingSchedule(null)
            }}
            onSubmit={handleFormSubmit}
            schedule={editingSchedule}
            title={editingSchedule ? 'Edit Schedule' : 'Add Schedule'}
            allowBulk={!editingSchedule}
          />

          {/* Delete Confirmation Dialog */}
          <ConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => {
              setIsDeleteDialogOpen(false)
              setScheduleToDelete(null)
            }}
            onConfirm={handleConfirmDelete}
            title="Delete Schedule"
            message={`Are you sure you want to delete this schedule for ${scheduleToDelete?.staff_name}? This action cannot be undone.`}
            confirmText="Delete"
            variant="danger"
            loading={formLoading}
          />
        </div>
      </SessionManager>
    </RouteProtection>
  )
}