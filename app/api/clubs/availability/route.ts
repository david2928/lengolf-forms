import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rentalType = searchParams.get('type') || 'indoor'
    const date = searchParams.get('date')
    const startTime = searchParams.get('start_time') || null
    const durationHours = searchParams.get('duration') ? parseFloat(searchParams.get('duration')!) : null

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Valid date parameter is required (YYYY-MM-DD)' }, { status: 400 })
    }

    if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) {
      return NextResponse.json({ error: 'Invalid start_time format (HH:mm)' }, { status: 400 })
    }

    if (durationHours !== null && (!Number.isFinite(durationHours) || durationHours <= 0)) {
      return NextResponse.json({ error: 'duration must be a positive number' }, { status: 400 })
    }

    const rawEndDate = searchParams.get('end_date') || date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawEndDate)) {
      return NextResponse.json({ error: 'Invalid end_date format (YYYY-MM-DD)' }, { status: 400 })
    }
    const endDate = rawEndDate

    const { data, error } = await refacSupabaseAdmin.rpc('get_available_club_sets', {
      p_rental_type: rentalType,
      p_start_date: date,
      p_end_date: endDate,
      p_start_time: startTime,
      p_duration_hours: durationHours,
    })

    if (error) {
      console.error('[ClubAvailability] RPC error:', error)
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
    }

    return NextResponse.json({
      sets: data || [],
      date,
      rental_type: rentalType,
    })
  } catch (error) {
    console.error('[ClubAvailability] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
