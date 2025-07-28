// Staff schedule specific validation utilities

import { 
  ScheduleErrorCodes, 
  ValidationError, 
  createValidationError,
  createScheduleError,
  ScheduleError
} from '@/types/errors'
import {
  validateDate,
  validateTime,
  validateStaffId,
  validateTimeRange,
  validateNotPastDate,
  validateScheduleCreate,
  validateScheduleUpdate,
  ScheduleCreateData,
  ScheduleUpdateData
} from '@/lib/validation'

// Schedule conflict detection
export interface ExistingSchedule {
  id: string
  staff_id: number
  schedule_date: string
  start_time: string
  end_time: string
}

export function detectScheduleConflict(
  newSchedule: ScheduleCreateData | ScheduleUpdateData,
  existingSchedules: ExistingSchedule[],
  excludeId?: string
): ScheduleError | null {
  if (!newSchedule.staff_id || !newSchedule.schedule_date || !newSchedule.start_time || !newSchedule.end_time) {
    return null // Skip conflict check if required fields are missing
  }

  const staffId = typeof newSchedule.staff_id === 'string' ? parseInt(newSchedule.staff_id) : newSchedule.staff_id
  
  // Find schedules for the same staff member on the same date
  const conflictingSchedules = existingSchedules.filter(schedule => 
    schedule.staff_id === staffId &&
    schedule.schedule_date === newSchedule.schedule_date &&
    schedule.id !== excludeId // Exclude current schedule when updating
  )

  // Check for time overlaps
  const newStart = timeToMinutes(newSchedule.start_time)
  const newEnd = timeToMinutes(newSchedule.end_time)

  for (const existing of conflictingSchedules) {
    const existingStart = timeToMinutes(existing.start_time)
    const existingEnd = timeToMinutes(existing.end_time)

    // Check if times overlap
    if (
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd)
    ) {
      return createScheduleError(
        ScheduleErrorCodes.SCHEDULE_CONFLICT,
        {
          conflictingSchedule: existing,
          newSchedule: {
            staff_id: staffId,
            schedule_date: newSchedule.schedule_date,
            start_time: newSchedule.start_time,
            end_time: newSchedule.end_time
          }
        }
      )
    }
  }

  return null
}

// Convert time string to minutes for comparison
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// Validate schedule creation with conflict detection
export async function validateScheduleCreateWithConflicts(
  data: ScheduleCreateData,
  existingSchedules: ExistingSchedule[]
): Promise<{ errors: ValidationError[]; conflictError: ScheduleError | null }> {
  // Basic validation
  const errors = validateScheduleCreate(data)
  
  // Skip conflict detection if basic validation failed
  if (errors.length > 0) {
    return { errors, conflictError: null }
  }

  // Check for conflicts
  const conflictError = detectScheduleConflict(data, existingSchedules)
  
  return { errors, conflictError }
}

// Validate schedule update with conflict detection
export async function validateScheduleUpdateWithConflicts(
  data: ScheduleUpdateData,
  existingSchedules: ExistingSchedule[]
): Promise<{ errors: ValidationError[]; conflictError: ScheduleError | null }> {
  // Basic validation
  const errors = validateScheduleUpdate(data)
  
  // Skip conflict detection if basic validation failed
  if (errors.length > 0) {
    return { errors, conflictError: null }
  }

  // Check for conflicts (excluding the current schedule being updated)
  const conflictError = detectScheduleConflict(data, existingSchedules, data.id)
  
  return { errors, conflictError }
}

// Business hours validation
export interface BusinessHours {
  start: string // e.g., "06:00"
  end: string   // e.g., "22:00"
}

export function validateBusinessHours(
  startTime: string,
  endTime: string,
  businessHours: BusinessHours = { start: "06:00", end: "22:00" }
): ValidationError | null {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const businessStartMinutes = timeToMinutes(businessHours.start)
  const businessEndMinutes = timeToMinutes(businessHours.end)

  if (startMinutes < businessStartMinutes || endMinutes > businessEndMinutes) {
    return createValidationError(
      'time_range',
      ScheduleErrorCodes.INVALID_TIME_RANGE,
      `Schedule must be within business hours (${businessHours.start} - ${businessHours.end})`
    )
  }

  return null
}

