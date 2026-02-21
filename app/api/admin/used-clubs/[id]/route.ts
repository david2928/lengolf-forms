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

    // Validate price/cost if provided
    if ('price' in body && body.price != null) {
      const numPrice = Number(body.price)
      if (isNaN(numPrice) || numPrice < 0) {
        return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
      }
    }
    if ('cost' in body && body.cost != null) {
      const numCost = Number(body.cost)
      if (isNaN(numCost) || numCost < 0) {
        return NextResponse.json({ error: 'cost must be a non-negative number' }, { status: 400 })
      }
    }

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
    if ('price' in body) updateData.price = body.price != null ? Number(body.price) : undefined
    if ('cost' in body) updateData.cost = body.cost != null ? Number(body.cost) : null
    if ('description' in body) updateData.description = body.description || null
    if ('image_url' in body || 'image_urls' in body) {
      updateData.image_url = body.image_url || (Array.isArray(body.image_urls) && body.image_urls.length > 0 ? body.image_urls[0] : null)
    }
    if ('image_urls' in body) updateData.image_urls = Array.isArray(body.image_urls) ? body.image_urls : undefined
    if ('available_for_sale' in body) updateData.available_for_sale = body.available_for_sale
    if ('available_for_rental' in body) updateData.available_for_rental = body.available_for_rental
    if ('purchased_at' in body) updateData.purchased_at = body.purchased_at || null
    if ('set_id' in body) updateData.set_id = body.set_id || null

    const { data, error } = await refacSupabaseAdmin
      .from('used_clubs_inventory')
      .update(updateData)
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
