import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

function getIndoorPrice(set: Record<string, unknown>, durationHours: number): number {
  if (durationHours <= 1) return Number(set.indoor_price_1h)
  if (durationHours <= 2) return Number(set.indoor_price_2h)
  return Number(set.indoor_price_4h)
}

function getCoursePrice(set: Record<string, unknown>, durationDays: number): number {
  if (durationDays <= 1) return Number(set.course_price_1d)
  if (durationDays <= 3) return Number(set.course_price_3d)
  if (durationDays <= 7) return Number(set.course_price_7d)
  return Number(set.course_price_14d)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      rental_club_set_id,
      rental_type,
      start_date,
      start_time,
      duration_hours,
      duration_days,
      booking_id,
      customer_name,
      customer_email,
      customer_phone,
      customer_id,
      add_ons = [],
      delivery_requested = false,
      delivery_address,
      notes,
      source = 'staff',
    } = body

    if (!rental_club_set_id || !rental_type || !start_date || !customer_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['indoor', 'course'].includes(rental_type)) {
      return NextResponse.json({ error: 'Invalid rental_type. Must be "indoor" or "course".' }, { status: 400 })
    }

    // Validate add-on prices server-side
    const VALID_ADD_ONS: Record<string, number> = {
      gloves: 600,
      balls: 400,
    }
    const validatedAddOns = (add_ons as Array<{ key: string; label: string; price: number }>).map(
      (item: { key: string; label: string; price: number }) => {
        const expectedPrice = VALID_ADD_ONS[item.key]
        if (expectedPrice === undefined) {
          return item // unknown add-on, keep as-is (could be new)
        }
        return { ...item, price: expectedPrice } // enforce server-side price
      }
    )

    // Calculate end_date: for course rentals, "1 day" = return next day at same time
    let end_date = body.end_date || start_date
    if (rental_type === 'course' && duration_days) {
      const start = new Date(start_date)
      start.setDate(start.getDate() + duration_days)
      end_date = start.toISOString().split('T')[0]
    }

    // Check availability
    const { data: availableCount, error: availError } = await refacSupabaseAdmin.rpc('check_club_set_availability', {
      p_set_id: rental_club_set_id,
      p_start_date: start_date,
      p_end_date: end_date,
      p_start_time: start_time || null,
      p_duration_hours: duration_hours || null,
    })

    if (availError) {
      console.error('[ClubReserve] Availability check error:', availError)
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
    }

    if (!availableCount || availableCount <= 0) {
      return NextResponse.json(
        { error: 'This club set is not available for the selected dates/time' },
        { status: 409 }
      )
    }

    // Get the club set details for pricing
    const { data: clubSet, error: setError } = await refacSupabaseAdmin
      .from('rental_club_sets')
      .select('*')
      .eq('id', rental_club_set_id)
      .single()

    if (setError || !clubSet) {
      return NextResponse.json({ error: 'Club set not found' }, { status: 404 })
    }

    // Calculate pricing
    let rental_price = 0
    if (rental_type === 'indoor' && duration_hours) {
      rental_price = getIndoorPrice(clubSet, duration_hours)
    } else if (rental_type === 'course' && duration_days) {
      rental_price = getCoursePrice(clubSet, duration_days)
    }

    const add_ons_total = validatedAddOns.reduce((sum: number, item: { price: number }) => sum + item.price, 0)
    const delivery_fee = delivery_requested ? 500 : 0
    const total_price = rental_price + add_ons_total + delivery_fee

    // Generate rental code
    const { data: rentalCode, error: codeError } = await refacSupabaseAdmin.rpc('generate_rental_code')
    if (codeError || !rentalCode) {
      console.error('[ClubReserve] Failed to generate rental code:', codeError)
      return NextResponse.json({ error: 'Failed to generate rental code' }, { status: 500 })
    }

    // Create the rental reservation
    const { data: rental, error: insertError } = await refacSupabaseAdmin
      .from('club_rentals')
      .insert({
        rental_code: rentalCode,
        rental_club_set_id,
        booking_id: booking_id || null,
        customer_id: customer_id || null,
        customer_name,
        customer_email: customer_email || null,
        customer_phone: customer_phone || null,
        rental_type,
        status: 'reserved',
        start_date,
        end_date,
        start_time: start_time || null,
        duration_hours: duration_hours || null,
        duration_days: duration_days || null,
        rental_price,
        add_ons: validatedAddOns.length > 0 ? validatedAddOns : [],
        add_ons_total,
        delivery_requested,
        delivery_address: delivery_address || null,
        delivery_fee,
        total_price,
        notes: notes || null,
        source,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[ClubReserve] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create rental reservation' }, { status: 500 })
    }

    console.log(`[ClubReserve] Created rental ${rentalCode} for ${clubSet.name}, total: ฿${total_price}`)

    return NextResponse.json({
      success: true,
      rental,
      rental_code: rentalCode,
      club_set: {
        name: clubSet.name,
        tier: clubSet.tier,
        gender: clubSet.gender,
        brand: clubSet.brand,
        model: clubSet.model,
      },
      pricing: { rental_price, add_ons_total, delivery_fee, total_price },
    })
  } catch (error) {
    console.error('[ClubReserve] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
