import { NextRequest, NextResponse } from 'next/server'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

// Server-side add-on price enforcement (synced with reserve endpoint)
const VALID_ADD_ONS: Record<string, { label: string; price: number }> = {
  gloves: { label: 'Golf Glove', price: 600 },
  balls: { label: 'Practice Balls (1 bucket)', price: 400 },
}

function getCoursePrice(set: Record<string, unknown>, durationDays: number): number {
  if (durationDays <= 1) return Number(set.course_price_1d)
  if (durationDays <= 3) return Number(set.course_price_3d)
  if (durationDays <= 7) return Number(set.course_price_7d)
  return Number(set.course_price_14d)
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  reserved: ['confirmed', 'cancelled'],
  confirmed: ['checked_out', 'cancelled'],
  checked_out: ['returned'],
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { status: newStatus, cancelled_by, cancellation_reason } = body

    if (!newStatus) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 })
    }

    // Get current rental (full data for LINE notification on cancel)
    const { data: rental, error: fetchError } = await refacSupabaseAdmin
      .from('club_rentals')
      .select('*, rental_club_sets (name, tier, gender)')
      .eq('id', id)
      .single()

    if (fetchError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 })
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[rental.status]
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot change status from "${rental.status}" to "${newStatus}"` },
        { status: 400 }
      )
    }

    // Build update
    const update: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (newStatus === 'checked_out') {
      update.checked_out_at = new Date().toISOString()
    }
    if (newStatus === 'returned') {
      update.returned_at = new Date().toISOString()
    }
    if (newStatus === 'cancelled' && cancelled_by && typeof cancelled_by === 'string') {
      const safeName = cancelled_by.slice(0, 100)
      const safeReason = typeof cancellation_reason === 'string' ? cancellation_reason.slice(0, 500) : ''
      const cancelNote = `Cancelled by ${safeName}${safeReason ? `: ${safeReason}` : ''}`
      update.notes = rental.notes ? `${rental.notes}\n${cancelNote}` : cancelNote
    }

    const { data: updated, error: updateError } = await refacSupabaseAdmin
      .from('club_rentals')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[ClubRentals] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update rental' }, { status: 500 })
    }

    console.log(`[ClubRentals] ${rental.rental_code}: ${rental.status} -> ${newStatus}`)

    return NextResponse.json({ success: true, rental: updated })
  } catch (error) {
    console.error('[ClubRentals] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()

    const {
      rental_club_set_id,
      start_date,
      duration_days,
      start_time,
      return_time,
      delivery_requested,
      delivery_address,
      add_ons = [],
      notes,
      employee_name,
    } = body

    if (!employee_name || typeof employee_name !== 'string') {
      return NextResponse.json({ error: 'Employee name is required' }, { status: 400 })
    }

    // Fetch current rental
    const { data: rental, error: fetchError } = await refacSupabaseAdmin
      .from('club_rentals')
      .select('*, rental_club_sets (name, tier, gender, brand, model)')
      .eq('id', id)
      .single()

    if (fetchError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 })
    }

    // Only allow editing reserved or confirmed rentals
    if (!['reserved', 'confirmed'].includes(rental.status)) {
      return NextResponse.json(
        { error: `Cannot edit rental in "${rental.status}" status` },
        { status: 400 }
      )
    }

    // Determine new values (fall back to current)
    const newSetId = rental_club_set_id || rental.rental_club_set_id
    const newDurationDays = (duration_days !== undefined && duration_days !== null)
      ? duration_days
      : (rental.duration_days || 1)
    const newStartDate = start_date || rental.start_date

    // Validate duration
    const ALLOWED_DURATIONS = [1, 3, 7, 14]
    if (!ALLOWED_DURATIONS.includes(newDurationDays)) {
      return NextResponse.json({ error: 'Invalid duration. Must be 1, 3, 7, or 14 days.' }, { status: 400 })
    }

    // Validate date format
    if (isNaN(Date.parse(newStartDate))) {
      return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })
    }
    const newStartTime = start_time !== undefined ? (start_time || null) : rental.start_time
    const newReturnTime = return_time !== undefined ? (return_time || null) : rental.return_time
    const newDeliveryRequested = delivery_requested !== undefined ? delivery_requested : rental.delivery_requested
    const newDeliveryAddress = delivery_requested !== undefined
      ? (newDeliveryRequested ? (delivery_address || '').trim() || null : null)
      : rental.delivery_address
    const newNotes = notes !== undefined ? (notes || null) : rental.notes

    // Calculate end_date
    const startD = new Date(newStartDate)
    startD.setDate(startD.getDate() + newDurationDays)
    const newEndDate = startD.toISOString().split('T')[0]

    // Check availability if set or dates changed (exclude current rental)
    const setChanged = newSetId !== rental.rental_club_set_id
    const datesChanged = newStartDate !== rental.start_date || newDurationDays !== rental.duration_days

    if (setChanged || datesChanged) {
      const { data: availableCount, error: availError } = await refacSupabaseAdmin.rpc(
        'check_club_set_availability',
        {
          p_set_id: newSetId,
          p_start_date: newStartDate,
          p_end_date: newEndDate,
          p_start_time: newStartTime || null,
          p_duration_hours: null,
          p_exclude_rental_id: id,
          p_rental_type: 'course',
        }
      )

      if (availError) {
        console.error('[ClubRentals] Availability check error:', availError)
        // Fall back to check without exclude param (older DB function signature)
        const { data: fallbackCount, error: fallbackError } = await refacSupabaseAdmin.rpc(
          'check_club_set_availability',
          {
            p_set_id: newSetId,
            p_start_date: newStartDate,
            p_end_date: newEndDate,
            p_start_time: newStartTime || null,
            p_duration_hours: null,
            p_rental_type: 'course',
          }
        )
        if (fallbackError) {
          return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
        }
        // With fallback (no exclude), the current rental counts against availability.
        // If set changed, 0 means fully booked by others — block it.
        // If same set, current rental occupies one slot so 0 is acceptable (it's just us).
        const minRequired = setChanged ? 1 : 0
        if (fallbackCount !== null && fallbackCount < minRequired) {
          return NextResponse.json(
            { error: 'This club set is not available for the selected dates' },
            { status: 409 }
          )
        }
      } else if (!availableCount || availableCount < 0) {
        return NextResponse.json(
          { error: 'This club set is not available for the selected dates' },
          { status: 409 }
        )
      }
    }

    // Fetch club set for pricing
    const { data: clubSet, error: setError } = await refacSupabaseAdmin
      .from('rental_club_sets')
      .select('*')
      .eq('id', newSetId)
      .single()

    if (setError || !clubSet) {
      return NextResponse.json({ error: 'Club set not found' }, { status: 404 })
    }

    // Validate and enforce add-on prices server-side (reject unknown add-ons)
    const validatedAddOns = (add_ons as Array<{ key: string; label: string; price: number }>)
      .filter((item: { key: string }) => item.key !== 'delivery' && item.key in VALID_ADD_ONS)
      .map((item: { key: string; label: string; price: number }) => {
        const expected = VALID_ADD_ONS[item.key]
        return { ...item, label: expected.label, price: expected.price }
      })

    // Recalculate pricing
    const rentalPrice = getCoursePrice(clubSet, newDurationDays)
    const addOnsTotal = validatedAddOns.reduce((sum: number, item: { price: number }) => sum + item.price, 0)
    const deliveryFee = newDeliveryRequested ? 500 : 0
    const totalPrice = rentalPrice + addOnsTotal + deliveryFee

    // Build update
    const updateData: Record<string, unknown> = {
      rental_club_set_id: newSetId,
      start_date: newStartDate,
      end_date: newEndDate,
      duration_days: newDurationDays,
      start_time: newStartTime,
      return_time: newReturnTime,
      delivery_requested: newDeliveryRequested,
      delivery_address: newDeliveryAddress,
      delivery_fee: deliveryFee,
      add_ons: validatedAddOns.length > 0 ? validatedAddOns : [],
      add_ons_total: addOnsTotal,
      rental_price: rentalPrice,
      total_price: totalPrice,
      notes: newNotes,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error: updateError } = await refacSupabaseAdmin
      .from('club_rentals')
      .update(updateData)
      .eq('id', id)
      .select('*, rental_club_sets (name, tier, gender, brand, model)')
      .single()

    if (updateError) {
      console.error('[ClubRentals] PUT update error:', updateError)
      return NextResponse.json({ error: 'Failed to update rental' }, { status: 500 })
    }

    console.log(`[ClubRentals] ${rental.rental_code} edited by ${employee_name}: total ฿${totalPrice}`)

    return NextResponse.json({
      success: true,
      rental: updated,
      previous: {
        rental_club_set_id: rental.rental_club_set_id,
        start_date: rental.start_date,
        end_date: rental.end_date,
        duration_days: rental.duration_days,
        start_time: rental.start_time,
        return_time: rental.return_time,
        delivery_requested: rental.delivery_requested,
        delivery_address: rental.delivery_address,
        add_ons: rental.add_ons,
        total_price: rental.total_price,
        notes: rental.notes,
        rental_club_sets: rental.rental_club_sets,
      },
    })
  } catch (error) {
    console.error('[ClubRentals] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
