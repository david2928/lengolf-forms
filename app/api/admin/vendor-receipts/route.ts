import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'
import { deleteFileFromDrive } from '@/lib/google-drive-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const vendorId = searchParams.get('vendor_id')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .select(`
        *,
        vendors!inner (
          name,
          category
        )
      `, { count: 'exact' })

    if (startDate) {
      query = query.gte('receipt_date', startDate)
    }
    if (endDate) {
      query = query.lte('receipt_date', endDate)
    }
    if (vendorId) {
      query = query.eq('vendor_id', vendorId)
    }
    if (search) {
      query = query.or(`file_name.ilike.%${search}%,notes.ilike.%${search}%,submitted_by.ilike.%${search}%`)
    }

    query = query
      .order('receipt_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: receipts, error, count } = await query

    if (error) {
      console.error('Error fetching vendor receipts:', error)
      return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 })
    }

    const formatted = (receipts || []).map((r: any) => ({
      id: r.id,
      vendor_id: r.vendor_id,
      receipt_date: r.receipt_date,
      file_url: r.file_url,
      file_id: r.file_id,
      file_name: r.file_name,
      submitted_by: r.submitted_by,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
      vendor_name: r.vendors?.name || 'Unknown',
      vendor_category: r.vendors?.category || null,
      // Extraction fields
      invoice_number: r.invoice_number || null,
      invoice_date: r.invoice_date || null,
      total_amount: r.total_amount != null ? Number(r.total_amount) : null,
      tax_base: r.tax_base != null ? Number(r.tax_base) : null,
      vat_amount: r.vat_amount != null ? Number(r.vat_amount) : null,
      vat_type: r.vat_type || null,
      wht_applicable: r.wht_applicable ?? false,
      extraction_confidence: r.extraction_confidence || null,
      confidence_explanation: r.confidence_explanation || null,
      extracted_vendor_name: r.extracted_vendor_name || null,
      extracted_company_name_en: r.extracted_company_name_en || null,
      extracted_address: r.extracted_address || null,
      extracted_tax_id: r.extracted_tax_id || null,
      extraction_model: r.extraction_model || null,
      extracted_at: r.extracted_at || null,
      extraction_notes: r.extraction_notes || null,
    }))

    return NextResponse.json({ data: formatted, total: count || 0 })
  } catch (error) {
    console.error('Error in GET /api/admin/vendor-receipts:', error)
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
    const { id, ...fields } = body

    if (!id) {
      return NextResponse.json({ error: 'Receipt ID is required' }, { status: 400 })
    }

    const ALLOWED_FIELDS = [
      'receipt_date', 'notes', 'vendor_id',
      'invoice_number', 'invoice_date', 'total_amount', 'tax_base',
      'vat_amount', 'vat_type', 'wht_applicable', 'extraction_notes',
    ]

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    for (const key of ALLOWED_FIELDS) {
      if (fields[key] !== undefined) updateData[key] = fields[key]
    }

    const { data: receipt, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating vendor receipt:', error)
      return NextResponse.json({ error: 'Failed to update receipt' }, { status: 500 })
    }

    return NextResponse.json(receipt)
  } catch (error) {
    console.error('Error in PUT /api/admin/vendor-receipts:', error)
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
    const deleteDriveFile = searchParams.get('delete_file') === 'true'

    if (!id) {
      return NextResponse.json({ error: 'Receipt ID is required' }, { status: 400 })
    }

    // Get the receipt first to get the file_id
    if (deleteDriveFile) {
      const { data: receipt } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('vendor_receipts')
        .select('file_id')
        .eq('id', id)
        .single()

      if (receipt?.file_id) {
        await deleteFileFromDrive(receipt.file_id)
      }
    }

    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting vendor receipt:', error)
      return NextResponse.json({ error: 'Failed to delete receipt' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/vendor-receipts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
