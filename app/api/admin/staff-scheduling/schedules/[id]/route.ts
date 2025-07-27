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
    const { staff_id, schedule_date, start_time, end_time, location, notes, editType } = body

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

    // Get the current schedule to check if it's recurring
    const { data: currentSchedule, error: fetchError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_schedules')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      console.error('Error fetching current schedule:', fetchError)
      return NextResponse.json({
        success: false,
        error: 'Schedule not found'
      }, { status: 404 })
    }

    // Handle recurring schedule edits
    if (currentSchedule.is_recurring && currentSchedule.recurring_group_id) {
      if (editType === 'series') {
        // Update all schedules in the recurring series
        // Only update future occurrences (including today)
        const today = new Date().toISOString().split('T')[0]
        
        // Check for conflicts for all schedules in the series
        const { data: seriesSchedules, error: seriesError } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('staff_schedules')
          .select('*')
          .eq('recurring_group_id', currentSchedule.recurring_group_id)
          .gte('schedule_date', today)

        if (seriesError) {
          console.error('Error fetching series schedules:', seriesError)
          return NextResponse.json({
            success: false,
            error: 'Failed to fetch recurring series'
          }, { status: 500 })
        }

        // Check for conflicts for each schedule in the series (excluding themselves)
        for (const schedule of seriesSchedules) {
          const { data: hasConflict, error: conflictError } = await refacSupabaseAdmin
            .rpc('check_schedule_conflict', {
              p_staff_id: staff_id,
              p_schedule_date: schedule.schedule_date,
              p_start_time: start_time,
              p_end_time: end_time,
              p_exclude_schedule_id: schedule.id
            })

          if (conflictError) {
            console.error('Error checking conflicts for series:', conflictError)
            return NextResponse.json({
              success: false,
              error: 'Failed to check for conflicts'
            }, { status: 500 })
          }

          if (hasConflict) {
            return NextResponse.json({
              success: false,
              error: `Schedule conflict detected for ${schedule.schedule_date}. Staff member already has a shift during this time.`
            }, { status: 409 })
          }
        }

        // Update all schedules in the recurring series (future occurrences only)
        const { data: updatedSchedules, error: updateError } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('staff_schedules')
          .update({
            staff_id,
            start_time,
            end_time,
            location: location || null,
            notes: notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('recurring_group_id', currentSchedule.recurring_group_id)
          .gte('schedule_date', today)
          .select()

        if (updateError) {
          console.error('Error updating recurring series:', updateError)
          return NextResponse.json({
            success: false,
            error: 'Failed to update recurring series'
          }, { status: 500 })
        }

        // Log audit trail for series update
        await logScheduleAudit(
          request,
          authResult.user!.email,
          'UPDATE_SERIES',
          currentSchedule.recurring_group_id,
          {
            updated_data: {
              staff_id,
              start_time,
              end_time,
              location,
              notes
            },
            schedules_updated: updatedSchedules.length
          }
        )

        return NextResponse.json({
          success: true,
          data: {
            schedules_updated: updatedSchedules.length,
            message: `Updated ${updatedSchedules.length} schedules in the recurring series`
          }
        })

      } else if (editType === 'single') {
        // For single edit, remove from recurring group and update as individual schedule
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

        // Update single schedule and remove from recurring group
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
            is_recurring: false,
            recurring_group_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', params.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating single schedule:', updateError)
          return NextResponse.json({
            success: false,
            error: 'Failed to update schedule'
          }, { status: 500 })
        }

        // Log audit trail for single update
        await logScheduleAudit(
          request,
          authResult.user!.email,
          'UPDATE_SINGLE',
          params.id,
          {
            updated_data: {
              staff_id,
              schedule_date,
              start_time,
              end_time,
              location,
              notes
            },
            removed_from_recurring: true,
            original_recurring_group_id: currentSchedule.recurring_group_id
          }
        )

        return NextResponse.json({
          success: true,
          data: updatedSchedule
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'editType must be "single" or "series" for recurring schedules'
        }, { status: 400 })
      }
    } else {
      // Non-recurring schedule - normal update
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
    }



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
    // Debug logging
    console.log('DELETE request received for schedule ID:', params.id)
    
    // Authenticate admin user
    const authResult = await authenticateStaffScheduleRequest(request, true)
    if (!authResult.success) {
      console.log('Authentication failed:', authResult.error)
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: authResult.error.httpStatus || 403 })
    }

    // Parse request body to check for deleteType
    let deleteType = 'single'
    try {
      const body = await request.json()
      deleteType = body.deleteType || 'single'
    } catch {
      // If no body or invalid JSON, default to single
      deleteType = 'single'
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.id)) {
      console.error('Invalid UUID format:', params.id)
      return NextResponse.json({
        success: false,
        error: 'Invalid schedule ID format'
      }, { status: 400 })
    }

    // Get schedule details before deletion for audit log
    const { data: scheduleToDelete, error: fetchError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_schedules')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      console.error('Error fetching schedule for deletion:', {
        error: fetchError,
        scheduleId: params.id,
        errorCode: fetchError.code,
        errorMessage: fetchError.message
      })
      
      // More specific error handling
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Schedule not found'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Database error while fetching schedule'
      }, { status: 500 })
    }

    console.log('Schedule found for deletion:', {
      id: scheduleToDelete.id,
      staff_id: scheduleToDelete.staff_id,
      schedule_date: scheduleToDelete.schedule_date,
      start_time: scheduleToDelete.start_time,
      end_time: scheduleToDelete.end_time,
      is_recurring: scheduleToDelete.is_recurring,
      recurring_group_id: scheduleToDelete.recurring_group_id
    })

    // Handle recurring schedule deletions
    if (scheduleToDelete.is_recurring && scheduleToDelete.recurring_group_id && deleteType === 'series') {
      // Delete all schedules in the recurring series (future occurrences only)
      const today = new Date().toISOString().split('T')[0]
      
      const { data: deletedSchedules, error: deleteError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff_schedules')
        .delete()
        .eq('recurring_group_id', scheduleToDelete.recurring_group_id)
        .gte('schedule_date', today)
        .select()

      if (deleteError) {
        console.error('Error deleting recurring series:', {
          error: deleteError,
          recurringGroupId: scheduleToDelete.recurring_group_id,
          errorCode: deleteError.code,
          errorMessage: deleteError.message
        })
        return NextResponse.json({
          success: false,
          error: 'Failed to delete recurring series'
        }, { status: 500 })
      }

      console.log('Recurring series deleted successfully:', deletedSchedules.length, 'schedules')

      // Log audit trail for series deletion
      try {
        await logScheduleAudit(
          request,
          authResult.user!.email,
          'DELETE_SERIES',
          scheduleToDelete.recurring_group_id,
          {
            deleted_schedules: deletedSchedules,
            schedules_deleted: deletedSchedules.length
          }
        )
      } catch (auditError) {
        console.error('Audit logging failed (non-critical):', auditError)
        // Don't fail the deletion if audit logging fails
      }

      return NextResponse.json({
        success: true,
        data: {
          schedules_deleted: deletedSchedules.length,
          message: `Deleted ${deletedSchedules.length} schedules from the recurring series`
        }
      })

    } else {
      // Delete single schedule (or single from recurring series)
      const { error: deleteError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff_schedules')
        .delete()
        .eq('id', params.id)

      if (deleteError) {
        console.error('Error deleting schedule:', {
          error: deleteError,
          scheduleId: params.id,
          errorCode: deleteError.code,
          errorMessage: deleteError.message
        })
        return NextResponse.json({
          success: false,
          error: 'Failed to delete schedule'
        }, { status: 500 })
      }

      console.log('Schedule deleted successfully:', params.id)

      // Log audit trail for schedule deletion
      try {
        await logScheduleAudit(
          request,
          authResult.user!.email,
          scheduleToDelete.is_recurring ? 'DELETE_SINGLE_FROM_SERIES' : 'DELETE',
          params.id,
          {
            deleted_schedule: scheduleToDelete
          }
        )
      } catch (auditError) {
        console.error('Audit logging failed (non-critical):', auditError)
        // Don't fail the deletion if audit logging fails
      }

      return NextResponse.json({
        success: true,
        message: 'Schedule deleted successfully'
      })
    }

  } catch (error: any) {
    console.error('Admin schedule DELETE error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}