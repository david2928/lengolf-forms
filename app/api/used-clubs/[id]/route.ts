import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'

// Staff can edit club details (not price/cost/availability)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.user.isStaff && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      brand, model, club_type, specification, shaft, gender, condition,
      description, image_url, image_urls, set_id,
    } = body

    const { data, error } = await refacSupabaseAdmin
      .from('used_clubs_inventory')
      .update({
        brand,
        model: model || null,
        club_type,
        specification: specification || null,
        shaft: shaft || null,
        gender,
        condition,
        description: description || null,
        image_url: image_url || (Array.isArray(image_urls) && image_urls.length > 0 ? image_urls[0] : null),
        image_urls: Array.isArray(image_urls) ? image_urls : undefined,
        set_id: set_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, brand, model, club_type, specification, shaft, gender, condition, price, description, image_url, image_urls, available_for_sale, available_for_rental, purchased_at, set_id, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error updating club (staff):', error)
      return NextResponse.json({ error: 'Failed to update club' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/used-clubs/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
