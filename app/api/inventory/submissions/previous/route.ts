import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'
import { getDevSession } from '@/lib/dev-session'
import { authOptions } from '@/lib/auth-config'

export const dynamic = 'force-dynamic'

/**
 * GET /api/inventory/submissions/previous
 * Returns the most recent submission values per product before today.
 * Used to show spike warnings when current entry is >20% higher than previous.
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication required
    const session = await getDevSession(authOptions, request)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD, defaults to today

    const referenceDate = date || new Date().toISOString().split('T')[0]

    // Direct query: Get the most recent submission for each product before the reference date
    // Using DISTINCT ON for efficient deduplication at the DB level
    const { data, error } = await refacSupabaseAdmin
      .from('inventory_submission')
      .select('product_id, value_numeric, date')
      .lt('date', referenceDate)
      .not('value_numeric', 'is', null)
      .order('product_id', { ascending: true })
      .order('date', { ascending: false })
      .limit(500) // Safeguard against unbounded result sets

    if (error) {
      console.error('Previous submissions fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch previous submissions' },
        { status: 500 }
      )
    }

    // Deduplicate: keep only the most recent entry per product
    const previousValues: Record<string, number> = {}
    if (data) {
      for (const row of data) {
        if (!(row.product_id in previousValues) && row.value_numeric !== null) {
          previousValues[row.product_id] = Number(row.value_numeric)
        }
      }
    }

    return NextResponse.json({ previousValues })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
