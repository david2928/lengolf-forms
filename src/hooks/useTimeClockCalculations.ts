import { useMemo } from 'react'
import { 
  calculateWorkShifts, 
  calculateStaffAnalytics, 
  type WorkShift, 
  type StaffTimeAnalytics,
  type TimeEntry as TimeCalculationEntry
} from '@/lib/time-calculation'
import { TimeEntry } from './useTimeClockData'

// Hook for memoized time calculations
export const useTimeClockCalculations = (timeEntries: TimeEntry[]) => {
  // Convert TimeEntry to TimeCalculationEntry format
  const calculationEntries = useMemo((): TimeCalculationEntry[] => {
    return timeEntries.map(entry => ({
      entry_id: entry.entry_id,
      staff_id: entry.staff_id,
      staff_name: entry.staff_name,
      action: entry.action,
      timestamp: entry.timestamp,
      date_only: entry.date_only,
      time_only: entry.time_only,
      photo_captured: entry.photo_captured,
      camera_error: entry.camera_error
    }))
  }, [timeEntries])

  // Memoize work shifts calculation
  const workShifts = useMemo((): WorkShift[] => {
    if (!calculationEntries.length) return []
    return calculateWorkShifts(calculationEntries)
  }, [calculationEntries])

  // Memoize staff analytics calculation
  const staffAnalytics = useMemo((): StaffTimeAnalytics[] => {
    if (!workShifts.length) return []
    return calculateStaffAnalytics(workShifts, calculationEntries)
  }, [workShifts, calculationEntries])

  // Derived statistics
  const statistics = useMemo(() => {
    const totalCompleteShifts = workShifts.filter(shift => shift.is_complete).length
    const totalIncompleteShifts = workShifts.filter(shift => !shift.is_complete).length
    const totalHours = workShifts
      .filter(shift => shift.is_complete)
      .reduce((total, shift) => total + shift.net_hours, 0)
    const totalOvertimeHours = workShifts
      .reduce((total, shift) => total + shift.overtime_hours, 0)

    return {
      totalCompleteShifts,
      totalIncompleteShifts,
      totalHours: parseFloat(totalHours.toFixed(1)),
      totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(1)),
      averageShiftLength: totalCompleteShifts > 0 
        ? parseFloat((totalHours / totalCompleteShifts).toFixed(1))
        : 0
    }
  }, [workShifts])

  return {
    workShifts,
    staffAnalytics,
    statistics
  }
}