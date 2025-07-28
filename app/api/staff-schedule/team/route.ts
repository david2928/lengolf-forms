import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const scheduleDate = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(scheduleDate)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      }, { status: 400 })
    }

    // Call the database function to get team schedule for the date
    const { data: teamSchedule, error: teamError } = await refacSupabaseAdmin
      .rpc('get_team_schedule_for_date', {
        p_schedule_date: scheduleDate
      })

    if (teamError) {
      console.error('Error fetching team schedule:', teamError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch team schedule'
      }, { status: 500 })
    }

    // Calculate team statistics
    const totalStaffScheduled = teamSchedule?.filter((staff: any) => staff.total_shifts > 0).length || 0
    const totalShifts = teamSchedule?.reduce((sum: number, staff: any) => sum + staff.total_shifts, 0) || 0
    const staffWithMultipleShifts = teamSchedule?.filter((staff: any) => staff.total_shifts > 1).length || 0

    // Format the response
    const response = {
      success: true,
      data: {
        schedule_date: scheduleDate,
        team_schedule: teamSchedule || [],
        team_stats: {
          total_staff: teamSchedule?.length || 0,
          staff_scheduled: totalStaffScheduled,
          total_shifts: totalShifts,
          staff_with_multiple_shifts: staffWithMultipleShifts,
          coverage_percentage: teamSchedule?.length > 0 ? Math.round((totalStaffScheduled / teamSchedule.length) * 100) : 0
        }
      }
    }

    // Set cache headers for performance
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
      }
    })

  } catch (error: any) {
    console.error('Team schedule API error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}