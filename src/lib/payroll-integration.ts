/**
 * Payroll Integration Utilities
 * Makes staff schedule data available for payroll and attendance reporting systems
 */

import { refacSupabaseAdmin } from './refac-supabase'
import { DateTime } from 'luxon'

export interface ScheduleForPayroll {
  schedule_id: string
  staff_id: number
  staff_name: string
  staff_employee_id: string | null
  schedule_date: string
  start_time: string
  end_time: string
  scheduled_hours: number
  location: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TimeEntryForPayroll {
  entry_id: number
  staff_id: number
  staff_name: string
  staff_employee_id: string | null
  action: 'clock_in' | 'clock_out'
  timestamp: string
  date: string
  time: string
  linked_schedule_id: string | null
  schedule_date: string | null
  schedule_start_time: string | null
  schedule_end_time: string | null
}

export interface AttendanceReport {
  staff_id: number
  staff_name: string
  staff_employee_id: string | null
  date: string
  scheduled_start: string | null
  scheduled_end: string | null
  scheduled_hours: number
  actual_clock_in: string | null
  actual_clock_out: string | null
  actual_hours: number
  variance_hours: number
  status: 'on_time' | 'late' | 'early' | 'no_show' | 'overtime'
  notes: string | null
}

export interface PayrollScheduleData {
  staff_id: number
  staff_name: string
  staff_employee_id: string | null
  pay_period_start: string
  pay_period_end: string
  total_scheduled_hours: number
  total_actual_hours: number
  total_variance_hours: number
  shifts: Array<{
    date: string
    scheduled_hours: number
    actual_hours: number
    variance_hours: number
    location: string
  }>
}

/**
 * Get schedule data for payroll calculations
 */
export async function getScheduleDataForPayroll(
  startDate: string,
  endDate: string,
  staffId?: number
): Promise<ScheduleForPayroll[]> {
  try {
    let query = refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_schedules')
      .select(`
        id,
        staff_id,
        schedule_date,
        start_time,
        end_time,
        location,
        notes,
        created_at,
        updated_at,
        staff:backoffice.staff(staff_name, staff_id)
      `)
      .gte('schedule_date', startDate)
      .lte('schedule_date', endDate)
      .order('schedule_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (staffId) {
      query = query.eq('staff_id', staffId)
    }

    const { data: schedules, error } = await query

    if (error) {
      console.error('Error fetching schedule data for payroll:', error)
      throw new Error('Failed to fetch schedule data for payroll')
    }

    return (schedules || []).map((schedule: any) => {
      const startTime = DateTime.fromFormat(schedule.start_time, 'HH:mm')
      const endTime = DateTime.fromFormat(schedule.end_time, 'HH:mm')
      const scheduledHours = endTime.diff(startTime, 'hours').hours

      return {
        schedule_id: schedule.id,
        staff_id: schedule.staff_id,
        staff_name: schedule.staff?.staff_name || 'Unknown',
        staff_employee_id: schedule.staff?.staff_id || null,
        schedule_date: schedule.schedule_date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        scheduled_hours: Math.round(scheduledHours * 100) / 100, // Round to 2 decimal places
        location: schedule.location || '',
        notes: schedule.notes,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at
      }
    })
  } catch (error) {
    console.error('Payroll schedule data integration error:', error)
    throw error
  }
}

/**
 * Get time entries linked to schedules for payroll
 */
export async function getTimeEntriesForPayroll(
  startDate: string,
  endDate: string,
  staffId?: number
): Promise<TimeEntryForPayroll[]> {
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
        staff:backoffice.staff(staff_name, staff_id)
      `)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate + 'T23:59:59.999Z')
      .order('timestamp', { ascending: true })

    if (staffId) {
      query = query.eq('staff_id', staffId)
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('Error fetching time entries for payroll:', error)
      throw new Error('Failed to fetch time entries for payroll')
    }

    return (entries || []).map((entry: any) => {
      const timestamp = DateTime.fromISO(entry.timestamp).setZone('Asia/Bangkok')
      const linkedSchedule = entry.device_info?.linked_schedule

      return {
        entry_id: entry.id,
        staff_id: entry.staff_id,
        staff_name: entry.staff?.staff_name || 'Unknown',
        staff_employee_id: entry.staff?.staff_id || null,
        action: entry.action,
        timestamp: entry.timestamp,
        date: timestamp.toFormat('yyyy-MM-dd'),
        time: timestamp.toFormat('HH:mm:ss'),
        linked_schedule_id: linkedSchedule?.schedule_id || null,
        schedule_date: linkedSchedule?.schedule_date || null,
        schedule_start_time: linkedSchedule?.start_time || null,
        schedule_end_time: linkedSchedule?.end_time || null
      }
    })
  } catch (error) {
    console.error('Payroll time entries integration error:', error)
    throw error
  }
}

/**
 * Generate attendance report comparing scheduled vs actual hours
 */
export async function generateAttendanceReport(
  startDate: string,
  endDate: string,
  staffId?: number
): Promise<AttendanceReport[]> {
  try {
    // Get schedule data and time entries
    const [schedules, timeEntries] = await Promise.all([
      getScheduleDataForPayroll(startDate, endDate, staffId),
      getTimeEntriesForPayroll(startDate, endDate, staffId)
    ])

    // Group time entries by staff and date
    const timeEntriesByStaffAndDate = timeEntries.reduce((acc, entry) => {
      const key = `${entry.staff_id}-${entry.date}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(entry)
      return acc
    }, {} as Record<string, TimeEntryForPayroll[]>)

    // Generate attendance records
    const attendanceRecords: AttendanceReport[] = []

    // Process each schedule
    for (const schedule of schedules) {
      const key = `${schedule.staff_id}-${schedule.schedule_date}`
      const dayEntries = timeEntriesByStaffAndDate[key] || []

      // Find clock in/out entries
      const clockIn = dayEntries.find(e => e.action === 'clock_in')
      const clockOut = dayEntries.find(e => e.action === 'clock_out')

      let actualHours = 0
      let status: AttendanceReport['status'] = 'no_show'

      if (clockIn && clockOut) {
        const clockInTime = DateTime.fromISO(clockIn.timestamp)
        const clockOutTime = DateTime.fromISO(clockOut.timestamp)
        actualHours = clockOutTime.diff(clockInTime, 'hours').hours

        // Determine status based on timing
        const scheduledStart = DateTime.fromFormat(schedule.start_time, 'HH:mm')
        const actualStart = DateTime.fromISO(clockIn.timestamp)
        
        const minutesLate = actualStart.diff(scheduledStart, 'minutes').minutes

        if (minutesLate <= 5) {
          status = 'on_time'
        } else if (minutesLate <= 15) {
          status = 'late'
        } else {
          status = 'late'
        }

        if (actualHours > schedule.scheduled_hours + 0.5) {
          status = 'overtime'
        }
      } else if (clockIn && !clockOut) {
        status = 'no_show' // Incomplete entry
      }

      const varianceHours = actualHours - schedule.scheduled_hours

      attendanceRecords.push({
        staff_id: schedule.staff_id,
        staff_name: schedule.staff_name,
        staff_employee_id: schedule.staff_employee_id,
        date: schedule.schedule_date,
        scheduled_start: schedule.start_time,
        scheduled_end: schedule.end_time,
        scheduled_hours: schedule.scheduled_hours,
        actual_clock_in: clockIn?.time || null,
        actual_clock_out: clockOut?.time || null,
        actual_hours: Math.round(actualHours * 100) / 100,
        variance_hours: Math.round(varianceHours * 100) / 100,
        status,
        notes: schedule.notes
      })
    }

    return attendanceRecords.sort((a, b) => {
      if (a.staff_name !== b.staff_name) {
        return a.staff_name.localeCompare(b.staff_name)
      }
      return a.date.localeCompare(b.date)
    })
  } catch (error) {
    console.error('Attendance report generation error:', error)
    throw error
  }
}

