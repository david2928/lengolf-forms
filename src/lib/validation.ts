// Validation utilities for staff scheduling system

import { ScheduleErrorCodes, ValidationError, createValidationError } from '@/types/errors'

// Date validation
export function validateDate(date: string, fieldName = 'date'): ValidationError | null {
  if (!date) {
    return createValidationError(fieldName, ScheduleErrorCodes.MISSING_REQUIRED_FIELDS)
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    return createValidationError(fieldName, ScheduleErrorCodes.INVALID_DATE_FORMAT, date)
  }
  
  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime())) {
    return createValidationError(fieldName, ScheduleErrorCodes.INVALID_DATE_FORMAT, date)
  }
  
  return null
}

// Time validation
export function validateTime(time: string, fieldName = 'time'): ValidationError | null {
  if (!time) {
    return createValidationError(fieldName, ScheduleErrorCodes.MISSING_REQUIRED_FIELDS)
  }
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(time)) {
    return createValidationError(fieldName, ScheduleErrorCodes.INVALID_TIME_FORMAT, time)
  }
  
  return null
}

// Staff ID validation
export function validateStaffId(staffId: any, fieldName = 'staff_id'): ValidationError | null {
  if (staffId === null || staffId === undefined) {
    return createValidationError(fieldName, ScheduleErrorCodes.MISSING_REQUIRED_FIELDS)
  }
  
  const id = typeof staffId === 'string' ? parseInt(staffId) : staffId
  if (isNaN(id) || id <= 0) {
    return createValidationError(fieldName, ScheduleErrorCodes.INVALID_STAFF_ID, staffId)
  }
  
  return null
}

// Time range validation
export function validateTimeRange(startTime: string, endTime: string): ValidationError | null {
  const startError = validateTime(startTime, 'start_time')
  if (startError) return startError
  
  const endError = validateTime(endTime, 'end_time')
  if (endError) return endError
  
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  
  if (endMinutes <= startMinutes) {
    return createValidationError('end_time', ScheduleErrorCodes.INVALID_TIME_RANGE, { startTime, endTime })
  }
  
  return null
}

// Date range validation
export function validateDateRange(startDate: string, endDate: string): ValidationError | null {
  const startError = validateDate(startDate, 'start_date')
  if (startError) return startError
  
  const endError = validateDate(endDate, 'end_date')
  if (endError) return endError
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (end < start) {
    return createValidationError('end_date', ScheduleErrorCodes.INVALID_DATE_RANGE, { startDate, endDate })
  }
  
  return null
}

// Past date validation
export function validateNotPastDate(date: string, fieldName = 'date'): ValidationError | null {
  const dateError = validateDate(date, fieldName)
  if (dateError) return dateError
  
  const inputDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (inputDate < today) {
    return createValidationError(fieldName, ScheduleErrorCodes.PAST_DATE_SCHEDULING, date)
  }
  
  return null
}

// Schedule creation validation
export interface ScheduleCreateData {
  staff_id: any
  schedule_date: string
  start_time: string
  end_time: string
  location?: string
  notes?: string
}

export function validateScheduleCreate(data: ScheduleCreateData): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Validate staff ID
  const staffIdError = validateStaffId(data.staff_id)
  if (staffIdError) errors.push(staffIdError)
  
  // Validate date
  const dateError = validateNotPastDate(data.schedule_date, 'schedule_date')
  if (dateError) errors.push(dateError)
  
  // Validate time range
  const timeRangeError = validateTimeRange(data.start_time, data.end_time)
  if (timeRangeError) errors.push(timeRangeError)
  
  // Validate location length if provided
  if (data.location && data.location.length > 255) {
    errors.push(createValidationError('location', ScheduleErrorCodes.INVALID_TIME_RANGE, 'Location must be less than 255 characters'))
  }
  
  // Validate notes length if provided
  if (data.notes && data.notes.length > 1000) {
    errors.push(createValidationError('notes', ScheduleErrorCodes.INVALID_TIME_RANGE, 'Notes must be less than 1000 characters'))
  }
  
  return errors
}

// Schedule update validation
export interface ScheduleUpdateData extends Partial<ScheduleCreateData> {
  id: string
}

export function validateScheduleUpdate(data: ScheduleUpdateData): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Validate ID
  if (!data.id) {
    errors.push(createValidationError('id', ScheduleErrorCodes.MISSING_REQUIRED_FIELDS))
  }
  
  // Validate staff ID if provided
  if (data.staff_id !== undefined) {
    const staffIdError = validateStaffId(data.staff_id)
    if (staffIdError) errors.push(staffIdError)
  }
  
  // Validate date if provided
  if (data.schedule_date) {
    const dateError = validateNotPastDate(data.schedule_date, 'schedule_date')
    if (dateError) errors.push(dateError)
  }
  
  // Validate time range if both times are provided
  if (data.start_time && data.end_time) {
    const timeRangeError = validateTimeRange(data.start_time, data.end_time)
    if (timeRangeError) errors.push(timeRangeError)
  } else if (data.start_time) {
    const startError = validateTime(data.start_time, 'start_time')
    if (startError) errors.push(startError)
  } else if (data.end_time) {
    const endError = validateTime(data.end_time, 'end_time')
    if (endError) errors.push(endError)
  }
  
  // Validate location length if provided
  if (data.location && data.location.length > 255) {
    errors.push(createValidationError('location', ScheduleErrorCodes.INVALID_TIME_RANGE, 'Location must be less than 255 characters'))
  }
  
  // Validate notes length if provided
  if (data.notes && data.notes.length > 1000) {
    errors.push(createValidationError('notes', ScheduleErrorCodes.INVALID_TIME_RANGE, 'Notes must be less than 1000 characters'))
  }
  
  return errors
}

// Query parameter validation
export interface ScheduleQueryParams {
  staff_id?: string | null
  start_date?: string
  end_date?: string
  view_mode?: string
}

export function validateScheduleQuery(params: ScheduleQueryParams): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Validate staff_id if provided
  if (params.staff_id) {
    const staffIdError = validateStaffId(params.staff_id)
    if (staffIdError) errors.push(staffIdError)
  }
  
  // Validate date range if provided
  if (params.start_date && params.end_date) {
    const dateRangeError = validateDateRange(params.start_date, params.end_date)
    if (dateRangeError) errors.push(dateRangeError)
  } else if (params.start_date) {
    const startError = validateDate(params.start_date, 'start_date')
    if (startError) errors.push(startError)
  } else if (params.end_date) {
    const endError = validateDate(params.end_date, 'end_date')
    if (endError) errors.push(endError)
  }
  
  // Validate view_mode if provided
  if (params.view_mode && !['personal', 'team'].includes(params.view_mode)) {
    errors.push(createValidationError('view_mode', ScheduleErrorCodes.INVALID_TIME_RANGE, 'View mode must be "personal" or "team"'))
  }
  
  return errors
}

// Utility function to check if validation passed
export function hasValidationErrors(errors: ValidationError[]): boolean {
  return errors.length > 0
}

// Utility function to get first error message
export function getFirstValidationError(errors: ValidationError[]): string | null {
  return errors.length > 0 ? errors[0].message : null
}

// Utility function to group errors by field
export function groupValidationErrorsByField(errors: ValidationError[]): Record<string, ValidationError[]> {
  return errors.reduce((acc, error) => {
    if (!acc[error.field]) {
      acc[error.field] = []
    }
    acc[error.field].push(error)
    return acc
  }, {} as Record<string, ValidationError[]>)
}