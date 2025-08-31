// Server-side validation utilities for API endpoints

import { NextRequest, NextResponse } from 'next/server'
import { 
  ScheduleError, 
  ScheduleErrorCodes, 
  ValidationError,
  createScheduleError,
  createValidationError,
  getHttpStatusFromErrorCode,
  ApiErrorResponse
} from '@/types/errors'
import {
  validateScheduleCreate,
  validateScheduleUpdate,
  validateScheduleQuery,
  ScheduleCreateData,
  ScheduleUpdateData,
  ScheduleQueryParams
} from '@/lib/validation'
import {
  validateScheduleComprehensive,
  detectScheduleConflict,
  canDeleteSchedule,
  canModifySchedule,
  ExistingSchedule,
  ScheduleValidationOptions
} from '@/lib/staff-schedule-validation'

// Middleware function type
export type ValidationMiddleware = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse | null>

// Create error response
export function createErrorResponse(error: ScheduleError): NextResponse {
  const status = getHttpStatusFromErrorCode(error.code)
  
  const response: ApiErrorResponse = {
    success: false,
    error
  }
  
  return NextResponse.json(response, { status })
}

// Create validation error response
export function createValidationErrorResponse(
  errors: ValidationError[],
  message = 'Validation failed'
): NextResponse {
  const response: ApiErrorResponse = {
    success: false,
    error: createScheduleError(
      ScheduleErrorCodes.MISSING_REQUIRED_FIELDS,
      { validationErrors: errors },
      undefined,
      'validation'
    ),
    validationErrors: errors
  }
  
  return NextResponse.json(response, { status: 400 })
}

// Parse and validate JSON body
export async function parseAndValidateBody<T>(
  request: NextRequest,
  validator: (data: any) => ValidationError[]
): Promise<{ data: T; errors: ValidationError[] }> {
  let body: any
  
  try {
    body = await request.json()
  } catch (error) {
    return {
      data: {} as T,
      errors: [createValidationError('body', ScheduleErrorCodes.INVALID_DATE_FORMAT, 'Invalid JSON format')]
    }
  }
  
  const errors = validator(body)
  return { data: body as T, errors }
}

// Validate query parameters
export function validateQueryParams(
  request: NextRequest
): { params: ScheduleQueryParams; errors: ValidationError[] } {
  const { searchParams } = new URL(request.url)
  
  const params: ScheduleQueryParams = {
    staff_id: searchParams.get('staff_id'),
    start_date: searchParams.get('start_date') || undefined,
    end_date: searchParams.get('end_date') || undefined,
    view_mode: searchParams.get('view_mode') || undefined
  }
  
  const errors = validateScheduleQuery(params)
  return { params, errors }
}

// Authentication middleware
export function requireAuth(): ValidationMiddleware {
  return async (request: NextRequest) => {
    // Check for authentication header or session
    const authHeader = request.headers.get('authorization')
    const sessionCookie = request.cookies.get('session')
    
    if (!authHeader && !sessionCookie) {
      return createErrorResponse(
        createScheduleError(ScheduleErrorCodes.AUTHENTICATION_REQUIRED)
      )
    }
    
    // TODO: Validate session/token
    // For now, assume authentication is valid
    return null
  }
}

// Admin authorization middleware
export function requireAdmin(): ValidationMiddleware {
  return async (request: NextRequest) => {
    // Check authentication first
    const authCheck = await requireAuth()(request)
    if (authCheck) return authCheck
    
    // TODO: Check if user has admin privileges
    // For now, assume admin check passes
    return null
  }
}

// Rate limiting middleware
export function rateLimit(maxRequests = 100, windowMs = 60000): ValidationMiddleware {
  const requests = new Map<string, { count: number; resetTime: number }>()
  
  return async (request: NextRequest) => {
    const clientId = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const now = Date.now()
    
    const clientData = requests.get(clientId)
    
    if (!clientData || now > clientData.resetTime) {
      requests.set(clientId, { count: 1, resetTime: now + windowMs })
      return null
    }
    
    if (clientData.count >= maxRequests) {
      return createErrorResponse(
        createScheduleError(ScheduleErrorCodes.RATE_LIMIT_EXCEEDED)
      )
    }
    
    clientData.count++
    return null
  }
}

// Schedule creation validation middleware
export function validateScheduleCreation(
  getExistingSchedules: (data: ScheduleCreateData) => Promise<ExistingSchedule[]>,
  options: ScheduleValidationOptions = {}
): ValidationMiddleware {
  return async (request: NextRequest) => {
    const { data, errors } = await parseAndValidateBody<ScheduleCreateData>(
      request,
      validateScheduleCreate
    )
    
    if (errors.length > 0) {
      return createValidationErrorResponse(errors)
    }
    
    // Comprehensive validation
    const comprehensiveErrors = validateScheduleComprehensive(data, options)
    if (comprehensiveErrors.length > 0) {
      return createValidationErrorResponse(comprehensiveErrors)
    }
    
    // Conflict detection
    try {
      const existingSchedules = await getExistingSchedules(data)
      const conflictError = detectScheduleConflict(data, existingSchedules)
      
      if (conflictError) {
        return createErrorResponse(conflictError)
      }
    } catch (error) {
      return createErrorResponse(
        createScheduleError(ScheduleErrorCodes.DATABASE_ERROR, { originalError: error })
      )
    }
    
    return null
  }
}

