import { NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .rpc('get_inactive_packages')

    if (error) {
      console.error('Error fetching inactive packages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch inactive packages' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/packages/inactive:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 