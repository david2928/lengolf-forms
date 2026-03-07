import { NextRequest, NextResponse } from 'next/server'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      // Sanitize search input: escape PostgREST special characters to prevent filter injection
      const sanitized = search.replace(/[%_,()\\]/g, '')
      if (sanitized) {
        query = query.or(`rental_code.ilike.%${sanitized}%,customer_name.ilike.%${sanitized}%,customer_phone.ilike.%${sanitized}%`)
      }
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
