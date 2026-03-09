import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'
import { uploadReceiptToDrive } from '@/lib/google-drive-service'
import { ALLOWED_RECEIPT_TYPES, MAX_RECEIPT_FILE_SIZE } from '@/types/vendor-receipts'

export const maxDuration = 30; // Google Drive upload + DB insert

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const vendorId = formData.get('vendor_id') as string
    const receiptDate = formData.get('receipt_date') as string | null
    const notes = formData.get('notes') as string | null
    const file = formData.get('file') as File | null

    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor is required' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (!ALLOWED_RECEIPT_TYPES.includes(file.type as any)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_RECEIPT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (file.size > MAX_RECEIPT_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Check for duplicate submission (same vendor + date within last 5 minutes)
    const dateStr = receiptDate || new Date().toISOString().split('T')[0]
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: existing } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('receipt_date', dateStr)
      .gte('created_at', fiveMinutesAgo)
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json(existing, { status: 200 })
    }

    // Upload to Google Drive
    const t0 = Date.now()
    const buffer = Buffer.from(await file.arrayBuffer())
    const parsedDate = receiptDate ? new Date(receiptDate) : new Date()
    const uploadResult = await uploadReceiptToDrive(buffer, file.name, file.type, parsedDate)
    console.log(`[vendor-receipts] Drive upload took ${Date.now() - t0}ms`)

    // Insert into database
    const t1 = Date.now()
    const { data: receipt, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .insert([{
        vendor_id: vendorId,
        receipt_date: receiptDate || new Date().toISOString().split('T')[0],
        file_url: uploadResult.fileUrl,
        file_id: uploadResult.fileId,
        file_name: uploadResult.fileName,
        submitted_by: session.user.name || session.user.email,
        notes: notes || null,
      }])
      .select()
      .single()

    console.log(`[vendor-receipts] DB insert took ${Date.now() - t1}ms (total: ${Date.now() - t0}ms)`)

    if (error) {
      console.error('Error creating vendor receipt:', error)
      return NextResponse.json({ error: 'Failed to save receipt record' }, { status: 500 })
    }

    return NextResponse.json(receipt, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/vendor-receipts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const { data: receipts, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .select(`
        id,
        receipt_date,
        file_url,
        file_name,
        submitted_by,
        notes,
        created_at,
        vendor_id,
        vendors!inner (
          name,
          category
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching vendor receipts:', error)
      return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 })
    }

    // Flatten the vendor join
    const formatted = (receipts || []).map((r: any) => ({
      id: r.id,
      receipt_date: r.receipt_date,
      file_url: r.file_url,
      file_name: r.file_name,
      submitted_by: r.submitted_by,
      notes: r.notes,
      created_at: r.created_at,
      vendor_id: r.vendor_id,
      vendor_name: r.vendors?.name || 'Unknown',
      vendor_category: r.vendors?.category || null,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Error in GET /api/vendor-receipts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