/**
 * Generate payroll summary data for a pay period
 */
export async function generatePayrollSummary(
  payPeriodStart: string,
  payPeriodEnd: string,
  staffId?: number
): Promise<PayrollScheduleData[]> {
  try {
    const attendanceReport = await generateAttendanceReport(payPeriodStart, payPeriodEnd, staffId)

    // Group by staff member
    const staffGroups = attendanceReport.reduce((acc, record) => {
      if (!acc[record.staff_id]) {
        acc[record.staff_id] = {
          staff_id: record.staff_id,
          staff_name: record.staff_name,
          staff_employee_id: record.staff_employee_id,
          records: []
        }
      }
      acc[record.staff_id].records.push(record)
      return acc
    }, {} as Record<number, any>)

    // Generate payroll data for each staff member
    return Object.values(staffGroups).map((group: any) => {
      const totalScheduledHours = group.records.reduce((sum: number, r: AttendanceReport) => sum + r.scheduled_hours, 0)
      const totalActualHours = group.records.reduce((sum: number, r: AttendanceReport) => sum + r.actual_hours, 0)
      const totalVarianceHours = totalActualHours - totalScheduledHours

      const shifts = group.records.map((record: AttendanceReport) => ({
        date: record.date,
        scheduled_hours: record.scheduled_hours,
        actual_hours: record.actual_hours,
        variance_hours: record.variance_hours,
        location: record.notes || 'Main Location'
      }))

      return {
        staff_id: group.staff_id,
        staff_name: group.staff_name,
        staff_employee_id: group.staff_employee_id,
        pay_period_start: payPeriodStart,
        pay_period_end: payPeriodEnd,
        total_scheduled_hours: Math.round(totalScheduledHours * 100) / 100,
        total_actual_hours: Math.round(totalActualHours * 100) / 100,
        total_variance_hours: Math.round(totalVarianceHours * 100) / 100,
        shifts
      }
    })
  } catch (error) {
    console.error('Payroll summary generation error:', error)
    throw error
  }
}

