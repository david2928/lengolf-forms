/**
 * Time Clock Integration Utilities
 * Provides seamless integration between staff scheduling and time clock systems
 */

import { refacSupabaseAdmin } from './refac-supabase'
import { verifyStaffPin, recordTimeEntry } from './staff-utils'
import { DateTime } from 'luxon'

export interface ScheduleTimeClockData {
  schedule_id: string
  staff_id: number
  schedule_date: string
  start_time: string
  end_time: string
  location: string
}

export interface TimeClockResponse {
  success: boolean
  message: string
  staff_id?: number
  staff_name?: string
  action?: 'clock_in' | 'clock_out'
  timestamp?: string
  currently_clocked_in?: boolean
  schedule_linked?: boolean
  entry_id?: number
}

/**
 * Clock in/out from scheduled shift with validation
 */
export async function clockInOutFromSchedule(
  pin: string,
  scheduleId: string,
  deviceInfo?: any
): Promise<TimeClockResponse> {
  try {
    // Verify PIN first
    const pinVerification = await verifyStaffPin(pin, deviceInfo?.userAgent)
    
    if (!pinVerification.success) {
      return {
        success: false,
        message: pinVerification.message,
        currently_clocked_in: pinVerification.currently_clocked_in
      }
    }

    // Get schedule details
    const { data: schedule, error: scheduleError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_schedules')
      .select('*')
      .eq('id', scheduleId)
      .eq('staff_id', pinVerification.staff_id!)
      .single()

    if (scheduleError || !schedule) {
      return {
        success: false,
        message: 'Schedule not found or access denied'
      }
    }

    // Validate timing
    const validationResult = validateScheduleTiming(schedule)
    if (!validationResult.valid) {
      return {
        success: false,
        message: validationResult.message
      }
    }

    // Determine action
    const action = pinVerification.currently_clocked_in ? 'clock_out' : 'clock_in'

    // Record time entry with schedule link
    const timeEntry = await recordTimeEntry(
      pinVerification.staff_id!,
      action,
      undefined, // photo_url
      false, // photo_captured
      undefined, // camera_error
      {
        ...deviceInfo,
        schedule_integration: true,
        schedule_id: scheduleId,
        linked_schedule: {
          schedule_id: schedule.id,
          schedule_date: schedule.schedule_date,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          location: schedule.location
        }
      }
    )

    return {
      success: true,
      staff_id: pinVerification.staff_id,
      staff_name: pinVerification.staff_name,
      action: action,
      timestamp: timeEntry.timestamp,
      message: `Successfully ${action === 'clock_in' ? 'clocked in' : 'clocked out'} for scheduled shift`,
      currently_clocked_in: action === 'clock_in',
      schedule_linked: true,
      entry_id: timeEntry.entry_id
    }

  } catch (error) {
    console.error('Time clock integration error:', error)
    return {
      success: false,
      message: 'System error. Please try again or use the main time clock.'
    }
  }
}

/**
 * Validate if current time is appropriate for schedule-based clock in/out
 */
function validateScheduleTiming(schedule: any): { valid: boolean; message: string } {
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
  
  // Check if it's too early
  if (currentTime < earlyClockInWindow) {
    return {
      valid: false,
      message: `Too early to clock in. Shift starts at ${scheduleStart.toFormat('h:mm a')}. You can clock in starting at ${earlyClockInWindow.toFormat('h:mm a')}.`
    }
  }
  
  // Check if it's too late
  if (currentTime > lateClockOutWindow) {
    return {
      valid: false,
      message: `Too late to clock out normally. Please contact your supervisor for manual time entry.`
    }
  }
  
  return { valid: true, message: 'Timing is valid' }
}

/**
 * Get time entries linked to schedules for reporting
 */
export async function getScheduleLinkedTimeEntries(
  startDate: string,
  endDate: string,
  staffId?: number
): Promise<any[]> {
  try {
    let query = refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select(`
        id,
        staff_id,
        action,
        timestamp,
        device_info,
        staff:backoffice.staff(staff_name)
      `)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .not('device_info->schedule_id', 'is', null)

    if (staffId) {
      query = query.eq('staff_id', staffId)
    }

    const { data: entries, error } = await query.order('timestamp', { ascending: false })

    if (error) {
      console.error('Error fetching schedule-linked time entries:', error)
      throw new Error('Failed to fetch time entries')
    }

    return entries || []
  } catch (error) {
    console.error('Schedule time entry integration error:', error)
    throw error
  }
}

/**
 * Get current clock-in status for staff member
 */
export async function getStaffClockStatus(staffId: number): Promise<{
  currently_clocked_in: boolean
  last_action?: string
  last_timestamp?: string
}> {
  try {
    const { data: lastEntry, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('action, timestamp')
      .eq('staff_id', staffId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching clock status:', error)
      throw new Error('Failed to fetch clock status')
    }

    const currentlyClockedIn = lastEntry?.action === 'clock_in'

    return {
      currently_clocked_in: currentlyClockedIn,
      last_action: lastEntry?.action,
      last_timestamp: lastEntry?.timestamp
    }
  } catch (error) {
    console.error('Clock status integration error:', error)
    return { currently_clocked_in: false }
  }
}