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
      .from('club_sets')
      .select('id, name, brand, description')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching sets:', error)
      return NextResponse.json({ error: 'Failed to fetch sets' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/used-clubs/sets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
