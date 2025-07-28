/**
 * Schedule Visualization Utilities
 * Helper functions for timeline grid calculations and data processing
 */

import { StaffSchedule, formatTime, calculateDuration } from '@/types/staff-schedule'
import { ProcessedScheduleBlock, GridPosition, DEFAULT_VISUALIZATION_CONFIG, ScheduleEntry } from '@/types/schedule-visualization'

/**
 * Calculate grid position for a schedule block
 */
export function calculateGridPosition(schedule: StaffSchedule): GridPosition {
  const startHour = parseInt(schedule.start_time.split(':')[0])
  const endHour = parseInt(schedule.end_time.split(':')[0])
  const startMinutes = parseInt(schedule.start_time.split(':')[1])
  const endMinutes = parseInt(schedule.end_time.split(':')[1])
  
  // Convert to grid positions (10am = row 0, 11am = row 1, etc.)
  const businessStart = DEFAULT_VISUALIZATION_CONFIG.businessHours.start
  const businessEnd = DEFAULT_VISUALIZATION_CONFIG.businessHours.end
  
  const startRow = Math.max(0, startHour - businessStart)
  const endRow = Math.min(businessEnd - businessStart, endHour - businessStart)
  
  // Handle partial hours and calculate span
  const hasEndMinutes = endMinutes > 0
  // Fix rowSpan calculation - if end time has minutes, we need to span to the next hour
  const actualEndRow = hasEndMinutes ? endRow + 1 : endRow
  const rowSpan = Math.max(1, actualEndRow - startRow)
  
  return {
    dayIndex: getDayIndex(schedule.schedule_date),
    startRow,
    endRow,
    rowSpan
  }
}

/**
 * Get day index (0-6) for Monday-Sunday from date string
 */
export function getDayIndex(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const dayOfWeek = date.getDay()
  
  // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1
}

/**
 * Generate time slot labels for the visualization
 */
export function generateTimeSlots(): string[] {
  const slots: string[] = []
  const { start, end } = DEFAULT_VISUALIZATION_CONFIG.businessHours
  
  for (let hour = start; hour <= end; hour++) {
    const timeString = `${hour.toString().padStart(2, '0')}:00`
    slots.push(formatTime(timeString))
  }
  
  return slots
}

/**
 * Generate day labels for the week
 */
export function generateDayLabels(weekStart: string): Array<{ day: string; date: number; fullDate: string }> {
  const startDate = new Date(weekStart)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  
  return days.map((day, index) => {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + index)
    
    return {
      day,
      date: currentDate.getDate(),
      fullDate: currentDate.toISOString().split('T')[0]
    }
  })
}

/**
 * Process raw schedule data into visualization blocks
 */
export function processScheduleData(rawSchedules: ScheduleEntry[]): ProcessedScheduleBlock[] {
  if (!rawSchedules || !Array.isArray(rawSchedules)) {
    return []
  }

  return rawSchedules
    .filter(schedule => {
      // Filter out schedules outside business hours
      const startHour = parseInt(schedule.start_time?.split(':')[0] || '0')
      const endHour = parseInt(schedule.end_time?.split(':')[0] || '0')
      const { start, end } = DEFAULT_VISUALIZATION_CONFIG.businessHours
      
      return startHour >= start && startHour <= end && endHour >= start && endHour <= end
    })
    .map(schedule => {
      // Convert ScheduleEntry to StaffSchedule for compatibility
      const staffSchedule: StaffSchedule = {
        schedule_id: schedule.id,
        staff_id: schedule.staff_id,
        staff_name: schedule.staff_name,
        schedule_date: schedule.schedule_date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        location: schedule.location || null,
        notes: schedule.notes || null,
        shift_color: '#3B82F6', // Default blue color
        duration_hours: calculateDuration(schedule.start_time, schedule.end_time),
        is_recurring: schedule.is_recurring,
        recurring_group_id: schedule.recurring_group_id || null
      }
      
      const gridPosition = calculateGridPosition(staffSchedule)
      const duration = calculateDuration(schedule.start_time, schedule.end_time)
      
      return {
        id: schedule.id || `${schedule.staff_id}-${schedule.start_time}-${schedule.schedule_date}`,
        staffId: schedule.staff_id,
        staffName: schedule.staff_name,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        date: schedule.schedule_date,
        location: schedule.location,
        notes: schedule.notes,
        gridPosition,
        duration,
        isRecurring: schedule.is_recurring,
        originalSchedule: staffSchedule
      }
    })
    .sort((a, b) => {
      // Sort by day, then by start time
      if (a.gridPosition.dayIndex !== b.gridPosition.dayIndex) {
        return a.gridPosition.dayIndex - b.gridPosition.dayIndex
      }
      return a.gridPosition.startRow - b.gridPosition.startRow
    })
}

