import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication with development bypass support
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const weekStart = searchParams.get('week_start') || getWeekStart(new Date()).toISOString().split('T')[0]
    const weekEnd = getWeekEnd(new Date(weekStart)).toISOString().split('T')[0]

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(weekStart)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid week_start format. Use YYYY-MM-DD'
      }, { status: 400 })
    }

    // Get all schedules for the week
    const { data: schedules, error: schedulesError } = await refacSupabaseAdmin
      .rpc('get_staff_schedule', {
        p_staff_id: null, // Get all staff
        p_start_date: weekStart,
        p_end_date: weekEnd
      })

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch schedules'
      }, { status: 500 })
    }

    // Get active staff count
    const { data: staffCount, error: staffCountError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id', { count: 'exact' })
      .eq('is_active', true)

    if (staffCountError) {
      console.error('Error fetching staff count:', staffCountError)
    }

    // Calculate KPIs
    const totalStaff = staffCount?.length || 0
    const totalScheduledShifts = schedules?.length || 0
    const uniqueStaffScheduled = new Set(schedules?.map((s: any) => s.staff_id)).size
    const totalPossibleSlots = totalStaff * 7 * 3 // Assuming max 3 shifts per day per staff
    const coveragePercentage = totalPossibleSlots > 0 ? Math.round((totalScheduledShifts / totalPossibleSlots) * 100) : 0

    // Group schedules by date and staff for grid view
    const scheduleGrid = groupSchedulesForGrid(schedules || [], weekStart, weekEnd)

    // Check for scheduling conflicts
    const conflicts = findSchedulingConflicts(schedules || [])

    const response = {
      success: true,
      data: {
        week_period: {
          start_date: weekStart,
          end_date: weekEnd
        },
        kpis: {
          total_staff: totalStaff,
          scheduled_shifts: totalScheduledShifts,
          staff_scheduled: uniqueStaffScheduled,
          coverage_percentage: coveragePercentage,
          conflicts_count: conflicts.length
        },
        schedule_grid: scheduleGrid,
        conflicts: conflicts,
        raw_schedules: schedules || []
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error: any) {
    console.error('Admin overview API error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}

// Helper function to get week start (Monday)
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  return new Date(d.setDate(diff))
}

// Helper function to get week end (Sunday)
function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart)
  return new Date(d.setDate(d.getDate() + 6))
}

// Helper function to group schedules for grid display
function groupSchedulesForGrid(schedules: any[], weekStart: string, weekEnd: string) {
  const grid: any = {}
  const startDate = new Date(weekStart)
  
  // Initialize grid with 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    grid[dateStr] = []
  }

  // Group schedules by date
  schedules.forEach((schedule: any) => {
    const dateStr = schedule.schedule_date
    if (grid[dateStr]) {
      grid[dateStr].push(schedule)
    }
  })

  return grid
}

// Helper function to find scheduling conflicts
function findSchedulingConflicts(schedules: any[]) {
  const conflicts: any[] = []
  
  // Group by staff and date
  const staffSchedules: { [key: string]: any[] } = {}
  
  schedules.forEach((schedule: any) => {
    const key = `${schedule.staff_id}-${schedule.schedule_date}`
    if (!staffSchedules[key]) {
      staffSchedules[key] = []
    }
    staffSchedules[key].push(schedule)
  })

  // Check for overlapping times within each staff-date group
  Object.entries(staffSchedules).forEach(([key, daySchedules]) => {
    if (daySchedules.length > 1) {
      for (let i = 0; i < daySchedules.length; i++) {
        for (let j = i + 1; j < daySchedules.length; j++) {
          const schedule1 = daySchedules[i]
          const schedule2 = daySchedules[j]
          
          // Check for time overlap
          if (timesOverlap(schedule1.start_time, schedule1.end_time, schedule2.start_time, schedule2.end_time)) {
            conflicts.push({
              type: 'time_overlap',
              staff_id: schedule1.staff_id,
              staff_name: schedule1.staff_name,
              date: schedule1.schedule_date,
              conflicting_schedules: [
                { id: schedule1.schedule_id, time: `${schedule1.start_time}-${schedule1.end_time}`, location: schedule1.location },
                { id: schedule2.schedule_id, time: `${schedule2.start_time}-${schedule2.end_time}`, location: schedule2.location }
              ]
            })
          }
        }
      }
    }
  })

  return conflicts
}

// Helper function to check if two time ranges overlap
function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && start2 < end1
}