/**
 * PROTECTED FILE - COMPACT FORMATTING ENFORCED
 * This file is protected by comprehensive-formatting-protection.js
 * Any changes to compact formatting will be automatically reverted
 * Last protected: 2025-07-26T06:35:13.017Z
 */

'use client'

import { useState, useEffect } from 'react'
import { RouteProtection } from '@/components/auth/RouteProtection'
import { SessionManager } from '@/components/auth/SessionManager'
import { Calendar, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LazyScheduleForm, LazyConfirmDialog, useAdminComponentPreloader } from '@/components/admin/LazyAdminComponents'
import { RecurringDeleteModal } from '@/components/admin/RecurringDeleteModal'

import { performanceMonitor } from '@/lib/performance-monitor'
import { generateStaffColorAssignments, getStaffColor, getStaffName, OFF_DAY_COLOR, type StaffColorAssignment } from '@/lib/staff-colors'
import { calculateDayCoverageGaps, formatCoverageGap, type DayCoverage } from '@/lib/coverage-analysis'
import { ScheduleVisualizationContainer } from '@/components/schedule-visualization'
import { getOffStaffForDay, debugStaffStatus } from '@/lib/staff-status-utils'



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



function WeeklyCalendarGrid({ 
  scheduleGrid, 
  weekStart, 
  onEditSchedule, 
  onDeleteSchedule,
  staffAssignments,
  allStaff
}: { 
  scheduleGrid: { [date: string]: any[] }, 
  weekStart: string,
  onEditSchedule: (schedule: any) => void,
  onDeleteSchedule: (schedule: any) => void,
  staffAssignments: StaffColorAssignment[],
  allStaff: Array<{ id: number; staff_name: string }>
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

  // Get all staff scheduled for a specific day
  const getScheduledStaffIds = (dayOffset: number): Set<number> => {
    const daySchedules = getDaySchedules(dayOffset)
    return new Set(daySchedules.map(schedule => schedule.staff_id))
  }

  // Get staff members who are OFF for a specific day
  // Only show active staff members who don't have schedules
  const getOffStaff = (dayOffset: number) => {
    const scheduledStaffIds = getScheduledStaffIds(dayOffset)
    
    // Convert raw schedules to the format expected by the utility
    const scheduleStaff = overview?.raw_schedules?.map((schedule: any) => ({
      staff_id: schedule.staff_id,
      staff_name: schedule.staff_name
    })) || []
    
    // Use the utility function to get confirmed active staff who are OFF
    return getOffStaffForDay(allStaff, scheduledStaffIds, scheduleStaff)
  }

  const getStaffScheduleColor = (staffId: number) => {
    const staffColor = getStaffColor(staffId, staffAssignments)
    return `${staffColor.bg} ${staffColor.border} ${staffColor.text}`
  }

  // Format time for better display - only show minutes when not at top of hour
  const formatTime = (timeString: string) => {
    if (!timeString) return ''
    // Handle both HH:MM:SS and HH:MM formats
    const timeParts = timeString.split(':')
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0])
      const minutes = timeParts[1]
      const ampm = hours >= 12 ? 'pm' : 'am'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      
      // Only show minutes if not at the top of the hour
      if (minutes === '00') {
        return `${displayHours}${ampm}`
      } else {
        return `${displayHours}:${minutes}${ampm}`
      }
    }
    return timeString
  }

  // Calculate coverage gaps for each day
  const getDayCoverage = (dayOffset: number): DayCoverage => {
    const daySchedules = getDaySchedules(dayOffset)
    return calculateDayCoverageGaps(daySchedules)
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
      <h3 className="text-base font-semibold text-slate-900 mb-3">Weekly Schedule Overview</h3>
      
      {/* COMPACT RESPONSIVE GRID - smaller gaps for space efficiency - DO NOT CHANGE */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2 md:gap-3">
        {/* COMPACT HEADER ROW - reduced padding - DO NOT INCREASE */}
        <div className="hidden md:contents">
          {days.map((day, index) => (
            <div key={day} className="text-center p-2 border-b border-slate-200">
              <div className="text-sm font-medium text-slate-600">{day}</div>
              <div className="text-lg font-bold text-slate-900">{formatDate(index)}</div>
            </div>
          ))}
        </div>
        
        {/* Schedule rows */}
        {days.map((day, dayIndex) => {
          const daySchedules = getDaySchedules(dayIndex)
          const offStaff = getOffStaff(dayIndex)
          const dayCoverage = getDayCoverage(dayIndex)
          const isExpanded = expandedDays.has(dayIndex)
          
          // Combine scheduled shifts, coverage gaps, and OFF indicators (gaps before OFF)
          const allItems = [
            ...daySchedules.map(schedule => ({ type: 'schedule', data: schedule })),
            ...dayCoverage.coverageGaps.map(gap => ({ type: 'gap', data: gap })),
            ...offStaff.map(staff => ({ type: 'off', data: staff }))
          ]
          
          const visibleItems = isExpanded ? allItems : allItems.slice(0, 4) // Show one more item to accommodate gaps
          
          return (
            <div key={dayIndex} className="min-h-[80px] md:min-h-[100px] p-1.5 md:p-2 border border-slate-100 rounded-lg">
              {/* Mobile day header */}
              <div className="md:hidden mb-2 pb-1 border-b border-slate-200">
                <div className="text-xs font-medium text-slate-600">{day}</div>
                <div className="text-sm font-bold text-slate-900">{formatDate(dayIndex)}</div>
              </div>
              
              {/* Coverage status indicator */}
              <div className="mb-1.5 text-xs">
                <div className="flex items-center space-x-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    dayCoverage.coveragePercentage >= 90 
                      ? 'bg-green-500' 
                      : dayCoverage.coveragePercentage >= 70 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                  }`}></div>
                  <span className={`font-medium ${
                    dayCoverage.coveragePercentage >= 90 
                      ? 'text-green-600' 
                      : dayCoverage.coveragePercentage >= 70 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                  }`}>
                    {dayCoverage.coveragePercentage}%
                  </span>
                </div>
              </div>
              
              <div className="space-y-1">
                {visibleItems.map((item: any, itemIndex: number) => {
                  if (item.type === 'schedule') {
                    const schedule = item.data
                    // Debug: Check if is_recurring is present
                    if (schedule.is_recurring) {
                      console.log('Found recurring schedule for:', schedule.staff_name)
                    }
                    return (
                      <button
                        key={`schedule-${itemIndex}`}
                        onClick={() => onEditSchedule(schedule)}
                        className={`w-full text-left text-xs p-1 rounded-md hover:opacity-80 transition-colors border relative cursor-pointer ${getStaffScheduleColor(schedule.staff_id)}`}
                      >
                        {/* Recurring indicator - positioned in top right corner */}
                        {schedule.is_recurring && (
                          <div className="absolute top-0.5 right-0.5 z-10">
                            <div className="w-3 h-3 rounded-full bg-white border border-slate-400 flex items-center justify-center shadow-sm">
                              <svg className="w-2 h-2 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </div>
                          </div>
                        )}

                        
                        {/* Layout similar to coverage gap box */}
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 min-w-0">
                            {/* Staff name - made more prominent */}
                            <div className="font-semibold text-xs">
                              {schedule.staff_name}
                            </div>
                            {/* Time - made smaller and less prominent */}
                            <div className="text-xs opacity-90">
                              {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                            </div>
                            {schedule.location && (
                              <div className="truncate text-xs text-gray-600 opacity-75">
                                {schedule.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  } else if (item.type === 'off') {
                    // OFF day indicator
                    const staff = item.data
                    const staffColor = getStaffColor(staff.id, staffAssignments)
                    return (
                      <div
                        key={`off-${itemIndex}`}
                        className={`text-xs p-1 rounded-md border ${OFF_DAY_COLOR.bg} ${OFF_DAY_COLOR.border}`}
                      >
                        <div className="flex items-center">
                          <span className={`font-semibold ${staffColor.text}`}>
                            {getStaffName(staff.id, staffAssignments)}
                          </span>
                          <span className={`ml-1 ${OFF_DAY_COLOR.text}`}>
                            OFF
                          </span>
                        </div>
                      </div>
                    )
                  } else if (item.type === 'gap') {
                    // Coverage gap indicator
                    const gap = item.data
                    return (
                      <div
                        key={`gap-${itemIndex}`}
                        className="text-xs p-1 rounded-md border coverage-gap-indicator"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs">
                              Coverage Gap
                            </div>
                            <div className="text-xs opacity-90">
                              {formatCoverageGap(gap)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                })}
                {allItems.length > 4 && (
                  <button
                    onClick={() => toggleDayExpansion(dayIndex)}
                    className="w-full text-xs text-slate-500 hover:text-slate-700 text-center py-2 hover:bg-slate-50 rounded-md transition-colors touch-manipulation min-h-[32px]"
                  >
                    {isExpanded 
                      ? 'Show less' 
                      : `+${allItems.length - 4} more`
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

  // Staff data and color assignments
  const [allStaff, setAllStaff] = useState<Array<{ id: number; staff_name: string }>>([])
  const [staffAssignments, setStaffAssignments] = useState<StaffColorAssignment[]>([])

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<any>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isRecurringDeleteModalOpen, setIsRecurringDeleteModalOpen] = useState(false)
  const [scheduleToDelete, setScheduleToDelete] = useState<any>(null)
  const [formLoading, setFormLoading] = useState(false)
  
  // Component preloader for better UX
  const { preloadOnHover } = useAdminComponentPreloader()

  const fetchStaffData = async () => {
    try {
      const response = await fetch('/api/staff-schedule/staff')
      const data = await response.json()
      
      if (data.success) {
        const staff = data.data.staff.map((s: any) => ({
          id: s.id,
          staff_name: s.name
        }))
        setAllStaff(staff)
        
        // Generate color assignments
        const assignments = generateStaffColorAssignments(staff)
        setStaffAssignments(assignments)
      }
    } catch (err: any) {
      console.error('Failed to fetch staff data:', err)
    }
  }

  const fetchOverview = async (weekStart: string) => {
    return performanceMonitor.measureAsync('admin.fetchOverview', async () => {
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
    }, { weekStart })
  }

  useEffect(() => {
    fetchStaffData()
  }, [])

  useEffect(() => {
    fetchOverview(weekStart)
  }, [weekStart])

  // Debug staff status in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && overview && allStaff.length > 0) {
      // Enable debug by adding ?debug_staff=true to the URL
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('debug_staff') === 'true') {
        const scheduleStaff = overview.raw_schedules?.map((schedule: any) => ({
          staff_id: schedule.staff_id,
          staff_name: schedule.staff_name
        })) || []
        
        debugStaffStatus(allStaff, scheduleStaff, 'david')
      }
    }
  }, [overview, allStaff])

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
    
    // Check if this is a recurring schedule
    if (schedule.is_recurring && schedule.recurring_group_id) {
      setIsRecurringDeleteModalOpen(true)
    } else {
      setIsDeleteDialogOpen(true)
    }
  }

  const handleFormSubmit = async (scheduleData: any, editType?: 'single' | 'series') => {
    setFormLoading(true)
    try {
      // Use the correct ID field for editing
      const scheduleId = editingSchedule?.schedule_id || editingSchedule?.id
      
      const url = editingSchedule 
        ? `/api/admin/staff-scheduling/schedules/${scheduleId}`
        : '/api/admin/staff-scheduling/schedules'
      
      const method = editingSchedule ? 'PUT' : 'POST'
      
      // Include editType for recurring schedule edits
      const requestBody = editingSchedule && editType 
        ? { ...scheduleData, editType }
        : scheduleData
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (!data.success) {
        const errorMessage = typeof data.error === 'string' 
          ? data.error 
          : data.error?.message || JSON.stringify(data.error) || 'Failed to save schedule'
        throw new Error(errorMessage)
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

  const handleConfirmDelete = async (deleteType?: 'single' | 'series') => {
    if (!scheduleToDelete) return
    
    setFormLoading(true)
    try {
      // Use the correct ID field - the database function returns 'schedule_id' which is the actual ID
      const scheduleId = scheduleToDelete.schedule_id || scheduleToDelete.id
      
      if (!scheduleId) {
        throw new Error('Schedule ID not found')
      }
      
      const response = await fetch(`/api/admin/staff-scheduling/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleteType: deleteType || 'single' })
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete schedule')
      }

      // Refresh the overview data
      await fetchOverview(weekStart)
      setIsDeleteDialogOpen(false)
      setIsRecurringDeleteModalOpen(false)
      setScheduleToDelete(null)
    } catch (error: any) {
      setError(error.message || 'Failed to delete schedule')
    } finally {
      setFormLoading(false)
    }
  }

  const handleRecurringDeleteSingle = async () => {
    await handleConfirmDelete('single')
  }

  const handleRecurringDeleteSeries = async () => {
    await handleConfirmDelete('series')
  }

  if (loading) {
    console.log('Admin page: Loading state - showing loading spinner')
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
    console.log('Admin page: Error state -', error)
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
    console.log('No overview data available')
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">No schedule data available</p>
        </div>
      </div>
    )
  }

  console.log('Admin page rendering with overview:', overview)

  return (
    <RouteProtection requireAdmin={true} redirectTo="/staff-schedule">
      <SessionManager>
        <div className="min-h-screen bg-slate-50">
          {/* Header with centered navigation */}
          <div className="bg-white border-b border-slate-200 px-4 py-4 safe-area-left safe-area-right">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex flex-col space-y-4">
                {/* Title and subtitle with centered date navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-8">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Staff Scheduling</h1>
                      <p className="text-slate-600 text-sm sm:text-base mt-1">Manage staff schedules and monitor coverage</p>
                    </div>
                    
                    {/* Centered date navigation on same level as subtitle */}
                    <div className="flex items-center justify-center space-x-4 mt-2 sm:mt-0">
                      <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')} className="touch-manipulation">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-slate-600" />
                        <span className="font-medium text-slate-900 text-sm sm:text-base">
                          {formatWeekRange(overview.week_period.start_date, overview.week_period.end_date)}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigateWeek('next')} className="touch-manipulation">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setWeekStart(getCurrentWeek())} className="touch-manipulation">
                        Today
                      </Button>
                    </div>
                  </div>
                  
                  {/* Add Schedule button */}
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddSchedule} 
                      className="flex items-center gap-2 touch-manipulation"
                      {...preloadOnHover('form')}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add Schedule</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                    

                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* Staff Weekly Hours - COMPACT LAYOUT - DO NOT REVERT TO LARGER SIZES */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
        <h3 className="text-base font-semibold text-slate-900 mb-3">Weekly Staff Hours</h3>
        {/* COMPACT GRID: 6 columns on large screens for space efficiency - DO NOT CHANGE */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
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
                className={`p-2 rounded-md border text-center ${
                  isOptimal 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                {/* COMPACT LAYOUT: Center-aligned with small text - DO NOT MAKE LARGER */}
                <div className="text-center">
                  <h4 className={`text-xs font-medium truncate ${
                    isOptimal ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {staffName}
                  </h4>
                  <p className={`text-sm font-bold ${
                    isOptimal ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {hours.toFixed(1)}h
                  </p>
                  {/* SHORTENED STATUS TEXT - DO NOT EXPAND TO FULL WORDS */}
                  <p className={`text-xs ${
                    isOptimal ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isUnderScheduled && 'Under'}
                    {isOverScheduled && 'Over'}
                    {isOptimal && 'Good'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Staff Color Legend section has been removed as requested */}

      {/* Weekly Calendar Grid */}
      <WeeklyCalendarGrid 
        scheduleGrid={overview.schedule_grid} 
        weekStart={overview.week_period.start_date}
        onEditSchedule={handleEditSchedule}
        onDeleteSchedule={handleDeleteSchedule}
        staffAssignments={staffAssignments}
        allStaff={allStaff}
      />

      {/* Schedule Visualization */}
      <ScheduleVisualizationContainer
        scheduleData={overview}
        staffAssignments={staffAssignments}
        weekStart={overview.week_period.start_date}
        loading={loading}
      />
          </div>

          {/* Schedule Form Modal */}
          <LazyScheduleForm
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false)
              setEditingSchedule(null)
            }}
            onSubmit={handleFormSubmit}
            schedule={editingSchedule}
            title={editingSchedule ? 'Edit Schedule' : 'Add Schedule'}
          />

          {/* Delete Confirmation Dialog */}
          <LazyConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => {
              setIsDeleteDialogOpen(false)
              setScheduleToDelete(null)
            }}
            onConfirm={() => handleConfirmDelete('single')}
            title="Delete Schedule"
            message={`Are you sure you want to delete this schedule for ${scheduleToDelete?.staff_name}? This action cannot be undone.`}
            confirmText="Delete"
            variant="danger"
            loading={formLoading}
          />

          {/* Recurring Delete Modal */}
          <RecurringDeleteModal
            isOpen={isRecurringDeleteModalOpen}
            onClose={() => {
              setIsRecurringDeleteModalOpen(false)
              setScheduleToDelete(null)
            }}
            onDeleteSingle={handleRecurringDeleteSingle}
            onDeleteSeries={handleRecurringDeleteSeries}
            scheduleDate={scheduleToDelete?.schedule_date || ''}
            staffName={scheduleToDelete?.staff_name || 'Unknown Staff'}
          />
        </div>
      </SessionManager>
    </RouteProtection>
  )
}