import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

interface GenerateInvoiceRequest {
  supplier_id: string
  invoice_number?: string // Make optional for auto-generation
  invoice_date: string
  tax_rate: number
  subtotal: number
  tax_amount: number
  total_amount: number
  items: InvoiceItem[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      console.error('Unauthorized access attempt to generate invoice')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateInvoiceRequest = await request.json()
    
    console.log('Generating invoice for admin user:', {
      email: session.user.email,
      invoice_number: body.invoice_number,
      supplier_id: body.supplier_id,
      timestamp: new Date().toISOString()
    })

    // Validate required fields
    const requiredFields: (keyof GenerateInvoiceRequest)[] = ['supplier_id', 'invoice_date', 'items']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ 
          error: `${field} is required` 
        }, { status: 400 })
      }
    }

    // Validate items
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ 
        error: 'At least one invoice item is required' 
      }, { status: 400 })
    }

    // Validate numeric fields
    if (body.tax_rate < 0 || body.tax_rate > 100) {
      return NextResponse.json({ 
        error: 'Tax rate must be between 0 and 100' 
      }, { status: 400 })
    }

    // Generate invoice number if not provided
    let invoiceNumber = body.invoice_number
    if (!invoiceNumber) {
      const currentDate = new Date(body.invoice_date)
      const yearMonth = currentDate.getFullYear().toString() + 
                       (currentDate.getMonth() + 1).toString().padStart(2, '0')
      
      // Get the next invoice number for this month
      const { data: lastInvoice } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('invoices')
        .select('invoice_number')
        .ilike('invoice_number', `${yearMonth}%`)
        .order('invoice_number', { ascending: false })
        .limit(1)
        .single()

      let nextNumber = 1
      if (lastInvoice) {
        const lastNumber = parseInt(lastInvoice.invoice_number.substring(6)) || 0
        nextNumber = lastNumber + 1
      }
      
      invoiceNumber = yearMonth + nextNumber.toString().padStart(3, '0')
    } else {
      // If invoice number is provided but exists, auto-generate a new one
      const { data: existingInvoice } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('invoices')
        .select('id')
        .eq('invoice_number', invoiceNumber)
        .single()

      if (existingInvoice) {
        // Generate a new unique number
        const currentDate = new Date(body.invoice_date)
        const yearMonth = currentDate.getFullYear().toString() + 
                         (currentDate.getMonth() + 1).toString().padStart(2, '0')
        
        const { data: lastInvoice } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('invoices')
          .select('invoice_number')
          .ilike('invoice_number', `${yearMonth}%`)
          .order('invoice_number', { ascending: false })
          .limit(1)
          .single()

        let nextNumber = 1
        if (lastInvoice) {
          const lastNumber = parseInt(lastInvoice.invoice_number.substring(6)) || 0
          nextNumber = lastNumber + 1
        }
        
        invoiceNumber = yearMonth + nextNumber.toString().padStart(3, '0')
      }
    }

    // Get admin user ID for audit trail
    const { data: adminUser } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    // Start transaction: Create invoice
    const { data: invoice, error: invoiceError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoices')
      .insert([{
        invoice_number: invoiceNumber,
        supplier_id: body.supplier_id,
        invoice_date: body.invoice_date,
        subtotal: body.subtotal,
        tax_rate: body.tax_rate,
        tax_amount: body.tax_amount,
        total_amount: body.total_amount,

        created_by: adminUser?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (invoiceError) {
      console.error('Database error creating invoice:', {
        error: invoiceError.message,
        code: invoiceError.code,
        invoice_number: invoiceNumber,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }

    // Create invoice items
    const invoiceItems = body.items.map(item => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      created_at: new Date().toISOString()
    }))

    const { error: itemsError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoice_items')
      .insert(invoiceItems)

    if (itemsError) {
      console.error('Database error creating invoice items:', {
        error: itemsError.message,
        code: itemsError.code,
        invoice_id: invoice.id,
        timestamp: new Date().toISOString()
      })
      
      // Rollback: Delete the invoice
      await refacSupabaseAdmin
        .schema('backoffice')
        .from('invoices')
        .delete()
        .eq('id', invoice.id)

      return NextResponse.json({ error: 'Failed to create invoice items' }, { status: 500 })
    }

    // TODO: Generate PDF here
    // For now, we'll just return success without PDF
    // In a production environment, you would:
    // 1. Generate PDF using a library like puppeteer or pdfkit
    // 2. Upload PDF to cloud storage (Supabase Storage, AWS S3, etc.)
    // 3. Update invoice record with PDF path
    
    console.log('Successfully created invoice:', {
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
      items_count: body.items.length,
      total_amount: body.total_amount,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
      message: 'Invoice generated successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Invoice generation API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 