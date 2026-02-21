import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      brand, model, club_type, gender, condition, price, cost,
      description, image_url, available_for_sale, available_for_rental, set_id,
    } = body

    const { data, error } = await refacSupabaseAdmin
      .from('used_clubs_inventory')
      .update({
        brand,
        model: model || null,
        club_type,
        gender,
        condition,
        price: price != null ? Number(price) : undefined,
        cost: cost != null ? Number(cost) : null,
        description: description || null,
        image_url: image_url || null,
        available_for_sale,
        available_for_rental,
        set_id: set_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating club:', error)
      return NextResponse.json({ error: 'Failed to update club' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/admin/used-clubs/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Fetch image_url before deleting so we can clean up Storage
    const { data: club } = await refacSupabaseAdmin
      .from('used_clubs_inventory')
      .select('image_url')
      .eq('id', id)
      .single()

    const { error } = await refacSupabaseAdmin
      .from('used_clubs_inventory')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting club:', error)
      return NextResponse.json({ error: 'Failed to delete club' }, { status: 500 })
    }

    // Best-effort: remove image from Storage
    if (club?.image_url) {
      const url = new URL(club.image_url)
      const pathParts = url.pathname.split('/website-assets/')
      if (pathParts.length === 2) {
        await refacSupabaseAdmin.storage
          .from('website-assets')
          .remove([pathParts[1]])
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/used-clubs/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
