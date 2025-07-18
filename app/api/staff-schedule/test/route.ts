import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export async function GET() {
  try {
    // Test database connection and staff scheduling functions
    const { data: schedules, error: schedulesError } = await refacSupabaseAdmin
      .rpc('get_staff_schedule', {
        p_staff_id: null,
        p_start_date: '2025-07-14',
        p_end_date: '2025-07-20'
      })

    if (schedulesError) {
      console.error('Database error:', schedulesError)
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: schedulesError
      }, { status: 500 })
    }

    // Test staff table access
    const { data: staff, error: staffError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name')
      .eq('is_active', true)
      .limit(5)

    if (staffError) {
      console.error('Staff query error:', staffError)
      return NextResponse.json({
        success: false,
        error: 'Staff query failed',
        details: staffError
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Staff scheduling API is working!',
      data: {
        schedules_count: schedules?.length || 0,
        staff_count: staff?.length || 0,
        sample_schedules: schedules?.slice(0, 3) || [],
        sample_staff: staff || []
      }
    })

  } catch (error: any) {
    console.error('API test error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error occurred',
      stack: error?.stack
    }, { status: 500 })
  }
}