// Minimum shift duration validation
export function validateMinimumShiftDuration(
  startTime: string,
  endTime: string,
  minimumMinutes: number = 60
): ValidationError | null {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const duration = endMinutes - startMinutes

  if (duration < minimumMinutes) {
    return createValidationError(
      'time_range',
      ScheduleErrorCodes.INVALID_TIME_RANGE,
      `Shift must be at least ${minimumMinutes} minutes long`
    )
  }

  return null
}

// Maximum shift duration validation
export function validateMaximumShiftDuration(
  startTime: string,
  endTime: string,
  maximumMinutes: number = 480 // 8 hours
): ValidationError | null {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const duration = endMinutes - startMinutes

  if (duration > maximumMinutes) {
    return createValidationError(
      'time_range',
      ScheduleErrorCodes.INVALID_TIME_RANGE,
      `Shift cannot be longer than ${maximumMinutes / 60} hours`
    )
  }

  return null
}

// Comprehensive schedule validation
export interface ScheduleValidationOptions {
  businessHours?: BusinessHours
  minimumShiftMinutes?: number
  maximumShiftMinutes?: number
  allowPastDates?: boolean
}

export function validateScheduleComprehensive(
  data: ScheduleCreateData | ScheduleUpdateData,
  options: ScheduleValidationOptions = {}
): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Basic validation
  if ('id' in data) {
    errors.push(...validateScheduleUpdate(data))
  } else {
    errors.push(...validateScheduleCreate(data))
  }

  // Skip additional validation if basic validation failed
  if (errors.length > 0) {
    return errors
  }

  // Business hours validation
  if (options.businessHours && data.start_time && data.end_time) {
    const businessHoursError = validateBusinessHours(
      data.start_time,
      data.end_time,
      options.businessHours
    )
    if (businessHoursError) errors.push(businessHoursError)
  }

  // Minimum shift duration validation
  if (options.minimumShiftMinutes && data.start_time && data.end_time) {
    const minDurationError = validateMinimumShiftDuration(
      data.start_time,
      data.end_time,
      options.minimumShiftMinutes
    )
    if (minDurationError) errors.push(minDurationError)
  }

  // Maximum shift duration validation
  if (options.maximumShiftMinutes && data.start_time && data.end_time) {
    const maxDurationError = validateMaximumShiftDuration(
      data.start_time,
      data.end_time,
      options.maximumShiftMinutes
    )
    if (maxDurationError) errors.push(maxDurationError)
  }

  return errors
}

// Utility to format validation errors for display
export function formatValidationErrorsForDisplay(errors: ValidationError[]): string[] {
  return errors.map(error => {
    switch (error.field) {
      case 'staff_id':
        return 'Please select a staff member'
      case 'schedule_date':
        return error.message
      case 'start_time':
        return 'Please enter a valid start time'
      case 'end_time':
        return 'Please enter a valid end time'
      case 'time_range':
        return error.message
      case 'location':
        return 'Location is too long'
      case 'notes':
        return 'Notes are too long'
      default:
        return error.message
    }
  })
}

// Utility to check if a schedule can be deleted
export function canDeleteSchedule(scheduleDate: string): { canDelete: boolean; reason?: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const scheduleDay = new Date(scheduleDate)
  scheduleDay.setHours(0, 0, 0, 0)
  
  // Can't delete past schedules
  if (scheduleDay < today) {
    return {
      canDelete: false,
      reason: 'Cannot delete past schedules'
    }
  }
  
  // Can't delete schedules for today if it's past a certain time
  if (scheduleDay.getTime() === today.getTime()) {
    const currentHour = new Date().getHours()
    if (currentHour >= 6) { // Can't delete after 6 AM on the day of
      return {
        canDelete: false,
        reason: 'Cannot delete schedules on the same day after 6 AM'
      }
    }
  }
  
  return { canDelete: true }
}

// Utility to check if a schedule can be modified
export function canModifySchedule(scheduleDate: string): { canModify: boolean; reason?: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const scheduleDay = new Date(scheduleDate)
  scheduleDay.setHours(0, 0, 0, 0)
  
  // Can't modify past schedules
  if (scheduleDay < today) {
    return {
      canModify: false,
      reason: 'Cannot modify past schedules'
    }
  }
  
  return { canModify: true }
}