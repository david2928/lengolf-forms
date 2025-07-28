import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 })
    }

    const body = await request.json()
    const { staff_id, schedule_date, start_time, end_time, is_recurring, recurring_group_id } = body

    // Insert a test recurring schedule
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff_schedules')
      .insert({
        staff_id,
        schedule_date,
        start_time,
        end_time,
        location: 'Test Location',
        notes: 'Test recurring schedule',
        is_recurring,
        recurring_group_id
      })
      .select()

    if (error) {
      console.error('Error creating test recurring schedule:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error: any) {
    console.error('Test recurring API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}