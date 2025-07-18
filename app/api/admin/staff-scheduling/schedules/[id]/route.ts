import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { 
  ScheduleErrorCodes, 
  createScheduleError, 
  getHttpStatusFromErrorCode 
} from '@/types/errors'
import { 
  authenticateStaffScheduleRequest, 
  logScheduleAudit, 
  checkRateLimit 
} from '@/lib/staff-schedule-auth'

// GET - Fetch single schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate admin user
    const authResult = await authenticateStaffScheduleRequest(request, true)
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: authResult.error.httpStatus || 403 })
    }

    const { data: schedule, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_schedules')
      .select(`
        *,
        staff:staff_id (
          id,
          staff_name
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching schedule:', error)
      return NextResponse.json({
        success: false,
        error: 'Schedule not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: schedule
    })

  } catch (error: any) {
    console.error('Admin schedule GET error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}

// PUT - Update schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate admin user
    const authResult = await authenticateStaffScheduleRequest(request, true)
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: authResult.error.httpStatus || 403 })
    }

    const body = await request.json()
    const { staff_id, schedule_date, start_time, end_time, location, notes } = body

    // Validate required fields
    if (!staff_id || !schedule_date || !start_time || !end_time) {
      return NextResponse.json({
        success: false,
        error: 'staff_id, schedule_date, start_time, and end_time are required'
      }, { status: 400 })
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid time format. Use HH:MM format'
      }, { status: 400 })
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(schedule_date)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD format'
      }, { status: 400 })
    }

    // Check for scheduling conflicts (excluding current schedule)
    const { data: hasConflict, error: conflictError } = await refacSupabaseAdmin
      .rpc('check_schedule_conflict', {
        p_staff_id: staff_id,
        p_schedule_date: schedule_date,
        p_start_time: start_time,
        p_end_time: end_time,
        p_exclude_schedule_id: params.id
      })

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError)
      return NextResponse.json({
        success: false,
        error: 'Failed to check for conflicts'
      }, { status: 500 })
    }

    if (hasConflict) {
      return NextResponse.json({
        success: false,
        error: 'Schedule conflict detected. Staff member already has a shift during this time.'
      }, { status: 409 })
    }

    // Update the schedule
    const { data: updatedSchedule, error: updateError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_schedules')
      .update({
        staff_id,
        schedule_date,
        start_time,
        end_time,
        location: location || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating schedule:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update schedule'
      }, { status: 500 })
    }

    // Log audit trail for schedule update
    await logScheduleAudit(
      request,
      authResult.user!.email,
      'UPDATE',
      params.id,
      {
        updated_data: {
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
      data: updatedSchedule
    })

  } catch (error: any) {
    console.error('Admin schedule PUT error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE - Delete schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate admin user
    const authResult = await authenticateStaffScheduleRequest(request, true)
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: authResult.error.httpStatus || 403 })
    }

    // Get schedule details before deletion for audit log
    const { data: scheduleToDelete, error: fetchError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_schedules')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      console.error('Error fetching schedule for deletion:', fetchError)
      return NextResponse.json({
        success: false,
        error: 'Schedule not found'
      }, { status: 404 })
    }

    // Delete the schedule
    const { error: deleteError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_schedules')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting schedule:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete schedule'
      }, { status: 500 })
    }

    // Log audit trail for schedule deletion
    await logScheduleAudit(
      request,
      authResult.user!.email,
      'DELETE',
      params.id,
      {
        deleted_schedule: scheduleToDelete
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    })

  } catch (error: any) {
    console.error('Admin schedule DELETE error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}