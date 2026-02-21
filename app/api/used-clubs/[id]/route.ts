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

    // Build update payload from only provided fields to avoid clobbering on partial updates
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if ('brand' in body) updateData.brand = body.brand
    if ('model' in body) updateData.model = body.model || null
    if ('club_type' in body) updateData.club_type = body.club_type
    if ('specification' in body) updateData.specification = body.specification || null
    if ('shaft' in body) updateData.shaft = body.shaft || null
    if ('gender' in body) updateData.gender = body.gender
    if ('condition' in body) updateData.condition = body.condition
    if ('description' in body) updateData.description = body.description || null
    if ('image_url' in body || 'image_urls' in body) {
      updateData.image_url = body.image_url || (Array.isArray(body.image_urls) && body.image_urls.length > 0 ? body.image_urls[0] : null)
    }
    if ('image_urls' in body) updateData.image_urls = Array.isArray(body.image_urls) ? body.image_urls : undefined
    if ('set_id' in body) updateData.set_id = body.set_id || null

    const { data, error } = await refacSupabaseAdmin
      .from('used_clubs_inventory')
      .update(updateData)
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
