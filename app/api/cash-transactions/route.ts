import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'
import { uploadCashTransactionReceipt } from '@/lib/google-drive-service'
import { ALLOWED_RECEIPT_TYPES, MAX_RECEIPT_FILE_SIZE } from '@/types/vendor-receipts'

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const staffName = formData.get('staff_name') as string
    const spendingType = formData.get('spending_type') as string
    const amount = formData.get('amount') as string
    const transactionDate = formData.get('transaction_date') as string | null
    const notes = formData.get('notes') as string | null
    const file = formData.get('file') as File | null

    if (!staffName) {
      return NextResponse.json({ error: 'Staff name is required' }, { status: 400 })
    }
    if (!spendingType) {
      return NextResponse.json({ error: 'Spending type is required' }, { status: 400 })
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }
    if (!file) {
      return NextResponse.json({ error: 'Receipt file is required' }, { status: 400 })
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

    const dateStr = transactionDate || new Date().toISOString().split('T')[0]

    // Upload to Google Drive
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await uploadCashTransactionReceipt(buffer, file.type, {
      transactionDate: dateStr,
      spendingType,
      originalFileName: file.name,
    })

    // Insert into database
    const { data: transaction, error } = await refacSupabaseAdmin
      .schema('finance')
      .from('cash_transactions')
      .insert([{
        transaction_date: dateStr,
        staff_name: staffName,
        spending_type: spendingType,
        amount: Math.round(parseFloat(amount) * 100) / 100,
        file_url: uploadResult.fileUrl,
        file_id: uploadResult.fileId,
        file_name: uploadResult.fileName,
        submitted_by: session.user.name || session.user.email,
        notes: notes || null,
        source: 'form',
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating cash transaction:', error)
      return NextResponse.json({ error: 'Failed to save transaction record' }, { status: 500 })
    }

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/cash-transactions:', error)
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

    const { data: transactions, error } = await refacSupabaseAdmin
      .schema('finance')
      .from('cash_transactions')
      .select('id, transaction_date, staff_name, spending_type, amount, file_url, notes, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching cash transactions:', error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    return NextResponse.json(transactions || [])
  } catch (error) {
    console.error('Error in GET /api/cash-transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
