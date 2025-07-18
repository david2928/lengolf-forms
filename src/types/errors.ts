// Error handling types and utilities for staff scheduling system

export enum ScheduleErrorCodes {
  // Validation errors
  INVALID_DATE_FORMAT = 'INVALID_DATE_FORMAT',
  INVALID_TIME_FORMAT = 'INVALID_TIME_FORMAT',
  INVALID_STAFF_ID = 'INVALID_STAFF_ID',
  INVALID_TIME_RANGE = 'INVALID_TIME_RANGE',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  
  // Business logic errors
  SCHEDULE_CONFLICT = 'SCHEDULE_CONFLICT',
  STAFF_NOT_FOUND = 'STAFF_NOT_FOUND',
  SCHEDULE_NOT_FOUND = 'SCHEDULE_NOT_FOUND',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  PAST_DATE_SCHEDULING = 'PAST_DATE_SCHEDULING',
  
  // Authorization errors
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ScheduleError {
  code: ScheduleErrorCodes
  message: string
  details?: any
  field?: string
  timestamp: string
  path?: string
}

export interface ValidationError {
  field: string
  message: string
  value?: any
  code: ScheduleErrorCodes
}

export interface ApiErrorResponse {
  success: false
  error: ScheduleError
  validationErrors?: ValidationError[]
}

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

// Error message mappings
export const ERROR_MESSAGES: Record<ScheduleErrorCodes, string> = {
  [ScheduleErrorCodes.INVALID_DATE_FORMAT]: 'Invalid date format. Please use YYYY-MM-DD format.',
  [ScheduleErrorCodes.INVALID_TIME_FORMAT]: 'Invalid time format. Please use HH:MM format.',
  [ScheduleErrorCodes.INVALID_STAFF_ID]: 'Invalid staff ID. Please select a valid staff member.',
  [ScheduleErrorCodes.INVALID_TIME_RANGE]: 'Invalid time range. End time must be after start time.',
  [ScheduleErrorCodes.MISSING_REQUIRED_FIELDS]: 'Required fields are missing. Please fill in all required information.',
  
  [ScheduleErrorCodes.SCHEDULE_CONFLICT]: 'Schedule conflict detected. This staff member already has a shift during this time.',
  [ScheduleErrorCodes.STAFF_NOT_FOUND]: 'Staff member not found. Please select a valid staff member.',
  [ScheduleErrorCodes.SCHEDULE_NOT_FOUND]: 'Schedule not found. It may have been deleted or modified.',
  [ScheduleErrorCodes.INVALID_DATE_RANGE]: 'Invalid date range. Start date must be before end date.',
  [ScheduleErrorCodes.PAST_DATE_SCHEDULING]: 'Cannot schedule shifts in the past. Please select a future date.',
  
  [ScheduleErrorCodes.AUTHENTICATION_REQUIRED]: 'Authentication required. Please log in to continue.',
  [ScheduleErrorCodes.UNAUTHORIZED_ACCESS]: 'Access denied. Please log in to continue.',
  [ScheduleErrorCodes.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions. Admin access required.',
  [ScheduleErrorCodes.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [ScheduleErrorCodes.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait before trying again.',
  
  [ScheduleErrorCodes.DATABASE_ERROR]: 'Database error occurred. Please try again later.',
  [ScheduleErrorCodes.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [ScheduleErrorCodes.SERVER_ERROR]: 'Server error occurred. Please try again later.',
  [ScheduleErrorCodes.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  [ScheduleErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
}

// User-friendly error messages for display
export const USER_FRIENDLY_MESSAGES: Record<ScheduleErrorCodes, string> = {
  [ScheduleErrorCodes.INVALID_DATE_FORMAT]: 'Please enter a valid date.',
  [ScheduleErrorCodes.INVALID_TIME_FORMAT]: 'Please enter a valid time.',
  [ScheduleErrorCodes.INVALID_STAFF_ID]: 'Please select a staff member.',
  [ScheduleErrorCodes.INVALID_TIME_RANGE]: 'End time must be after start time.',
  [ScheduleErrorCodes.MISSING_REQUIRED_FIELDS]: 'Please fill in all required fields.',
  
  [ScheduleErrorCodes.SCHEDULE_CONFLICT]: 'This time slot is already booked. Please choose a different time.',
  [ScheduleErrorCodes.STAFF_NOT_FOUND]: 'Staff member not found. Please refresh and try again.',
  [ScheduleErrorCodes.SCHEDULE_NOT_FOUND]: 'Schedule not found. It may have been changed.',
  [ScheduleErrorCodes.INVALID_DATE_RANGE]: 'Please select a valid date range.',
  [ScheduleErrorCodes.PAST_DATE_SCHEDULING]: 'Cannot schedule shifts in the past.',
  
  [ScheduleErrorCodes.AUTHENTICATION_REQUIRED]: 'Please log in to continue.',
  [ScheduleErrorCodes.UNAUTHORIZED_ACCESS]: 'Please log in to continue.',
  [ScheduleErrorCodes.INSUFFICIENT_PERMISSIONS]: 'You don\'t have permission to perform this action.',
  [ScheduleErrorCodes.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [ScheduleErrorCodes.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment and try again.',
  
  [ScheduleErrorCodes.DATABASE_ERROR]: 'Something went wrong. Please try again.',
  [ScheduleErrorCodes.NETWORK_ERROR]: 'Connection problem. Please check your internet and try again.',
  [ScheduleErrorCodes.SERVER_ERROR]: 'Server is having issues. Please try again in a moment.',
  [ScheduleErrorCodes.TIMEOUT_ERROR]: 'Request took too long. Please try again.',
  [ScheduleErrorCodes.UNKNOWN_ERROR]: 'Something unexpected happened. Please try again.'
}

// Utility functions for error handling
export function createScheduleError(
  code: ScheduleErrorCodes,
  details?: any,
  field?: string,
  path?: string
): ScheduleError {
  return {
    code,
    message: ERROR_MESSAGES[code],
    details,
    field,
    timestamp: new Date().toISOString(),
    path
  }
}

export function createValidationError(
  field: string,
  code: ScheduleErrorCodes,
  value?: any
): ValidationError {
  return {
    field,
    message: ERROR_MESSAGES[code],
    value,
    code
  }
}

export function isScheduleError(error: any): error is ScheduleError {
  return error && typeof error === 'object' && 'code' in error && 'message' in error
}

export function getErrorMessage(error: ScheduleError, userFriendly = true): string {
  const messages = userFriendly ? USER_FRIENDLY_MESSAGES : ERROR_MESSAGES
  return messages[error.code] || messages[ScheduleErrorCodes.UNKNOWN_ERROR]
}

export function getHttpStatusFromErrorCode(code: ScheduleErrorCodes): number {
  switch (code) {
    case ScheduleErrorCodes.INVALID_DATE_FORMAT:
    case ScheduleErrorCodes.INVALID_TIME_FORMAT:
    case ScheduleErrorCodes.INVALID_STAFF_ID:
    case ScheduleErrorCodes.INVALID_TIME_RANGE:
    case ScheduleErrorCodes.MISSING_REQUIRED_FIELDS:
    case ScheduleErrorCodes.INVALID_DATE_RANGE:
    case ScheduleErrorCodes.PAST_DATE_SCHEDULING:
      return 400 // Bad Request
      
    case ScheduleErrorCodes.AUTHENTICATION_REQUIRED:
    case ScheduleErrorCodes.UNAUTHORIZED_ACCESS:
    case ScheduleErrorCodes.SESSION_EXPIRED:
      return 401 // Unauthorized
      
    case ScheduleErrorCodes.INSUFFICIENT_PERMISSIONS:
      return 403 // Forbidden
      
    case ScheduleErrorCodes.STAFF_NOT_FOUND:
    case ScheduleErrorCodes.SCHEDULE_NOT_FOUND:
      return 404 // Not Found
      
    case ScheduleErrorCodes.SCHEDULE_CONFLICT:
      return 409 // Conflict
      
    case ScheduleErrorCodes.RATE_LIMIT_EXCEEDED:
      return 429 // Too Many Requests
      
    case ScheduleErrorCodes.TIMEOUT_ERROR:
      return 408 // Request Timeout
      
    case ScheduleErrorCodes.DATABASE_ERROR:
    case ScheduleErrorCodes.SERVER_ERROR:
    case ScheduleErrorCodes.UNKNOWN_ERROR:
      return 500 // Internal Server Error
      
    case ScheduleErrorCodes.NETWORK_ERROR:
      return 503 // Service Unavailable
      
    default:
      return 500
  }
}