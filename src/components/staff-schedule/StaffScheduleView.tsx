'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Staff, NavigationTab, StaffSchedule, ScheduleIndicator } from '@/types/staff-schedule'
import { useStaffSchedule } from '@/hooks/useStaffSchedule'
import { HorizontalDatePicker } from './HorizontalDatePicker'
import { ScheduleCard } from './ScheduleCard'
import { EmptyScheduleState } from './EmptyScheduleState'
import { BottomNavigation } from './BottomNavigation'
import { ShiftDetailModal } from './ShiftDetailModal'
import { TeamScheduleHeader } from './TeamScheduleHeader'
import { PullToRefresh } from './PullToRefresh'
import { ErrorBoundary, ScheduleErrorBoundary } from '@/components/common/ErrorBoundary'
import { ErrorDisplay } from '@/components/common/ErrorDisplay'
import { LoadingState, ScheduleLoadingState } from '@/components/common/LoadingState'

interface StaffScheduleViewProps {
  selectedStaff: Staff | null
  viewAllStaff?: boolean
  onBackToSelection: () => void
}

export function StaffScheduleView({ selectedStaff, viewAllStaff = false, onBackToSelection }: StaffScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState<NavigationTab>(viewAllStaff ? 'all' : 'personal')
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null)
  
  const {
    schedules,
    indicators,
    schedulesLoading,
    schedulesError,
    teamSchedule,
    teamLoading,
    teamError,
    fetchSchedules,
    fetchTeamSchedule,
    retrySchedules,
    retryTeamSchedule
  } = useStaffSchedule()

  // Manual data fetching - no automatic useEffect
  const fetchData = () => {
    const startDate = new Date(selectedDate)
    startDate.setDate(selectedDate.getDate() - 3)
    const endDate = new Date(selectedDate)
    endDate.setDate(selectedDate.getDate() + 10)

    if (activeTab === 'personal' && selectedStaff) {
      fetchSchedules({
        staffId: selectedStaff.id,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        viewMode: 'personal'
      })
    } else if (activeTab === 'team' || activeTab === 'all' || viewAllStaff) {
      fetchTeamSchedule(selectedDate.toISOString().split('T')[0])
      fetchSchedules({
        staffId: null,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        viewMode: 'team'
      })
    }
  }

  // Initial data load - run once only
  const [hasInitialized, setHasInitialized] = useState(false)
  useEffect(() => {
    if (!hasInitialized) {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 3)
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 10)

      if (viewAllStaff) {
        // Load team data for "View All Staff" mode
        fetchTeamSchedule(new Date().toISOString().split('T')[0])
        fetchSchedules({
          staffId: null,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          viewMode: 'team'
        })
      } else if (selectedStaff) {
        // Load personal data for individual staff
        fetchSchedules({
          staffId: selectedStaff.id,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          viewMode: 'personal'
        })
      }
      
      setHasInitialized(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    // Need to wait a tick for state update, then fetch
    requestAnimationFrame(() => {
      const startDate = new Date(date)
      startDate.setDate(date.getDate() - 3)
      const endDate = new Date(date)
      endDate.setDate(date.getDate() + 10)

      if (activeTab === 'personal' && selectedStaff) {
        fetchSchedules({
          staffId: selectedStaff.id,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          viewMode: 'personal'
        })
      } else if (activeTab === 'team' || activeTab === 'all' || viewAllStaff) {
        // Format date in local timezone for API call
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const dateString = `${year}-${month}-${day}`
        
        fetchTeamSchedule(dateString)
        fetchSchedules({
          staffId: null,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          viewMode: 'team'
        })
      }
    })
  }

  // Handle tab change  
  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab)
    // Need to wait a tick for state update, then fetch
    requestAnimationFrame(() => {
      const startDate = new Date(selectedDate)
      startDate.setDate(selectedDate.getDate() - 3)
      const endDate = new Date(selectedDate)
      endDate.setDate(selectedDate.getDate() + 10)

      if (tab === 'personal' && selectedStaff) {
        fetchSchedules({
          staffId: selectedStaff.id,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          viewMode: 'personal'
        })
      } else if (tab === 'team' || tab === 'all' || viewAllStaff) {
        // Format selected date in local timezone for API call
        const year = selectedDate.getFullYear()
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
        const day = String(selectedDate.getDate()).padStart(2, '0')
        const dateString = `${year}-${month}-${day}`
        
        fetchTeamSchedule(dateString)
        fetchSchedules({
          staffId: null,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          viewMode: 'team'
        })
      }
    })
  }

  // Handle schedule card tap
  const handleScheduleCardTap = (scheduleId: string, clickPos: { x: number; y: number }) => {
    const schedule = schedulesToShow.find(s => s.schedule_id === scheduleId)
    if (schedule) {
      setSelectedSchedule(schedule)
      setClickPosition(clickPos)
      setIsModalOpen(true)
    }
  }

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedSchedule(null)
    setClickPosition(null)
  }

  // Filter schedules for selected date (using local timezone)
  const year = selectedDate.getFullYear()
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
  const day = String(selectedDate.getDate()).padStart(2, '0')
  const selectedDateString = `${year}-${month}-${day}`
  const schedulesForSelectedDate = schedules.filter(
    schedule => schedule.schedule_date === selectedDateString
  )

  // Convert indicators to the format expected by HorizontalDatePicker
  const dateIndicators = indicators.map(indicator => ({
    date: indicator.schedule_date,
    hasShifts: indicator.shift_count > 0,
    shiftCount: indicator.shift_count,
    indicatorType: indicator.indicator_type
  }))

  // Get team schedules for selected date
  const teamSchedulesForDate = teamSchedule.filter(staff => 
    staff.shifts && staff.shifts.length > 0
  ).flatMap(staff => 
    staff.shifts.map((shift: any) => ({
      ...shift,
      schedule_id: shift.id || `${staff.staff_id}-${shift.start_time}`,
      schedule_date: selectedDateString,
      staff_id: staff.staff_id,
      staff_name: staff.staff_name,
      staff_names: [staff.staff_name]
    }))
  )
  
  // Group team schedules by time slot to show multiple staff in one card
  const groupedTeamSchedules = teamSchedulesForDate.reduce((groups: any[], schedule: any) => {
    // Find existing group with same time and location
    const existingGroup = groups.find(group => 
      group.start_time === schedule.start_time && 
      group.end_time === schedule.end_time &&
      group.location === schedule.location
    )
    
    if (existingGroup) {
      // Add staff to existing group
      existingGroup.staff_names.push(schedule.staff_name)
      return groups
    } else {
      // Create new group
      return [...groups, {
        ...schedule,
        schedule_id: `group-${schedule.start_time}-${schedule.end_time}`,
        staff_names: [schedule.staff_name]
      }]
    }
  }, [])

  // Determine what to show based on active tab
  const getSchedulesToShow = () => {
    if (activeTab === 'personal') {
      return schedulesForSelectedDate
    } else if (activeTab === 'team') {
      return groupedTeamSchedules
    } else if (activeTab === 'all') {
      // Show all individual schedules without grouping
      return schedulesForSelectedDate
    }
    return []
  }

  const schedulesToShow = getSchedulesToShow()
  
  // Prepare team stats for the header
  const teamStats = {
    total_staff: teamSchedule.length || 0,
    staff_scheduled: teamSchedule.filter(staff => staff.total_shifts > 0).length || 0,
    total_shifts: teamSchedule.reduce((sum, staff) => sum + staff.total_shifts, 0) || 0,
    staff_with_multiple_shifts: teamSchedule.filter(staff => staff.total_shifts > 1).length || 0,
    coverage_percentage: teamSchedule.length > 0 
      ? Math.round((teamSchedule.filter(staff => staff.total_shifts > 0).length / teamSchedule.length) * 100) 
      : 0
  }
  
  const isLoading = activeTab === 'personal' ? schedulesLoading : (activeTab === 'all' ? schedulesLoading : teamLoading)
  const error = activeTab === 'personal' ? schedulesError : (activeTab === 'all' ? schedulesError : teamError)

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    const startDate = new Date(selectedDate)
    startDate.setDate(selectedDate.getDate() - 3)
    const endDate = new Date(selectedDate)
    endDate.setDate(selectedDate.getDate() + 10)

    if (activeTab === 'personal' && selectedStaff) {
      await fetchSchedules({
        staffId: selectedStaff.id,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        viewMode: 'personal'
      })
    } else if (activeTab === 'team' || activeTab === 'all' || viewAllStaff) {
      await Promise.all([
        fetchTeamSchedule(selectedDate.toISOString().split('T')[0]),
        fetchSchedules({
          staffId: null,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          viewMode: 'team'
        })
      ])
    }
  }

  return (
    <ScheduleErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onBackToSelection()}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Back to staff selection"
              type="button"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              {activeTab === 'personal' && selectedStaff
                ? `${selectedStaff.name}'s Schedule`
                : 'All Staff Schedules'
              }
            </h1>
          </div>
        </div>
      </div>

      {/* Horizontal Date Picker */}
      <HorizontalDatePicker
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        indicators={dateIndicators}
      />

      {/* Content Area */}
      <PullToRefresh 
        onRefresh={handleRefresh}
        disabled={isLoading}
        className="flex-1 overflow-y-auto"
      >
        {isLoading ? (
          <ScheduleLoadingState />
        ) : error ? (
          <div className="p-4">
            <ErrorDisplay
              error={error}
              variant="card"
              onRetry={() => {
                if (activeTab === 'personal') {
                  retrySchedules()
                } else if (activeTab === 'all') {
                  retrySchedules()
                } else {
                  retryTeamSchedule()
                }
              }}
              showDismiss={false}
            />
          </div>
        ) : schedulesToShow.length === 0 ? (
          <EmptyScheduleState
            selectedDate={selectedDate}
            staffName={activeTab === 'personal' && selectedStaff ? selectedStaff.name : undefined}
            viewMode={activeTab === 'personal' ? 'personal' : 'team'}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />
        ) : (
          <div className="p-4 space-y-4">
            {schedulesToShow.map((schedule) => (
              <ScheduleCard
                key={schedule.schedule_id}
                schedule={schedule}
                viewMode={activeTab === 'personal' ? 'personal' : 'team'}
                onCardTap={handleScheduleCardTap}
              />
            ))}
          </div>
        )}
      </PullToRefresh>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showPersonalTab={!!selectedStaff}
      />

      {/* Shift Detail Modal */}
      <ShiftDetailModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        schedule={selectedSchedule}
        clickPosition={clickPosition}
      />
      </div>
    </ScheduleErrorBoundary>
  )
}