import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { generateInvoiceHTML, InvoiceData } from '@/lib/pdf-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      console.error('Unauthorized access attempt to generate PDF')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    console.log('Generating PDF for invoice:', {
      email: session.user.email,
      invoice_id: id,
      timestamp: new Date().toISOString()
    })

    // Get invoice with all related data
    const { data: invoice, error: invoiceError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoices')
      .select(`
        *,
        suppliers:supplier_id (
          name,
          address_line1,
          address_line2,
          tax_id
        )
      `)
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      console.error('Invoice not found for PDF generation:', {
        invoice_id: id,
        error: invoiceError?.message,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Get invoice items
    const { data: items, error: itemsError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('created_at')

    if (itemsError) {
      console.error('Error fetching invoice items for PDF:', {
        invoice_id: id,
        error: itemsError.message,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Failed to fetch invoice items' }, { status: 500 })
    }

    // Get company settings
    const { data: settingsRows } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoice_settings')
      .select('key, value')

    const settings: Record<string, string> = {}
    settingsRows?.forEach(row => {
      settings[row.key] = row.value
    })

    // Prepare invoice data for PDF generation
    const invoiceData: InvoiceData = {
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      supplier: {
        name: (invoice.suppliers as any)?.name || 'Unknown Supplier',
        address_line1: (invoice.suppliers as any)?.address_line1 || '',
        address_line2: (invoice.suppliers as any)?.address_line2,
        tax_id: (invoice.suppliers as any)?.tax_id
      },
      items: items || [],
      subtotal: invoice.subtotal,
      tax_rate: invoice.tax_rate,
      tax_amount: invoice.tax_amount,
      total_amount: invoice.total_amount,
      company_info: {
        name: settings.lengolf_name || 'LENGOLF CO. LTD.',
        address_line1: settings.lengolf_address_line1 || '540 Mercury Tower, 4th Floor, Unit 407 Ploenchit Road',
        address_line2: settings.lengolf_address_line2 || 'Lumpini, Pathumwan, Bangkok 10330',
        tax_id: settings.lengolf_tax_id || '105566207013'
      }
    }

    // Generate HTML for PDF
    const htmlContent = generateInvoiceHTML(invoiceData)

    // For now, return the HTML content
    // In production, you would use a service like Puppeteer to convert HTML to PDF
    // and store it in cloud storage
    
    const pdfPath = `invoices/${invoice.invoice_number}_${Date.now()}.html`
    
    // Update invoice with PDF path
    const { error: updateError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoices')
      .update({
        pdf_file_path: pdfPath,
        status: invoice.status === 'draft' ? 'generated' : invoice.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating invoice with PDF path:', {
        error: updateError.message,
        invoice_id: id,
        timestamp: new Date().toISOString()
      })
    }

    console.log('Successfully generated PDF for invoice:', {
      invoice_id: id,
      invoice_number: invoice.invoice_number,
      pdf_path: pdfPath,
      timestamp: new Date().toISOString()
    })

    // Return HTML content as PDF preview (for development)
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${invoice.invoice_number}.html"`
      }
    })

  } catch (error) {
    console.error('PDF generation API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      invoice_id: params?.id,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 