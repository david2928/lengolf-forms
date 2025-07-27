import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'

// GET - Fetch active staff list
export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 })
    }

    // Fetch active staff members
    const { data: staff, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name')
      .eq('is_active', true)
      .order('staff_name')

    if (error) {
      console.error('Error fetching staff:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch staff'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        staff: staff || []
      }
    })

  } catch (error: any) {
    console.error('Admin staff GET error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}