/**
 * Export schedule data in CSV format for external payroll systems
 */
export async function exportScheduleDataForPayroll(
  startDate: string,
  endDate: string,
  format: 'csv' | 'json' = 'csv'
): Promise<string> {
  try {
    const payrollData = await generatePayrollSummary(startDate, endDate)

    if (format === 'json') {
      return JSON.stringify(payrollData, null, 2)
    }

    // Generate CSV format
    const headers = [
      'Staff ID',
      'Employee ID',
      'Staff Name',
      'Pay Period Start',
      'Pay Period End',
      'Total Scheduled Hours',
      'Total Actual Hours',
      'Total Variance Hours'
    ]

    const rows = payrollData.map(staff => [
      staff.staff_id.toString(),
      staff.staff_employee_id || '',
      staff.staff_name,
      staff.pay_period_start,
      staff.pay_period_end,
      staff.total_scheduled_hours.toString(),
      staff.total_actual_hours.toString(),
      staff.total_variance_hours.toString()
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
  } catch (error) {
    console.error('Payroll export error:', error)
    throw error
  }
}

/**
 * Get schedule statistics for reporting dashboards
 */
export async function getScheduleStatistics(
  startDate: string,
  endDate: string
): Promise<{
  total_schedules: number
  total_staff_scheduled: number
  total_scheduled_hours: number
  average_hours_per_staff: number
  schedule_compliance_rate: number
  most_scheduled_location: string
}> {
  try {
    const [schedules, attendanceReport] = await Promise.all([
      getScheduleDataForPayroll(startDate, endDate),
      generateAttendanceReport(startDate, endDate)
    ])

    const totalSchedules = schedules.length
    const uniqueStaff = new Set(schedules.map(s => s.staff_id)).size
    const totalScheduledHours = schedules.reduce((sum, s) => sum + s.scheduled_hours, 0)
    const averageHoursPerStaff = uniqueStaff > 0 ? totalScheduledHours / uniqueStaff : 0

    // Calculate compliance rate (on-time attendance)
    const onTimeAttendance = attendanceReport.filter(r => r.status === 'on_time').length
    const complianceRate = attendanceReport.length > 0 ? (onTimeAttendance / attendanceReport.length) * 100 : 0

    // Find most scheduled location
    const locationCounts = schedules.reduce((acc, s) => {
      const location = s.location || 'Main Location'
      acc[location] = (acc[location] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostScheduledLocation = Object.entries(locationCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Main Location'

    return {
      total_schedules: totalSchedules,
      total_staff_scheduled: uniqueStaff,
      total_scheduled_hours: Math.round(totalScheduledHours * 100) / 100,
      average_hours_per_staff: Math.round(averageHoursPerStaff * 100) / 100,
      schedule_compliance_rate: Math.round(complianceRate * 100) / 100,
      most_scheduled_location: mostScheduledLocation
    }
  } catch (error) {
    console.error('Schedule statistics error:', error)
    throw error
  }
}