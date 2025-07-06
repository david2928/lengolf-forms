/**
 * Centralized error handling and validation utilities for payroll system
 * Story #10: Error Handling & Validation
 */

export interface PayrollError {
  code: string
  message: string
  details?: string
  retryable?: boolean
  userMessage?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  exponentialBase: number
}

/**
 * Centralized error codes and messages
 */
export const PAYROLL_ERROR_CODES = {
  // Database errors
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  DATABASE_CONSTRAINT_VIOLATION: 'DATABASE_CONSTRAINT_VIOLATION',
  
  // Validation errors
  INVALID_MONTH_FORMAT: 'INVALID_MONTH_FORMAT',
  INVALID_TIME_FORMAT: 'INVALID_TIME_FORMAT',
  INVALID_AMOUNT_FORMAT: 'INVALID_AMOUNT_FORMAT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Business logic errors
  MISSING_COMPENSATION_SETTINGS: 'MISSING_COMPENSATION_SETTINGS',
  INVALID_TIME_ENTRY_LOGIC: 'INVALID_TIME_ENTRY_LOGIC',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  
  // Authorization errors
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // External service errors
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const

/**
 * User-friendly error messages
 */
export const getUserFriendlyMessage = (error: PayrollError): string => {
  const messages: Record<string, string> = {
    [PAYROLL_ERROR_CODES.DATABASE_CONNECTION_FAILED]: 
      'Unable to connect to the database. Please try again in a few moments.',
    [PAYROLL_ERROR_CODES.DATABASE_QUERY_FAILED]: 
      'Database operation failed. Please check your data and try again.',
    [PAYROLL_ERROR_CODES.INVALID_MONTH_FORMAT]: 
      'Invalid month format. Please use YYYY-MM format (e.g., 2024-06).',
    [PAYROLL_ERROR_CODES.INVALID_TIME_FORMAT]: 
      'Invalid time format. Please ensure times are in valid date-time format.',
    [PAYROLL_ERROR_CODES.INVALID_AMOUNT_FORMAT]: 
      'Invalid amount. Please enter a valid number greater than or equal to 0.',
    [PAYROLL_ERROR_CODES.MISSING_COMPENSATION_SETTINGS]: 
      'Missing compensation settings for one or more staff members. Please configure staff compensation in the Staff Settings tab.',
    [PAYROLL_ERROR_CODES.INVALID_TIME_ENTRY_LOGIC]: 
      'Invalid time entry: Clock-out time must be after clock-in time and within reasonable limits.',
    [PAYROLL_ERROR_CODES.INSUFFICIENT_DATA]: 
      'Insufficient data to perform payroll calculations. Please ensure all required information is available.',
    [PAYROLL_ERROR_CODES.UNAUTHORIZED_ACCESS]: 
      'You are not authorized to access this resource. Please sign in and try again.',
    [PAYROLL_ERROR_CODES.EXTERNAL_SERVICE_UNAVAILABLE]: 
      'External service is temporarily unavailable. Please try again later.'
  }
  
  return error.userMessage || messages[error.code] || error.message || 'An unexpected error occurred.'
}

/**
 * Create a standardized PayrollError
 */
export const createPayrollError = (
  code: string,
  message: string,
  details?: string,
  retryable: boolean = false,
  userMessage?: string
): PayrollError => ({
  code,
  message,
  details,
  retryable,
  userMessage
})

/**
 * Retry logic for database operations
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBase: 2
  }
): Promise<T> => {
  let lastError: Error
  
  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on non-retryable errors
      if (error instanceof Error && error.message.includes('UNAUTHORIZED')) {
        throw error
      }
      
      if (attempt === options.maxRetries) {
        throw createPayrollError(
          PAYROLL_ERROR_CODES.DATABASE_QUERY_FAILED,
          `Operation failed after ${options.maxRetries} attempts`,
          lastError.message,
          false,
          'Database operation failed. Please try again or contact support if the issue persists.'
        )
      }
      
      // Calculate exponential backoff delay
      const delay = Math.min(
        options.baseDelay * Math.pow(options.exponentialBase, attempt - 1),
        options.maxDelay
      )
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

/**
 * Enhanced validation for time entries
 */
export const validateTimeEntry = (data: {
  clock_in_time?: string
  clock_out_time?: string
  staff_id?: number
  notes?: string
}): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Validate clock-in time
  if (data.clock_in_time) {
    const clockIn = new Date(data.clock_in_time)
    if (isNaN(clockIn.getTime())) {
      errors.push('Invalid clock-in time format. Please use a valid date-time format.')
    } else {
      // Check if clock-in is in the future
      const now = new Date()
      if (clockIn > now) {
        warnings.push('Clock-in time is in the future. Please verify the date and time.')
      }
      
      // Check if clock-in is more than 30 days old
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
      if (clockIn < thirtyDaysAgo) {
        warnings.push('Clock-in time is more than 30 days old. Please verify the date.')
      }
    }
  }
  
  // Validate clock-out time
  if (data.clock_out_time) {
    const clockOut = new Date(data.clock_out_time)
    if (isNaN(clockOut.getTime())) {
      errors.push('Invalid clock-out time format. Please use a valid date-time format.')
    } else {
      // Check if clock-out is in the future
      const now = new Date()
      if (clockOut > now) {
        warnings.push('Clock-out time is in the future. Please verify the date and time.')
      }
    }
  }
  
  // Validate time logic
  if (data.clock_in_time && data.clock_out_time) {
    const clockIn = new Date(data.clock_in_time)
    const clockOut = new Date(data.clock_out_time)
    
    if (!isNaN(clockIn.getTime()) && !isNaN(clockOut.getTime())) {
      // Clock-out must be after clock-in
      if (clockOut <= clockIn) {
        errors.push('Clock-out time must be after clock-in time.')
      }
      
      // Check shift duration
      const durationMs = clockOut.getTime() - clockIn.getTime()
      const durationHours = durationMs / (1000 * 60 * 60)
      
      if (durationHours > 24) {
        errors.push('Shift duration cannot exceed 24 hours. Please verify the times.')
      } else if (durationHours > 16) {
        warnings.push('Shift duration exceeds 16 hours. Please verify this is correct.')
      } else if (durationHours < 0.25) {
        warnings.push('Shift duration is less than 15 minutes. Please verify this is correct.')
      }
    }
  }
  
  // Validate staff ID
  if (data.staff_id !== undefined && (!Number.isInteger(data.staff_id) || data.staff_id <= 0)) {
    errors.push('Invalid staff ID. Please select a valid staff member.')
  }
  
  // Validate notes length
  if (data.notes && data.notes.length > 500) {
    errors.push('Notes cannot exceed 500 characters.')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Enhanced validation for service charge
 */
export const validateServiceCharge = (data: {
  total_amount?: number | string
  eligible_staff_count?: number
}): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Validate amount
  if (data.total_amount !== undefined) {
    const amount = typeof data.total_amount === 'string' 
      ? parseFloat(data.total_amount) 
      : data.total_amount
    
    if (isNaN(amount)) {
      errors.push('Service charge amount must be a valid number.')
    } else if (amount < 0) {
      errors.push('Service charge amount cannot be negative.')
    } else if (amount > 1000000) {
      warnings.push('Service charge amount is unusually high. Please verify this is correct.')
    }
  }
  
  // Validate eligible staff count
  if (data.eligible_staff_count !== undefined) {
    if (!Number.isInteger(data.eligible_staff_count) || data.eligible_staff_count < 0) {
      errors.push('Eligible staff count must be a non-negative integer.')
    } else if (data.eligible_staff_count === 0) {
      warnings.push('No eligible staff members for service charge distribution.')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Enhanced validation for compensation settings
 */
export const validateCompensationSettings = (data: {
  base_salary?: number
  ot_rate_per_hour?: number
  holiday_rate_per_hour?: number
  effective_from?: string
  effective_to?: string
}): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Validate base salary
  if (data.base_salary !== undefined) {
    if (isNaN(data.base_salary) || data.base_salary < 0) {
      errors.push('Base salary must be a non-negative number.')
    } else if (data.base_salary > 200000) {
      warnings.push('Base salary is unusually high. Please verify this is correct.')
    }
  }
  
  // Validate OT rate
  if (data.ot_rate_per_hour !== undefined) {
    if (isNaN(data.ot_rate_per_hour) || data.ot_rate_per_hour < 0) {
      errors.push('Overtime rate must be a non-negative number.')
    } else if (data.ot_rate_per_hour > 1000) {
      warnings.push('Overtime rate is unusually high. Please verify this is correct.')
    }
  }
  
  // Validate holiday rate
  if (data.holiday_rate_per_hour !== undefined) {
    if (isNaN(data.holiday_rate_per_hour) || data.holiday_rate_per_hour < 0) {
      errors.push('Holiday rate must be a non-negative number.')
    } else if (data.holiday_rate_per_hour > 1000) {
      warnings.push('Holiday rate is unusually high. Please verify this is correct.')
    }
  }
  
  // Validate effective dates
  if (data.effective_from) {
    const effectiveFrom = new Date(data.effective_from)
    if (isNaN(effectiveFrom.getTime())) {
      errors.push('Invalid effective from date format.')
    }
    
    if (data.effective_to) {
      const effectiveTo = new Date(data.effective_to)
      if (isNaN(effectiveTo.getTime())) {
        errors.push('Invalid effective to date format.')
      } else if (effectiveTo <= effectiveFrom) {
        errors.push('Effective to date must be after effective from date.')
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Enhanced validation for month format
 */
export const validateMonthFormat = (month: string): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check basic format
  const monthRegex = /^\d{4}-\d{2}$/
  if (!monthRegex.test(month)) {
    errors.push('Invalid month format. Use YYYY-MM format (e.g., 2024-06).')
    return { isValid: false, errors, warnings }
  }
  
  // Parse and validate actual date
  const [year, monthPart] = month.split('-').map(Number)
  const monthDate = new Date(year, monthPart - 1, 1)
  
  if (monthDate.getFullYear() !== year || monthDate.getMonth() !== monthPart - 1) {
    errors.push('Invalid month. Please ensure the month is between 01 and 12.')
  }
  
  // Check if month is too far in the future
  const now = new Date()
  const currentMonth = now.getFullYear() * 12 + now.getMonth()
  const targetMonth = year * 12 + (monthPart - 1)
  
  if (targetMonth > currentMonth) {
    warnings.push('Selected month is in the future. Payroll calculations may be incomplete.')
  }
  
  // Check if month is too far in the past
  if (targetMonth < currentMonth - 24) {
    warnings.push('Selected month is more than 2 years old. Please verify this is correct.')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Check for missing compensation settings and provide helpful error messages
 */
export const validateCompensationCompleteness = (
  staffCompensation: Map<number, any>,
  allStaff: Array<{ id: number; staff_name: string; is_active: boolean }>
): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []
  
  const activeStaff = allStaff.filter(staff => staff.is_active)
  const missingCompensation = activeStaff.filter(staff => !staffCompensation.has(staff.id))
  
  if (missingCompensation.length > 0) {
    const names = missingCompensation.map(staff => staff.staff_name).join(', ')
    errors.push(
      `Missing compensation settings for ${missingCompensation.length} staff member(s): ${names}. ` +
      `Please configure their compensation in the Staff Settings tab before running payroll.`
    )
  }
  
  // Check for compensation settings with zero or very low values
  const lowCompensation = activeStaff.filter(staff => {
    const comp = staffCompensation.get(staff.id)
    return comp && (comp.base_salary === 0 || comp.base_salary < 10000)
  })
  
  if (lowCompensation.length > 0) {
    const names = lowCompensation.map(staff => staff.staff_name).join(', ')
    warnings.push(
      `Very low base salary detected for ${lowCompensation.length} staff member(s): ${names}. ` +
      `Please verify their compensation settings are correct.`
    )
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Enhanced error logging with context
 */
export const logPayrollError = (
  error: PayrollError,
  context: {
    operation: string
    userId?: string
    month?: string
    additionalData?: Record<string, any>
  }
): void => {
  console.error('Payroll Error:', {
    timestamp: new Date().toISOString(),
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      retryable: error.retryable
    },
    context
  })
} 