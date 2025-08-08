import { NextRequest, NextResponse } from 'next/server'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'
import { isUserAdmin } from '@/lib/auth'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

interface StaffResponse {
  success: boolean
  staff?: Array<{
    id: number
    staff_name: string
    is_active: boolean
  }>
  message?: string
  error?: string
}

/**
 * GET /api/admin/staff - Get all staff members
 * Admin authentication required
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userIsAdmin = await isUserAdmin(session.user.email)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all staff members
    const { data: staff, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, is_active')
      .order('staff_name', { ascending: true })

    if (error) {
      console.error('Error fetching staff:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch staff members',
        error: error.message
      } as StaffResponse, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      staff: staff || []
    } as StaffResponse)

  } catch (error) {
    console.error('Error in GET /api/admin/staff:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as StaffResponse, { status: 500 })
  }
}