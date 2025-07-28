import { NextRequest, NextResponse } from 'next/server'
import { verifyStaffPin, recordTimeEntry, extractDeviceInfo } from '@/lib/staff-utils'
import { TimeClockPunchRequest, TimeClockPunchResponse } from '@/types/staff'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { DateTime } from 'luxon'

/**
 * POST /api/staff-schedule/time-clock - Handle time clock integration from scheduled shifts
 * Links time entries to scheduled shifts for compliance tracking
 * Public endpoint - no authentication required (PIN-based security)
 */
export async function POST(request: NextRequest) {
  const startTime = performance.now()
  
  try {
    // Parse request body
    const body: TimeClockPunchRequest & { schedule_id?: string } = await request.json()
    const { pin, photo_data, device_info, schedule_id } = body

    // Validate required fields
    if (!pin) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'PIN is required' 
        } as TimeClockPunchResponse,
        { status: 400 }
      )
    }

    // Verify PIN and get staff status
    const pinVerification = await verifyStaffPin(pin, device_info?.userAgent)
    
    if (!pinVerification.success) {
      return NextResponse.json(
        {
          success: false,
          message: pinVerification.message,
          is_locked: pinVerification.is_locked,
          lock_expires_at: pinVerification.lock_expires_at
        } as TimeClockPunchResponse,
        { status: 401 }
      )
    }

    // Determine action based on current status
    const action = pinVerification.currently_clocked_in ? 'clock_out' : 'clock_in'
    
    // Validate schedule if provided
    let scheduleData = null
    if (schedule_id) {
      const { data: schedule, error: scheduleError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff_schedules')
        .select('*')
        .eq('id', schedule_id)
        .eq('staff_id', pinVerification.staff_id!)
        .single()

      if (scheduleError) {
        console.warn('Schedule validation failed:', scheduleError)
        // Continue without schedule validation - don't block time clock
      } else {
        scheduleData = schedule
        
        // Validate time entry against scheduled shift times
        const currentTime = DateTime.now().setZone('Asia/Bangkok')
        const scheduleDate = DateTime.fromISO(schedule.schedule_date).setZone('Asia/Bangkok')
        const startTime = DateTime.fromFormat(schedule.start_time, 'HH:mm').setZone('Asia/Bangkok')
        const endTime = DateTime.fromFormat(schedule.end_time, 'HH:mm').setZone('Asia/Bangkok')
        
        // Set full datetime for schedule times
        const scheduleStart = scheduleDate.set({ 
          hour: startTime.hour, 
          minute: startTime.minute, 
          second: 0 
        })
        const scheduleEnd = scheduleDate.set({ 
          hour: endTime.hour, 
          minute: endTime.minute, 
          second: 0 
        })
        
        // Allow clock in up to 15 minutes early and clock out up to 30 minutes late
        const earlyClockInWindow = scheduleStart.minus({ minutes: 15 })
        const lateClockOutWindow = scheduleEnd.plus({ minutes: 30 })
        
        // Validate timing for clock in
        if (action === 'clock_in') {
          if (currentTime < earlyClockInWindow) {
            return NextResponse.json(
              {
                success: false,
                message: `Too early to clock in. Shift starts at ${scheduleStart.toFormat('h:mm a')}. You can clock in starting at ${earlyClockInWindow.toFormat('h:mm a')}.`
              } as TimeClockPunchResponse,
              { status:400 }
            )
          }
          if (currentTime > scheduleEnd) {
            return NextResponse.json(
              {
                success: false,
                message: `Shift has already ended at ${scheduleEnd.toFormat('h:mm a')}. Please contact your supervisor.`
              } as TimeClockPunchResponse,
              { status: 400 }
            )
          }
        }
        
        // Validate timing for clock out
        if (action === 'clock_out') {
          if (currentTime > lateClockOutWindow) {
            return NextResponse.json(
              {
                success: false,
                message: `Too late to clock out normally. Please contact your supervisor for manual time entry.`
              } as TimeClockPunchResponse,
              { status: 400 }
            )
          }
        }
      }
    }

    // Extract device information
    const deviceData = extractDeviceInfo(request.headers)
    const combinedDeviceInfo = {
      ...deviceData,
      ...device_info,
      schedule_integration: true,
      schedule_id: schedule_id || null
    }

    // Record time entry
    const timeEntry = await recordTimeEntry(
      pinVerification.staff_id!,
      action,
      undefined, // photo_url - will be updated if photo provided
      false, // photo_captured - no photo capture in schedule integration
      undefined, // camera_error
      combinedDeviceInfo
    )

    // If schedule is linked, update the time entry with schedule reference
    if (scheduleData && timeEntry.entry_id) {
      try {
        await refacSupabaseAdmin
          .schema('backoffice')
          .from('time_entries')
          .update({
            device_info: {
              ...combinedDeviceInfo,
              linked_schedule: {
                schedule_id: scheduleData.id,
                schedule_date: scheduleData.schedule_date,
                start_time: scheduleData.start_time,
                end_time: scheduleData.end_time,
                location: scheduleData.location
              }
            }
          })
          .eq('id', timeEntry.entry_id)
      } catch (error) {
        console.warn('Failed to link time entry to schedule:', error)
        // Don't fail the request if linking fails
      }
    }

    const responseTime = performance.now() - startTime

    return NextResponse.json({
      success: true,
      staff_id: pinVerification.staff_id,
      staff_name: pinVerification.staff_name,
      action: action,
      timestamp: timeEntry.timestamp,
      message: `Successfully ${action === 'clock_in' ? 'clocked in' : 'clocked out'}${scheduleData ? ' for scheduled shift' : ''}`,
      currently_clocked_in: action === 'clock_in',
      photo_captured: false,
      entry_id: timeEntry.entry_id,
      schedule_linked: !!scheduleData,
      response_time_ms: Math.round(responseTime)
    } as TimeClockPunchResponse & { 
      schedule_linked?: boolean
      response_time_ms?: number 
    })

  } catch (error) {
    const responseTime = performance.now() - startTime
    
    console.error('Error in staff schedule time clock API:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'System error. Please try again or use the main time clock.'
      } as TimeClockPunchResponse,
      { status: 500 }
    )
  }
}

/**
 * GET /api/staff-schedule/time-clock - Get time clock status for schedule integration
 * Returns current system status and any schedule-specific information
 */
export async function GET(request: NextRequest) {
  try {
    const currentTime = DateTime.now().setZone('Asia/Bangkok')
    
    return NextResponse.json({
      status: 'operational',
      message: 'Schedule time clock integration is ready',
      server_time: currentTime.toISO(),
      server_time_display: currentTime.toFormat('MMM dd, yyyy h:mm a'),
      timezone: 'Asia/Bangkok'
    })
  } catch (error) {
    console.error('Error in GET /api/staff-schedule/time-clock:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}