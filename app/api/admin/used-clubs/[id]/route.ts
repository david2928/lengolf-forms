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
      brand, model, club_type, specification, shaft, gender, condition, price, cost,
      description, image_url, image_urls, available_for_sale, available_for_rental, set_id, purchased_at,
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
        price: price != null ? Number(price) : undefined,
        cost: cost != null ? Number(cost) : null,
        description: description || null,
        image_url: image_url || (Array.isArray(image_urls) && image_urls.length > 0 ? image_urls[0] : null),
        image_urls: Array.isArray(image_urls) ? image_urls : undefined,
        available_for_sale,
        available_for_rental,
        purchased_at: purchased_at || null,
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

    // Fetch image URLs before deleting so we can clean up Storage
    const { data: club } = await refacSupabaseAdmin
      .from('used_clubs_inventory')
      .select('image_url, image_urls')
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

    // Best-effort: remove all images from Storage
    const allUrls = new Set<string>()
    if (club?.image_url) allUrls.add(club.image_url)
    if (Array.isArray(club?.image_urls)) club.image_urls.forEach((u: string) => allUrls.add(u))

    const pathsToRemove: string[] = []
    allUrls.forEach(imgUrl => {
      try {
        const url = new URL(imgUrl)
        const pathParts = url.pathname.split('/website-assets/')
        if (pathParts.length === 2) pathsToRemove.push(pathParts[1])
      } catch { /* ignore invalid URLs */ }
    })

    if (pathsToRemove.length > 0) {
      await refacSupabaseAdmin.storage
        .from('website-assets')
        .remove(pathsToRemove)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/used-clubs/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
