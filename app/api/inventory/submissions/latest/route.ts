import { NextRequest, NextResponse } from 'next/server'
import { refacSupabase as supabase } from '@/lib/refac-supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const staffName = searchParams.get('staff_name')

    if (!staffName) {
      return NextResponse.json(
        { error: 'staff_name parameter is required' },
        { status: 400 }
      )
    }

    // Get the latest submission for this staff member
    const { data: latestSubmission, error: fetchError } = await supabase
      .from('inventory_submissions')
      .select('*')
      .eq('staff_name', staffName)
      .order('submission_date', { ascending: false })
      .limit(1)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Latest submission fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch latest submission' },
        { status: 500 }
      )
    }

    // Return the latest submission or null if none found
    return NextResponse.json({
      submission: latestSubmission || null
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 