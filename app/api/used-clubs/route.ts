import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.user.isStaff && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    // cost intentionally excluded — only admin can set it
    const {
      brand,
      model,
      club_type,
      specification,
      shaft,
      gender,
      condition,
      price,
      description,
      image_url,
      image_urls,
      available_for_sale,
      available_for_rental,
      set_id,
    } = body

    if (!brand || !club_type || !condition) {
      return NextResponse.json(
        { error: 'brand, club_type, and condition are required' },
        { status: 400 }
      )
    }

    const numPrice = price != null ? Number(price) : 0
    if (isNaN(numPrice) || numPrice < 0) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
    }

    // Use first image_url from array if image_url not explicitly provided
    const resolvedImageUrl = image_url || (Array.isArray(image_urls) && image_urls.length > 0 ? image_urls[0] : null)
    const resolvedImageUrls = Array.isArray(image_urls) ? image_urls : (image_url ? [image_url] : [])

    const { data, error } = await refacSupabaseAdmin
      .from('used_clubs_inventory')
      .insert([{
        brand,
        model: model || null,
        club_type,
        specification: specification || null,
        shaft: shaft || null,
        gender: gender || 'Men',
        condition,
        price: numPrice,
        description: description || null,
        image_url: resolvedImageUrl,
        image_urls: resolvedImageUrls,
        available_for_sale: available_for_sale ?? false,
        available_for_rental: available_for_rental ?? false,
        set_id: set_id || null,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating club:', error)
      return NextResponse.json({ error: 'Failed to create club' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/used-clubs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