// Schedule update validation middleware
export function validateScheduleUpdateMiddleware(
  getExistingSchedules: (data: ScheduleUpdateData) => Promise<ExistingSchedule[]>,
  options: ScheduleValidationOptions = {}
): ValidationMiddleware {
  return async (request: NextRequest, context: { params: { id: string } }) => {
    const { data, errors } = await parseAndValidateBody<ScheduleUpdateData>(
      request,
      (body) => validateScheduleUpdate({ ...body, id: context.params.id })
    )
    
    if (errors.length > 0) {
      return createValidationErrorResponse(errors)
    }
    
    // Check if schedule can be modified
    if (data.schedule_date) {
      const { canModify, reason } = canModifySchedule(data.schedule_date)
      if (!canModify) {
        return createErrorResponse(
          createScheduleError(ScheduleErrorCodes.PAST_DATE_SCHEDULING, { reason })
        )
      }
    }
    
    // Comprehensive validation
    const comprehensiveErrors = validateScheduleComprehensive(data, options)
    if (comprehensiveErrors.length > 0) {
      return createValidationErrorResponse(comprehensiveErrors)
    }
    
    // Conflict detection
    try {
      const existingSchedules = await getExistingSchedules(data)
      const conflictError = detectScheduleConflict(data, existingSchedules, data.id)
      
      if (conflictError) {
        return createErrorResponse(conflictError)
      }
    } catch (error) {
      return createErrorResponse(
        createScheduleError(ScheduleErrorCodes.DATABASE_ERROR, { originalError: error })
      )
    }
    
    return null
  }
}

// Schedule deletion validation middleware
export function validateScheduleDeletion(): ValidationMiddleware {
  return async (request: NextRequest, context: { params: { id: string }; schedule?: any }) => {
    if (!context.schedule) {
      return createErrorResponse(
        createScheduleError(ScheduleErrorCodes.SCHEDULE_NOT_FOUND)
      )
    }
    
    const { canDelete, reason } = canDeleteSchedule(context.schedule.schedule_date)
    if (!canDelete) {
      return createErrorResponse(
        createScheduleError(ScheduleErrorCodes.PAST_DATE_SCHEDULING, { reason })
      )
    }
    
    return null
  }
}

// Query parameter validation middleware
export function validateQueryParameters(): ValidationMiddleware {
  return async (request: NextRequest) => {
    const { errors } = validateQueryParams(request)
    
    if (errors.length > 0) {
      return createValidationErrorResponse(errors)
    }
    
    return null
  }
}

// Compose multiple middleware functions
export function composeMiddleware(...middlewares: ValidationMiddleware[]): ValidationMiddleware {
  return async (request: NextRequest, context?: any) => {
    for (const middleware of middlewares) {
      const result = await middleware(request, context)
      if (result) {
        return result
      }
    }
    return null
  }
}

// Error handling wrapper for API routes
export function withErrorHandling(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error: any) {
      console.error('API Error:', error)
      
      // Handle known schedule errors
      if (error && typeof error === 'object' && 'code' in error) {
        return createErrorResponse(error as ScheduleError)
      }
      
      // Handle database errors
      if (error?.code === 'PGRST116' || error?.message?.includes('duplicate key')) {
        return createErrorResponse(
          createScheduleError(ScheduleErrorCodes.SCHEDULE_CONFLICT, { originalError: error })
        )
      }
      
      // Handle network/timeout errors
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
        return createErrorResponse(
          createScheduleError(ScheduleErrorCodes.DATABASE_ERROR, { originalError: error })
        )
      }
      
      // Generic server error
      return createErrorResponse(
        createScheduleError(ScheduleErrorCodes.SERVER_ERROR, { originalError: error })
      )
    }
  }
}

// Validation helper for bulk operations
export function validateBulkScheduleCreation(
  getExistingSchedules: (data: ScheduleCreateData[]) => Promise<ExistingSchedule[]>,
  options: ScheduleValidationOptions = {}
): ValidationMiddleware {
  return async (request: NextRequest) => {
    const { data, errors } = await parseAndValidateBody<{ schedules: ScheduleCreateData[] }>(
      request,
      (body) => {
        if (!body.schedules || !Array.isArray(body.schedules)) {
          return [createValidationError('schedules', ScheduleErrorCodes.MISSING_REQUIRED_FIELDS)]
        }
        
        const allErrors: ValidationError[] = []
        body.schedules.forEach((schedule: ScheduleCreateData, index: number) => {
          const scheduleErrors = validateScheduleCreate(schedule)
          scheduleErrors.forEach(error => {
            allErrors.push({
              ...error,
              field: `schedules[${index}].${error.field}`
            })
          })
        })
        
        return allErrors
      }
    )
    
    if (errors.length > 0) {
      return createValidationErrorResponse(errors)
    }
    
    // Validate each schedule comprehensively
    const allErrors: ValidationError[] = []
    data.schedules.forEach((schedule, index) => {
      const scheduleErrors = validateScheduleComprehensive(schedule, options)
      scheduleErrors.forEach(error => {
        allErrors.push({
          ...error,
          field: `schedules[${index}].${error.field}`
        })
      })
    })
    
    if (allErrors.length > 0) {
      return createValidationErrorResponse(allErrors)
    }
    
    // Check for conflicts
    try {
      const existingSchedules = await getExistingSchedules(data.schedules)
      
      for (let i = 0; i < data.schedules.length; i++) {
        const schedule = data.schedules[i]
        const conflictError = detectScheduleConflict(schedule, existingSchedules)
        
        if (conflictError) {
          return createErrorResponse({
            ...conflictError,
            details: {
              ...conflictError.details,
              scheduleIndex: i
            }
          })
        }
      }
    } catch (error) {
      return createErrorResponse(
        createScheduleError(ScheduleErrorCodes.DATABASE_ERROR, { originalError: error })
      )
    }
    
    return null
  }
}

// Utility to extract validation context from request
export function getValidationContext(request: NextRequest) {
  return {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString()
  }
}