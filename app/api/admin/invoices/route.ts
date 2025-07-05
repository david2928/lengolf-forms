import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export const dynamic = 'force-dynamic';


interface InvoiceHistoryItem {
  id: string
  invoice_number: string
  invoice_date: string
  subtotal: number
  tax_amount: number
  total_amount: number
  pdf_file_path?: string
  created_at: string
  supplier: {
    id: string
    name: string
    tax_id?: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      console.error('Unauthorized access attempt to invoice history')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('search')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    console.log('Fetching invoice history for admin user:', {
      email: session.user.email,
      filters: { searchTerm, startDate, endDate, page, limit },
      timestamp: new Date().toISOString()
    })

    // Build the query
    let query = refacSupabaseAdmin
      .schema('backoffice')
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        subtotal,
        tax_amount,
        total_amount,
        created_at,
        pdf_file_path,
        suppliers:supplier_id (
          id,
          name,
          tax_id
        )
      `)
      .order('created_at', { ascending: false })



    if (startDate) {
      query = query.gte('invoice_date', startDate)
    }

    if (endDate) {
      query = query.lte('invoice_date', endDate)
    }

    if (searchTerm) {
      query = query.or(`invoice_number.ilike.%${searchTerm}%,suppliers.name.ilike.%${searchTerm}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: invoices, error, count } = await query

    if (error) {
      console.error('Database error fetching invoices:', {
        error: error.message,
        code: error.code,
        filters: { status, searchTerm, startDate, endDate },
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    // Transform data for frontend
    const transformedInvoices: InvoiceHistoryItem[] = (invoices || []).map(invoice => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      subtotal: invoice.subtotal || 0,
      tax_amount: invoice.tax_amount || 0,
      total_amount: invoice.total_amount,
      pdf_file_path: invoice.pdf_file_path,
      created_at: invoice.created_at,
      supplier: {
        id: (invoice.suppliers as any)?.id || '',
        name: (invoice.suppliers as any)?.name || 'Unknown Supplier',
        tax_id: (invoice.suppliers as any)?.tax_id || ''
      }
    }))

    // Get total count for pagination
    let totalCount = count || 0
    if (count === null) {
      const { count: actualCount } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('invoices')
        .select('*', { count: 'exact', head: true })
      totalCount = actualCount || 0
    }

    console.log('Successfully fetched invoice history:', {
      invoices_count: transformedInvoices.length,
      total_count: totalCount,
      page,
      limit,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(transformedInvoices)

  } catch (error) {
    console.error('Invoice history API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 