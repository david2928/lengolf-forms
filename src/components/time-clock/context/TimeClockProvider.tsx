import React, { createContext, useContext } from 'react'
import { useTimeClockData, useTimeClockCalculations, usePhotoManager } from '@/hooks'
import { subDays } from 'date-fns'
import { getBangkokToday, getBangkokNow, formatBangkokTime } from '@/lib/bangkok-timezone'

// Import hooks
import type { TimeEntry, ReportFilters, TimeClockData } from '@/hooks/useTimeClockData'
import type { WorkShift, StaffTimeAnalytics } from '@/lib/time-calculation'

// Context type definition
interface TimeClockContextType extends TimeClockData {
  // From useTimeClockCalculations
  workShifts: WorkShift[]
  staffAnalytics: StaffTimeAnalytics[]
  statistics: {
    totalCompleteShifts: number
    totalIncompleteShifts: number
    totalHours: number
    totalOvertimeHours: number
    averageShiftLength: number
  }
  
  // From usePhotoManager
  photoUrls: Map<string, string>
  loadingPhotos: Set<string>
  loadPhotoUrl: (photoPath: string) => Promise<string | null>
  getCachedPhotoUrl: (photoPath: string) => string | null
  isPhotoLoading: (photoPath: string) => boolean
  
  // Filter management
  filters: ReportFilters
  handleFilterChange: (key: keyof ReportFilters, value: string) => void
  handleQuickDateFilter: (days: number) => void
  refreshData: () => void
}

// Create context
const TimeClockContext = createContext<TimeClockContextType | undefined>(undefined)

// Default filters
const defaultFilters: ReportFilters = {
  startDate: subDays(getBangkokNow(), 7).toISOString().split('T')[0],
  endDate: getBangkokToday(),
  staffId: 'all',
  action: 'all',
  photoFilter: 'all'
}

// Provider component
interface TimeClockProviderProps {
  children: React.ReactNode
  initialFilters?: Partial<ReportFilters>
}

export const TimeClockProvider: React.FC<TimeClockProviderProps> = ({ 
  children, 
  initialFilters 
}) => {
  const mergedFilters = { ...defaultFilters, ...initialFilters }
  
  // Core data management
  const timeClockData = useTimeClockData(mergedFilters)
  
  // Calculations based on time entries
  const calculations = useTimeClockCalculations(timeClockData.timeEntries)
  
  // Photo management
  const photoManager = usePhotoManager()

  // Combined context value
  const contextValue: TimeClockContextType = {
    // Core data
    ...timeClockData,
    
    // Calculations
    ...calculations,
    
    // Photo management
    ...photoManager
  }

  return (
    <TimeClockContext.Provider value={contextValue}>
      {children}
    </TimeClockContext.Provider>
  )
}

// Hook to use the context
export const useTimeClockContext = (): TimeClockContextType => {
  const context = useContext(TimeClockContext)
  if (context === undefined) {
    throw new Error('useTimeClockContext must be used within a TimeClockProvider')
  }
  return context
}

// Export types for external use
export type { TimeEntry, ReportFilters, WorkShift, StaffTimeAnalytics }