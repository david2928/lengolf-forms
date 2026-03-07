import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''

    let query = refacSupabaseAdmin
      .from('club_rentals')
      .select(`
        *,
        rental_club_sets (
          name,
          tier,
          gender,
          brand,
          model
        )
      `)
      .eq('rental_type', 'course')
      .order('start_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`rental_code.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('[ClubRentals] List error:', error)
      return NextResponse.json({ error: 'Failed to fetch rentals' }, { status: 500 })
    }

    return NextResponse.json({ rentals: data || [] })
  } catch (error) {
    console.error('[ClubRentals] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
