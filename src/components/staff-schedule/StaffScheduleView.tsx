'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Search, Settings } from 'lucide-react'
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
  selectedStaff: Staff
  onBackToSelection: () => void
}

export function StaffScheduleView({ selectedStaff, onBackToSelection }: StaffScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState<NavigationTab>('personal')
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
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

  // Fetch schedules when component mounts or dependencies change
  useEffect(() => {
    const startDate = new Date(selectedDate)
    startDate.setDate(selectedDate.getDate() - 3) // Get a few days before
    const endDate = new Date(selectedDate)
    endDate.setDate(selectedDate.getDate() + 10) // Get a few days after

    if (activeTab === 'personal') {
      fetchSchedules({
        staffId: selectedStaff.id,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        viewMode: 'personal'
      })
    } else if (activeTab === 'team') {
      fetchTeamSchedule(selectedDate.toISOString().split('T')[0])
      // Also fetch team-wide schedules for indicators
      fetchSchedules({
        staffId: null,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        viewMode: 'team'
      })
    }
  }, [selectedStaff.id, selectedDate, activeTab, fetchSchedules, fetchTeamSchedule])

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  // Handle tab change
  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab)
  }

  // Handle schedule card tap
  const handleScheduleCardTap = (scheduleId: string) => {
    const schedule = schedulesToShow.find(s => s.schedule_id === scheduleId)
    if (schedule) {
      setSelectedSchedule(schedule)
      setIsModalOpen(true)
    }
  }

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedSchedule(null)
  }

  // Handle clock in/out
  const handleClockInOut = () => {
    // TODO: Integrate with time clock system
    console.log('Clock in/out for schedule:', selectedSchedule?.schedule_id)
    // For now, just close the modal
    handleModalClose()
  }

  // Filter schedules for selected date
  const selectedDateString = selectedDate.toISOString().split('T')[0]
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
  
  const isLoading = activeTab === 'personal' ? schedulesLoading : teamLoading
  const error = activeTab === 'personal' ? schedulesError : teamError

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    const startDate = new Date(selectedDate)
    startDate.setDate(selectedDate.getDate() - 3)
    const endDate = new Date(selectedDate)
    endDate.setDate(selectedDate.getDate() + 10)

    if (activeTab === 'personal') {
      await fetchSchedules({
        staffId: selectedStaff.id,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        viewMode: 'personal'
      })
    } else if (activeTab === 'team') {
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
      <div className="min-h-screen bg-slate-50 flex flex-col safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 safe-area-left safe-area-right">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToSelection}
              className="touch-target p-2 hover:bg-slate-100 rounded-lg transition-colors tap-highlight no-select"
              aria-label="Back to staff selection"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <h1 className="text-responsive-lg font-semibold text-slate-900 truncate">
              {activeTab === 'personal' 
                ? `${selectedStaff.name}'s Schedule`
                : 'Team Schedule'
              }
            </h1>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-3">
            <button 
              className="touch-target p-2 hover:bg-slate-100 rounded-lg transition-colors tap-highlight no-select"
              aria-label="Search schedules"
            >
              <Search className="h-5 w-5 text-slate-400" />
            </button>
            <button 
              className="touch-target p-2 hover:bg-slate-100 rounded-lg transition-colors tap-highlight no-select"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5 text-slate-400" />
            </button>
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
        className="flex-1 overflow-y-auto smooth-scroll safe-area-left safe-area-right"
      >
        {/* Team Schedule Header (only shown in team view) */}
        {activeTab === 'team' && !isLoading && !error && (
          <TeamScheduleHeader 
            teamStats={teamStats}
            selectedDate={selectedDate}
          />
        )}
        
        {isLoading ? (
          <ScheduleLoadingState />
        ) : error ? (
          <div className="p-4 mobile-padding">
            <ErrorDisplay
              error={error}
              variant="card"
              onRetry={() => {
                if (activeTab === 'personal') {
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
            staffName={activeTab === 'personal' ? selectedStaff.name : undefined}
            viewMode={activeTab === 'personal' ? 'personal' : 'team'}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />
        ) : (
          <div className="p-4 mobile-padding mobile-card-spacing">
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
      />

      {/* Shift Detail Modal */}
      <ShiftDetailModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        schedule={selectedSchedule}
        onClockInOut={handleClockInOut}
      />
      </div>
    </ScheduleErrorBoundary>
  )
}
  