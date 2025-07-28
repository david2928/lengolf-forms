import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { 
  ScheduleErrorCodes, 
  createScheduleError, 
  getHttpStatusFromErrorCode,
  ApiResponse 
} from '@/types/errors'
import { validateScheduleQuery } from '@/lib/validation'

export const dynamic = 'force-dynamic';

import { 
  authenticateStaffScheduleRequest, 
  logScheduleAudit, 
  validateSessionTimeout,
  checkRateLimit 
} from '@/lib/staff-schedule-auth'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateStaffScheduleRequest(request, false)
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: authResult.error.httpStatus || 401 })
    }

    // Validate session timeout
    const sessionValid = await validateSessionTimeout(request)
    if (!sessionValid) {
      const sessionError = createScheduleError(
        ScheduleErrorCodes.SESSION_EXPIRED,
        { message: 'Session has expired' },
        undefined,
        request.url
      )
      
      return NextResponse.json({
        success: false,
        error: sessionError
      }, { status: 401 })
    }

    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimit = checkRateLimit(`staff-schedule-${clientIP}`, 60, 15 * 60 * 1000) // 60 requests per 15 minutes
    
    if (!rateLimit.allowed) {
      const rateLimitError = createScheduleError(
        ScheduleErrorCodes.RATE_LIMIT_EXCEEDED,
        { resetTime: rateLimit.resetTime },
        undefined,
        request.url
      )
      
      return NextResponse.json({
        success: false,
        error: rateLimitError
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      })
    }

    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const staffIdParam = searchParams.get('staff_id')
    const staffId = staffIdParam ? parseInt(staffIdParam) : null
    const startDate = searchParams.get('start_date') || new Date().toISOString().split('T')[0]
    const endDate = searchParams.get('end_date') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const viewMode = searchParams.get('view_mode') || 'personal'

    // Validate query parameters
    const validationErrors = validateScheduleQuery({
      staff_id: staffIdParam,
      start_date: startDate,
      end_date: endDate,
      view_mode: viewMode
    })

    if (validationErrors.length > 0) {
      const firstError = validationErrors[0]
      const scheduleError = createScheduleError(
        firstError.code,
        { validationErrors },
        firstError.field,
        request.url
      )
      
      return NextResponse.json({
        success: false,
        error: scheduleError,
        validationErrors
      }, { status: getHttpStatusFromErrorCode(firstError.code) })
    }

    // Call the database function to get schedules
    const { data: schedules, error: schedulesError } = await refacSupabaseAdmin
      .rpc('get_staff_schedule', {
        p_staff_id: staffId,
        p_start_date: startDate,
        p_end_date: endDate
      })

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError)
      const scheduleError = createScheduleError(
        ScheduleErrorCodes.DATABASE_ERROR,
        { databaseError: schedulesError },
        undefined,
        request.url
      )
      
      return NextResponse.json({
        success: false,
        error: scheduleError
      }, { status: getHttpStatusFromErrorCode(ScheduleErrorCodes.DATABASE_ERROR) })
    }

    // Get schedule indicators for the date picker
    const { data: indicators, error: indicatorsError } = await refacSupabaseAdmin
      .rpc('get_schedule_indicators', {
        p_staff_id: viewMode === 'personal' ? staffId : null,
        p_start_date: startDate,
        p_end_date: endDate
      })

    if (indicatorsError) {
      console.error('Error fetching indicators:', indicatorsError)
      // Don't fail the request if indicators fail, just log it and continue
    }

    // Log audit trail for schedule viewing
    await logScheduleAudit(
      request,
      authResult.user!.email,
      'VIEW',
      undefined,
      {
        filters: {
          staff_id: staffId,
          start_date: startDate,
          end_date: endDate,
          view_mode: viewMode
        },
        results_count: schedules?.length || 0
      }
    )

    // Format the response
    const response = {
      success: true,
      data: {
        schedules: schedules || [],
        indicators: indicators || [],
        filters: {
          staff_id: staffId,
          start_date: startDate,
          end_date: endDate,
          view_mode: viewMode
        },
        meta: {
          total_schedules: schedules?.length || 0,
          date_range_days: Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        }
      }
    }

    // Set cache headers for performance
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    })

  } catch (error: any) {
    console.error('Staff schedule API error:', error)
    
    const scheduleError = createScheduleError(
      ScheduleErrorCodes.SERVER_ERROR,
      { originalError: error },
      undefined,
      request.url
    )
    
    return NextResponse.json({
      success: false,
      error: scheduleError
    }, { status: getHttpStatusFromErrorCode(ScheduleErrorCodes.SERVER_ERROR) })
  }
}