// Staff scheduling system type definitions

export interface Staff {
  id: number
  name: string
  staff_id: string
  department: string
  position: string
  initials: string
  profile_photo?: string
}

export interface StaffSchedule {
  schedule_id: string
  staff_id: number
  staff_name: string
  schedule_date: string
  start_time: string
  end_time: string
  location: string | null
  notes: string | null
  shift_color: string
  duration_hours: number
  is_recurring?: boolean
  recurring_group_id?: string | null
}

export interface ScheduleIndicator {
  schedule_date: string
  shift_count: number
  indicator_type: 'single' | 'multiple'
}

export interface TeamScheduleData {
  staff_id: number
  staff_name: string
  shifts: any[]
  total_shifts: number
}

export interface ScheduleApiResponse {
  success: boolean
  data: {
    schedules: StaffSchedule[]
    indicators: ScheduleIndicator[]
    filters: {
      staff_id: number | null
      start_date: string
      end_date: string
      view_mode: string
    }
    meta: {
      total_schedules: number
      date_range_days: number
    }
  }
  error?: string
}

export interface StaffApiResponse {
  success: boolean
  data: {
    staff: Staff[]
    total_staff: number
  }
  error?: string
}

export interface TeamScheduleApiResponse {
  success: boolean
  data: {
    schedule_date: string
    team_schedule: TeamScheduleData[]
    team_stats: {
      total_staff: number
      staff_scheduled: number
      total_shifts: number
      staff_with_multiple_shifts: number
      coverage_percentage: number
    }
  }
  error?: string
}

export type ViewMode = 'personal' | 'team'
export type NavigationTab = 'personal' | 'team' | 'all' | 'availability' | 'replacements'

// Utility type for date strings in YYYY-MM-DD format
export type DateString = string

// Color constants for shift types
export const SHIFT_COLORS = {
  MORNING: '#06B6D4',    // cyan - 6AM-11AM
  AFTERNOON: '#F59E0B',  // amber - 12PM-5PM  
  EVENING: '#EC4899'     // pink - 6PM+
} as const

// Helper function to get shift color based on start time
export function getShiftColor(startTime: string): string {
  const hour = parseInt(startTime.split(':')[0])
  
  if (hour >= 6 && hour <= 11) {
    return SHIFT_COLORS.MORNING
  } else if (hour >= 12 && hour <= 17) {
    return SHIFT_COLORS.AFTERNOON
  } else {
    return SHIFT_COLORS.EVENING
  }
}

// Helper function to format time for display - only show minutes when not at top of hour
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  
  // Only show minutes if not at the top of the hour
  if (minutes === '00') {
    return `${displayHour}${ampm}`
  } else {
    return `${displayHour}:${minutes}${ampm}`
  }
}

// Helper function to format date for display
export function formatDate(dateString: string): string {
  // Parse date string safely to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

// Helper function to get day abbreviation
export function getDayAbbreviation(dateString: string): string {
  // Parse date string safely to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
}

// Helper function to calculate duration between two times
export function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  
  return Math.round(((endMinutes - startMinutes) / 60) * 100) / 100
}

// Helper function to get week start date (Monday)
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

// Helper function to get date range for a week
export function getWeekDateRange(startDate: Date): DateString[] {
  const dates: DateString[] = []
  
  for (let i = 0; i < 7; i++) {
    // Create a new date for each day to avoid mutation issues
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + i)
    
    // Format date as YYYY-MM-DD in local timezone
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')
    dates.push(`${year}-${month}-${day}`)
  }
  
  return dates
}