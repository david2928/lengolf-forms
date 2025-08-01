import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      console.error('Unauthorized access attempt to download PDF')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Get invoice with PDF path
    const { data: invoice, error: invoiceError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoices')
      .select('invoice_number, pdf_file_path')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      console.error('Invoice not found for download:', {
        invoice_id: id,
        error: invoiceError?.message,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (!invoice.pdf_file_path) {
      return NextResponse.json({ error: 'PDF not available for this invoice' }, { status: 404 })
    }

    // For now, we'll redirect to the PDF generation endpoint which returns HTML
    // In production, you would serve the actual PDF file from storage
    const response = await fetch(`${request.nextUrl.origin}/api/admin/invoices/${id}/pdf`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      }
    })

    if (response.ok) {
      const htmlContent = await response.text()
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="${invoice.invoice_number}.html"`
        }
      })
    } else {
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
    }

  } catch (error) {
    console.error('PDF download API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      invoice_id: params?.id,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 