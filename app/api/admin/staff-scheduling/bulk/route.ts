import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

// POST - Create bulk schedules from weekly template
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
    const { operation, data } = body

    if (operation === 'generate_from_template') {
      const { staff_id, start_date, end_date } = data

      // Validate required fields
      if (!staff_id || !start_date || !end_date) {
        return NextResponse.json({
          success: false,
          error: 'staff_id, start_date, and end_date are required'
        }, { status: 400 })
      }

      // Use the database function to generate schedules from weekly template
      const { data: schedulesCreated, error } = await refacSupabaseAdmin
        .rpc('generate_schedules_from_weekly_template', {
          p_staff_id: staff_id,
          p_start_date: start_date,
          p_end_date: end_date
        })

      if (error) {
        console.error('Error generating schedules from template:', error)
        return NextResponse.json({
          success: false,
          error: 'Failed to generate schedules from template'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: {
          schedules_created: schedulesCreated,
          message: `Created ${schedulesCreated} schedules from weekly template`
        }
      })

    } else if (operation === 'create_recurring') {
      const { staff_id, schedule_date, start_time, end_time, location, notes, weeks } = data

      // Validate required fields
      if (!staff_id || !schedule_date || !start_time || !end_time || !weeks) {
        return NextResponse.json({
          success: false,
          error: 'staff_id, schedule_date, start_time, end_time, and weeks are required'
        }, { status: 400 })
      }

      const schedulesToCreate = []
      const startDate = new Date(schedule_date)
      
      // Create schedules for the specified number of weeks
      for (let week = 0; week < weeks; week++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + (week * 7))
        const dateStr = currentDate.toISOString().split('T')[0]

        schedulesToCreate.push({
          staff_id,
          schedule_date: dateStr,
          start_time,
          end_time,
          location: location || null,
          notes: notes || null,
          created_by: session.user.email
        })
      }

      // Insert all schedules
      const { data: newSchedules, error: insertError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff_schedules')
        .insert(schedulesToCreate)
        .select()

      if (insertError) {
        console.error('Error creating recurring schedules:', insertError)
        return NextResponse.json({
          success: false,
          error: 'Failed to create recurring schedules'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: {
          schedules_created: newSchedules?.length || 0,
          schedules: newSchedules,
          message: `Created ${newSchedules?.length || 0} recurring schedules`
        }
      })

    } else if (operation === 'delete_multiple') {
      const { schedule_ids } = data

      if (!schedule_ids || !Array.isArray(schedule_ids) || schedule_ids.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'schedule_ids array is required'
        }, { status: 400 })
      }

      // Delete multiple schedules
      const { error: deleteError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff_schedules')
        .delete()
        .in('id', schedule_ids)

      if (deleteError) {
        console.error('Error deleting multiple schedules:', deleteError)
        return NextResponse.json({
          success: false,
          error: 'Failed to delete schedules'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: {
          schedules_deleted: schedule_ids.length,
          message: `Deleted ${schedule_ids.length} schedules`
        }
      })

    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid operation. Supported operations: generate_from_template, create_recurring, delete_multiple'
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Admin bulk schedules error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}