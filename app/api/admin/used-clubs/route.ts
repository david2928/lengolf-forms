import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await refacSupabaseAdmin
      .from('used_clubs_inventory')
      .select('*, club_sets(id, name, brand)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all clubs:', error)
      return NextResponse.json({ error: 'Failed to fetch clubs' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/admin/used-clubs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      brand, model, club_type, specification, shaft, gender, condition, price, cost,
      description, image_url, available_for_sale, available_for_rental, set_id,
    } = body

    if (!brand || !club_type || !condition || price == null) {
      return NextResponse.json(
        { error: 'brand, club_type, condition, and price are required' },
        { status: 400 }
      )
    }

    const numPrice = Number(price)
    if (isNaN(numPrice) || numPrice < 0) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
    }
    const numCost = cost != null ? Number(cost) : null
    if (numCost !== null && (isNaN(numCost) || numCost < 0)) {
      return NextResponse.json({ error: 'cost must be a non-negative number' }, { status: 400 })
    }

    const { data, error } = await refacSupabaseAdmin
      .from('used_clubs_inventory')
      .insert([{
        brand,
        model: model || null,
        club_type,
        specification: specification || null,
        shaft: shaft || null,
        gender: gender || 'Unisex',
        condition,
        price: numPrice,
        cost: numCost,
        description: description || null,
        image_url: image_url || null,
        available_for_sale: available_for_sale ?? true,
        available_for_rental: available_for_rental ?? false,
        set_id: set_id || null,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating club (admin):', error)
      return NextResponse.json({ error: 'Failed to create club' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/admin/used-clubs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
