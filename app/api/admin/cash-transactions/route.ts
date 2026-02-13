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

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const staffFilter = searchParams.get('staff_name')
    const typeFilter = searchParams.get('spending_type')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = refacSupabaseAdmin
      .schema('finance')
      .from('cash_transactions')
      .select('*', { count: 'exact' })

    if (startDate) {
      query = query.gte('transaction_date', startDate)
    }
    if (endDate) {
      query = query.lte('transaction_date', endDate)
    }
    if (staffFilter) {
      query = query.eq('staff_name', staffFilter)
    }
    if (typeFilter) {
      query = query.eq('spending_type', typeFilter)
    }
    if (search) {
      query = query.or(`notes.ilike.%${search}%,spending_type.ilike.%${search}%,staff_name.ilike.%${search}%`)
    }

    query = query
      .order('transaction_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: transactions, error, count } = await query

    if (error) {
      console.error('Error fetching cash transactions:', error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    return NextResponse.json({ data: transactions || [], total: count || 0 })
  } catch (error) {
    console.error('Error in GET /api/admin/cash-transactions:', error)
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
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 })
    }

    const { error } = await refacSupabaseAdmin
      .schema('finance')
      .from('cash_transactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting cash transaction:', error)
      return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/cash-transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
