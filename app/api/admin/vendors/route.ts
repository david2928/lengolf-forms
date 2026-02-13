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

    const { data: vendors, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching vendors:', error)
      return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
    }

    return NextResponse.json(vendors)
  } catch (error) {
    console.error('Error in GET /api/admin/vendors:', error)
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
    const { name, category, notes, is_active, address, tax_id, is_company, is_domestic } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: vendor, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .insert([{
        name,
        category,
        notes,
        is_active: is_active ?? true,
        address: address || null,
        tax_id: tax_id || null,
        is_company: is_company ?? false,
        is_domestic: is_domestic ?? true,
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Vendor with this name already exists' }, { status: 409 })
      }
      console.error('Error creating vendor:', error)
      return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 })
    }

    return NextResponse.json(vendor, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/admin/vendors:', error)
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
    const { id, name, category, notes, is_active, address, tax_id, is_company, is_domestic } = body

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 })
    }

    const { data: vendor, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .update({
        name,
        category,
        notes,
        is_active,
        address: address || null,
        tax_id: tax_id || null,
        is_company: is_company ?? false,
        is_domestic: is_domestic ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Vendor with this name already exists' }, { status: 409 })
      }
      console.error('Error updating vendor:', error)
      return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 })
    }

    return NextResponse.json(vendor)
  } catch (error) {
    console.error('Error in PUT /api/admin/vendors:', error)
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
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Check if vendor has any receipts
    const { data: receipts, error: receiptsError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .select('id')
      .eq('vendor_id', id)
      .limit(1)

    if (receiptsError) {
      console.error('Error checking vendor receipts:', receiptsError)
      return NextResponse.json({ error: 'Failed to check vendor usage' }, { status: 500 })
    }

    if (receipts && receipts.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor with existing receipts. Deactivate instead.' },
        { status: 409 }
      )
    }

    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting vendor:', error)
      return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/vendors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
