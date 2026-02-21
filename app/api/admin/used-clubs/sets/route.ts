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
      .from('club_sets')
      .select('*, used_clubs_inventory(count)')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching sets:', error)
      return NextResponse.json({ error: 'Failed to fetch sets' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/admin/used-clubs/sets:', error)
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
    const { name, brand, description } = body

    if (!name || !brand) {
      return NextResponse.json({ error: 'name and brand are required' }, { status: 400 })
    }

    const { data, error } = await refacSupabaseAdmin
      .from('club_sets')
      .insert([{ name, brand, description: description || null }])
      .select()
      .single()

    if (error) {
      console.error('Error creating set:', error)
      return NextResponse.json({ error: 'Failed to create set' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/admin/used-clubs/sets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, brand, description } = body

    if (!id || !name || !brand) {
      return NextResponse.json({ error: 'id, name, and brand are required' }, { status: 400 })
    }

    const { data, error } = await refacSupabaseAdmin
      .from('club_sets')
      .update({ name, brand, description: description || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating set:', error)
      return NextResponse.json({ error: 'Failed to update set' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/admin/used-clubs/sets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Block delete if clubs are assigned to this set
    const { data: clubs, error: clubsError } = await refacSupabaseAdmin
      .from('used_clubs_inventory')
      .select('id')
      .eq('set_id', id)
      .limit(1)

    if (clubsError) {
      return NextResponse.json({ error: 'Failed to check set usage' }, { status: 500 })
    }

    if (clubs && clubs.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a set that has clubs assigned to it. Reassign or delete the clubs first.' },
        { status: 409 }
      )
    }

    const { error } = await refacSupabaseAdmin
      .from('club_sets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting set:', error)
      return NextResponse.json({ error: 'Failed to delete set' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/used-clubs/sets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