/**
 * Group overlapping schedules for better display
 */
export function groupOverlappingSchedules(schedules: ProcessedScheduleBlock[]): ProcessedScheduleBlock[][] {
  const groups: ProcessedScheduleBlock[][] = []
  
  schedules.forEach(schedule => {
    // Find existing group that this schedule overlaps with
    const overlappingGroup = groups.find(group =>
      group.some(existingSchedule =>
        existingSchedule.gridPosition.dayIndex === schedule.gridPosition.dayIndex &&
        schedulesOverlap(existingSchedule, schedule)
      )
    )
    
    if (overlappingGroup) {
      overlappingGroup.push(schedule)
    } else {
      groups.push([schedule])
    }
  })
  
  return groups
}

/**
 * Check if two schedules overlap in time
 */
function schedulesOverlap(schedule1: ProcessedScheduleBlock, schedule2: ProcessedScheduleBlock): boolean {
  const start1 = schedule1.gridPosition.startRow
  const end1 = schedule1.gridPosition.startRow + schedule1.gridPosition.rowSpan
  const start2 = schedule2.gridPosition.startRow
  const end2 = schedule2.gridPosition.startRow + schedule2.gridPosition.rowSpan
  
  return start1 < end2 && start2 < end1
}

/**
 * Calculate CSS grid styles for a schedule block
 */
export function calculateBlockStyles(
  schedule: ProcessedScheduleBlock,
  overlapIndex: number = 0,
  totalOverlapping: number = 1
): React.CSSProperties {
  const { gridPosition } = schedule
  const config = DEFAULT_VISUALIZATION_CONFIG
  
  // Calculate width when multiple blocks overlap
  const blockWidth = totalOverlapping > 1 ? `${100 / totalOverlapping}%` : '100%'
  const leftOffset = totalOverlapping > 1 ? `${(overlapIndex * 100) / totalOverlapping}%` : '0%'
  
  return {
    gridColumn: gridPosition.dayIndex + 2, // +2 because first column is for time labels
    gridRow: `${gridPosition.startRow + 2} / span ${gridPosition.rowSpan}`, // +2 for header row
    width: blockWidth,
    left: leftOffset,
    position: totalOverlapping > 1 ? 'relative' : 'static',
    zIndex: overlapIndex + 1,
    minHeight: `${config.timeSlotHeight * gridPosition.rowSpan - 4}px` // -4 for gap
  }
}

/**
 * Validate schedule data for visualization
 */
export function validateScheduleData(schedule: ScheduleEntry): boolean {
  if (!schedule) return false
  
  const requiredFields: (keyof ScheduleEntry)[] = ['staff_id', 'staff_name', 'start_time', 'end_time', 'schedule_date']
  const hasRequiredFields = requiredFields.every(field => schedule[field] != null)
  
  if (!hasRequiredFields) return false
  
  // Validate time format (HH:MM or HH:MM:SS)
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
  if (!timeRegex.test(schedule.start_time) || !timeRegex.test(schedule.end_time)) {
    return false
  }
  
  // Validate date format (YYYY-MM-DD) and actual date validity
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(schedule.schedule_date)) {
    return false
  }
  
  // Check if the date is actually valid
  const [year, month, day] = schedule.schedule_date.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return false
  }
  
  return true
}

/**
 * Get responsive configuration based on screen width
 */
export function getResponsiveConfig(screenWidth: number) {
  // Import responsive design utilities
  const { getResponsiveConfig: getResponsiveDesignConfig } = require('./responsive-design')
  const config = getResponsiveDesignConfig(screenWidth)
  
  return {
    timeSlotHeight: config.timeSlotHeight,
    fontSize: config.fontSize,
    blockPadding: config.blockPadding,
    showMinutes: config.showMinutes
  }
}

/**
 * Format time range for display in schedule blocks
 */
export function formatTimeRange(startTime: string, endTime: string, showMinutes: boolean = true): string {
  if (showMinutes) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`
  } else {
    // For mobile, show simplified time format
    const startHour = parseInt(startTime.split(':')[0])
    const endHour = parseInt(endTime.split(':')[0])
    const startAmPm = startHour >= 12 ? 'pm' : 'am'
    const endAmPm = endHour >= 12 ? 'pm' : 'am'
    const displayStartHour = startHour === 0 ? 12 : startHour > 12 ? startHour - 12 : startHour
    const displayEndHour = endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour
    
    return `${displayStartHour}${startAmPm}-${displayEndHour}${endAmPm}`
  }
}