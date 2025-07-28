import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { 
  ScheduleErrorCodes, 
  createScheduleError, 
  getHttpStatusFromErrorCode 
} from '@/types/errors'
import { validateScheduleQuery, validateScheduleCreate } from '@/lib/validation'
import { 
  authenticateStaffScheduleRequest, 
  logScheduleAudit, 
  validateSessionTimeout,
  checkRateLimit 
} from '@/lib/staff-schedule-auth'

// GET - Fetch schedules with filtering
export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const authResult = await authenticateStaffScheduleRequest(request, true)
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: authResult.error.httpStatus || 403 })
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

    // Rate limiting for admin operations
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimit = checkRateLimit(`admin-schedule-${clientIP}`, 120, 15 * 60 * 1000) // 120 requests per 15 minutes
    
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
    const staffId = searchParams.get('staff_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Validate query parameters
    const validationErrors = validateScheduleQuery({
      staff_id: staffId,
      start_date: startDate || '',
      end_date: endDate || ''
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

    // Fetch schedules using the database function
    const { data: schedules, error: schedulesError } = await refacSupabaseAdmin
      .rpc('get_staff_schedule', {
        p_staff_id: staffId ? parseInt(staffId) : null,
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

    // Log audit trail for admin schedule viewing
    await logScheduleAudit(
      request,
      authResult.user!.email,
      'ADMIN_VIEW',
      undefined,
      {
        filters: {
          staff_id: staffId,
          start_date: startDate,
          end_date: endDate
        },
        results_count: schedules?.length || 0
      }
    )

    return NextResponse.json({
      success: true,
      data: schedules || []
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    })

  } catch (error: any) {
    console.error('Admin schedules GET error:', error)
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

// POST - Create new schedule
export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const authResult = await authenticateStaffScheduleRequest(request, true)
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: authResult.error.httpStatus || 403 })
    }

    // Rate limiting for admin operations
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimit = checkRateLimit(`admin-create-${clientIP}`, 30, 15 * 60 * 1000) // 30 creates per 15 minutes
    
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

    const body = await request.json()
    const { staff_id, schedule_date, start_time, end_time, location, notes } = body

    // Validate schedule data
    const validationErrors = validateScheduleCreate({
      staff_id,
      schedule_date,
      start_time,
      end_time,
      location,
      notes
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

    // Check for scheduling conflicts
    const { data: hasConflict, error: conflictError } = await refacSupabaseAdmin
      .rpc('check_schedule_conflict', {
        p_staff_id: staff_id,
        p_schedule_date: schedule_date,
        p_start_time: start_time,
        p_end_time: end_time
      })

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError)
      const scheduleError = createScheduleError(
        ScheduleErrorCodes.DATABASE_ERROR,
        { databaseError: conflictError },
        undefined,
        request.url
      )
      
      return NextResponse.json({
        success: false,
        error: scheduleError
      }, { status: getHttpStatusFromErrorCode(ScheduleErrorCodes.DATABASE_ERROR) })
    }

    if (hasConflict) {
      const conflictError = createScheduleError(
        ScheduleErrorCodes.SCHEDULE_CONFLICT,
        { staff_id, schedule_date, start_time, end_time },
        undefined,
        request.url
      )
      
      return NextResponse.json({
        success: false,
        error: conflictError
      }, { status: getHttpStatusFromErrorCode(ScheduleErrorCodes.SCHEDULE_CONFLICT) })
    }

    // Create the schedule
    const { data: newSchedule, error: insertError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_schedules')
      .insert({
        staff_id,
        schedule_date,
        start_time,
        end_time,
        location: location || null,
        notes: notes || null,
        created_by: authResult.user!.email
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating schedule:', insertError)
      const scheduleError = createScheduleError(
        ScheduleErrorCodes.DATABASE_ERROR,
        { databaseError: insertError },
        undefined,
        request.url
      )
      
      return NextResponse.json({
        success: false,
        error: scheduleError
      }, { status: getHttpStatusFromErrorCode(ScheduleErrorCodes.DATABASE_ERROR) })
    }

    // Log audit trail for schedule creation
    await logScheduleAudit(
      request,
      authResult.user!.email,
      'CREATE',
      newSchedule.id,
      {
        schedule_data: {
          staff_id,
          schedule_date,
          start_time,
          end_time,
          location,
          notes
        }
      }
    )

    return NextResponse.json({
      success: true,
      data: newSchedule
    }, { 
      status: 201,
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    })

  } catch (error: any) {
    console.error('Admin schedules POST error:', error)
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