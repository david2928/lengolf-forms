import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.user.isStaff && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await refacSupabaseAdmin
      .from('used_clubs_inventory')
      .select('id, brand, model, club_type, specification, shaft, gender, condition, price, image_url, image_urls, available_for_sale, available_for_rental, set_id, created_at, club_sets(name)')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching recent clubs:', error)
      return NextResponse.json({ error: 'Failed to fetch recent clubs' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/used-clubs/recent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
