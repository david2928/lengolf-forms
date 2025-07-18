import { NextRequest, NextResponse } from 'next/server'
import { 
  generatePayrollSummary, 
  generateAttendanceReport, 
  exportScheduleDataForPayroll,
  getScheduleStatistics
} from '@/lib/payroll-integration'

/**
 * GET /api/admin/staff-scheduling/payroll - Get payroll and attendance data
 * Query parameters:
 * - start_date: Start date (YYYY-MM-DD)
 * - end_date: End date (YYYY-MM-DD)
 * - staff_id: Optional staff ID filter
 * - type: 'summary' | 'attendance' | 'export' | 'statistics'
 * - format: 'json' | 'csv' (for export type)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const staffIdParam = searchParams.get('staff_id')
    const type = searchParams.get('type') || 'summary'
    const format = searchParams.get('format') || 'json'

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'start_date and end_date are required'
      }, { status: 400 })
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json({
        success: false,
        error: 'Dates must be in YYYY-MM-DD format'
      }, { status: 400 })
    }

    const staffId = staffIdParam ? parseInt(staffIdParam) : undefined

    let data: any
    let headers: Record<string, string> = {}

    switch (type) {
      case 'summary':
        data = await generatePayrollSummary(startDate, endDate, staffId)
        break

      case 'attendance':
        data = await generateAttendanceReport(startDate, endDate, staffId)
        break

      case 'export':
        const exportData = await exportScheduleDataForPayroll(startDate, endDate, format as 'csv' | 'json')
        
        if (format === 'csv') {
          headers['Content-Type'] = 'text/csv'
          headers['Content-Disposition'] = `attachment; filename="payroll-data-${startDate}-to-${endDate}.csv"`
          return new NextResponse(exportData, { headers })
        } else {
          data = JSON.parse(exportData)
        }
        break

      case 'statistics':
        data = await getScheduleStatistics(startDate, endDate)
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid type parameter. Must be: summary, attendance, export, or statistics'
        }, { status: 400 })
    }

    const response = {
      success: true,
      data,
      metadata: {
        start_date: startDate,
        end_date: endDate,
        staff_id: staffId,
        type,
        generated_at: new Date().toISOString()
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
        ...headers
      }
    })

  } catch (error: any) {
    console.error('Payroll API error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}

/**
 * POST /api/admin/staff-scheduling/payroll - Generate custom payroll report
 * Body: {
 *   start_date: string,
 *   end_date: string,
 *   staff_ids?: number[],
 *   include_attendance: boolean,
 *   include_statistics: boolean,
 *   export_format?: 'json' | 'csv'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      start_date, 
      end_date, 
      staff_ids, 
      include_attendance = false, 
      include_statistics = false,
      export_format = 'json'
    } = body

    // Validate required fields
    if (!start_date || !end_date) {
      return NextResponse.json({
        success: false,
        error: 'start_date and end_date are required'
      }, { status: 400 })
    }

    const report: any = {
      period: {
        start_date,
        end_date
      },
      generated_at: new Date().toISOString()
    }

    // Generate payroll summary for each staff member or all staff
    if (staff_ids && staff_ids.length > 0) {
      const summaries = await Promise.all(
        staff_ids.map((staffId: number) => generatePayrollSummary(start_date, end_date, staffId))
      )
      report.payroll_summary = summaries.flat()
    } else {
      report.payroll_summary = await generatePayrollSummary(start_date, end_date)
    }

    // Include attendance report if requested
    if (include_attendance) {
      if (staff_ids && staff_ids.length > 0) {
        const attendanceReports = await Promise.all(
          staff_ids.map((staffId: number) => generateAttendanceReport(start_date, end_date, staffId))
        )
        report.attendance_report = attendanceReports.flat()
      } else {
        report.attendance_report = await generateAttendanceReport(start_date, end_date)
      }
    }

    // Include statistics if requested
    if (include_statistics) {
      report.statistics = await getScheduleStatistics(start_date, end_date)
    }

    // Handle export format
    if (export_format === 'csv') {
      const csvData = await exportScheduleDataForPayroll(start_date, end_date, 'csv')
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="custom-payroll-report-${start_date}-to-${end_date}.csv"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: report
    })

  } catch (error: any) {
    console.error('Custom payroll report error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}