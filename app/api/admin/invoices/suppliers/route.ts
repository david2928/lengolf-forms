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

    const { data: suppliers, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoice_suppliers')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
    }

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('Error in GET /api/admin/invoices/suppliers:', error)
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
    const { name, address_line1, address_line2, tax_id, default_description, default_unit_price } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: supplier, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoice_suppliers')
      .insert([{
        name,
        address_line1,
        address_line2,
        tax_id,
        default_description,
        default_unit_price
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating supplier:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Supplier with this Tax ID already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
    }

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/admin/invoices/suppliers:', error)
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
    const { id, name, address_line1, address_line2, tax_id, default_description, default_unit_price } = body

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 })
    }

    const { data: supplier, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoice_suppliers')
      .update({
        name,
        address_line1,
        address_line2,
        tax_id,
        default_description,
        default_unit_price,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating supplier:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Supplier with this Tax ID already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
    }

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Error in PUT /api/admin/invoices/suppliers:', error)
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

    // Check if supplier has any invoices
    const { data: invoices, error: invoicesError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoices')
      .select('id')
      .eq('supplier_id', id)
      .limit(1)

    if (invoicesError) {
      console.error('Error checking supplier invoices:', invoicesError)
      return NextResponse.json({ error: 'Failed to check supplier usage' }, { status: 500 })
    }

    if (invoices && invoices.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete supplier with existing invoices' 
      }, { status: 409 })
    }

    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoice_suppliers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting supplier:', error)
      return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/invoices/suppliers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 