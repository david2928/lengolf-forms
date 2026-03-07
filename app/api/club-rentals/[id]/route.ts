import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

const VALID_TRANSITIONS: Record<string, string[]> = {
  reserved: ['confirmed', 'cancelled'],
  confirmed: ['checked_out', 'cancelled'],
  checked_out: ['returned'],
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
