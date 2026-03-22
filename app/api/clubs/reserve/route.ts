import { NextRequest, NextResponse } from 'next/server'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { sendCourseRentalConfirmationEmail } from '@/lib/email-service'

function getIndoorPrice(set: Record<string, unknown>, durationHours: number): number {
  if (durationHours <= 1) return Number(set.indoor_price_1h)
  if (durationHours <= 2) return Number(set.indoor_price_2h)
  if (durationHours <= 3) return Number(set.indoor_price_3h || set.indoor_price_4h)
  if (durationHours <= 4) return Number(set.indoor_price_4h)
  return Number(set.indoor_price_5h || set.indoor_price_4h)
}

function getCoursePrice(set: Record<string, unknown>, durationDays: number): number {
  if (durationDays <= 1) return Number(set.course_price_1d)
  if (durationDays <= 3) return Number(set.course_price_3d)
  if (durationDays <= 7) return Number(set.course_price_7d)
  return Number(set.course_price_14d)
}

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      delivery_time,
      return_time,
      notes,
      source = 'staff',
    } = body

    if (!rental_club_set_id || !rental_type || !start_date || !customer_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['indoor', 'course'].includes(rental_type)) {
      return NextResponse.json({ error: 'Invalid rental_type. Must be "indoor" or "course".' }, { status: 400 })
    }

    // Validate add-on prices server-side (synced with website GEAR_UP_ITEMS)
    const VALID_ADD_ONS: Record<string, { label: string; price: number }> = {
      gloves: { label: 'Golf Glove', price: 600 },
      balls: { label: 'Practice Balls (1 bucket)', price: 400 },
      delivery: { label: 'Delivery Service', price: 500 },
    }
    const validatedAddOns = (add_ons as Array<{ key: string; label: string; price: number }>)
      .filter((item: { key: string }) => item.key !== 'delivery') // delivery handled separately via delivery_fee
      .map((item: { key: string; label: string; price: number }) => {
        const expected = VALID_ADD_ONS[item.key]
        if (!expected) {
          return item // unknown add-on, keep as-is (could be new)
        }
        return { ...item, label: expected.label, price: expected.price } // enforce server-side price & label
      })

    // For course rentals, compute duration_days from date range
    let end_date = body.end_date || start_date
    let effective_duration_days = duration_days
    if (rental_type === 'course' && end_date && end_date !== start_date) {
      effective_duration_days = Math.max(1, Math.round(
        (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)
      ))
    } else if (rental_type === 'course' && duration_days && !body.end_date) {
      // Fallback: compute end_date from duration_days (legacy support)
      const start = new Date(start_date)
      start.setDate(start.getDate() + duration_days)
      end_date = start.toISOString().split('T')[0]
      effective_duration_days = duration_days
    }

    // Check availability
    const { data: availableCount, error: availError } = await refacSupabaseAdmin.rpc('check_club_set_availability', {
      p_set_id: rental_club_set_id,
      p_start_date: start_date,
      p_end_date: end_date,
      p_start_time: start_time || null,
      p_duration_hours: duration_hours || null,
      p_rental_type: rental_type,
      p_return_time: return_time || null,
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
    } else if (rental_type === 'course' && effective_duration_days) {
      rental_price = getCoursePrice(clubSet, effective_duration_days)
    }

    const add_ons_total = validatedAddOns.reduce((sum: number, item: { price: number }) => sum + item.price, 0)
    const delivery_fee = delivery_requested ? 500 : 0
    const total_price = rental_price + add_ons_total + delivery_fee

    // Resolve user_id from customer_id via profiles table
    let user_id: string | null = null
    if (customer_id) {
      const { data: profile } = await refacSupabaseAdmin
        .from('profiles')
        .select('id')
        .eq('customer_id', customer_id)
        .maybeSingle()
      if (profile) {
        user_id = profile.id
      }
    }

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
        user_id,
        customer_name,
        customer_email: customer_email || null,
        customer_phone: customer_phone || null,
        rental_type,
        status: 'reserved',
        start_date,
        end_date,
        start_time: start_time || null,
        duration_hours: duration_hours || null,
        duration_days: effective_duration_days || null,
        rental_price,
        add_ons: validatedAddOns.length > 0 ? validatedAddOns : [],
        add_ons_total,
        delivery_requested,
        delivery_address: delivery_address || null,
        delivery_time: delivery_time || null,
        return_time: return_time || null,
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

    // TOCTOU race condition check: re-verify availability after insert
    const { data: postCount } = await refacSupabaseAdmin.rpc('check_club_set_availability', {
      p_set_id: rental_club_set_id,
      p_start_date: start_date,
      p_end_date: end_date,
      p_start_time: start_time || null,
      p_duration_hours: duration_hours || null,
      p_rental_type: rental_type,
      p_return_time: return_time || null,
    })
    if (postCount !== null && postCount < 0) {
      // Overbooking detected — roll back by deleting the just-created rental
      await refacSupabaseAdmin.from('club_rentals').delete().eq('id', rental.id)
      console.warn(`[ClubReserve] TOCTOU rollback: rental ${rentalCode} deleted due to overbooking`)
      return NextResponse.json(
        { error: 'This set was just booked by someone else. Please try again.' },
        { status: 409 }
      )
    }

    console.log(`[ClubReserve] Created rental ${rentalCode} for ${clubSet.name}, total: ฿${total_price}`)

    // Send confirmation email for course rentals when customer email is provided
    if (rental_type === 'course' && customer_email) {
      sendCourseRentalConfirmationEmail({
        customerName: customer_name,
        email: customer_email,
        rentalCode,
        clubSetName: clubSet.name,
        clubSetTier: clubSet.tier,
        clubSetGender: clubSet.gender,
        startDate: start_date,
        endDate: end_date,
        durationDays: effective_duration_days || 1,
        deliveryRequested: delivery_requested,
        deliveryAddress: delivery_address,
        deliveryTime: delivery_time,
        addOns: validatedAddOns.map((a: { label: string; price: number }) => ({ label: a.label, price: a.price })),
        rentalPrice: rental_price,
        deliveryFee: delivery_fee,
        totalPrice: total_price,
        notes,
      }).catch(err => console.error('[ClubReserve] Email send failed (non-blocking):', err))
    }

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
