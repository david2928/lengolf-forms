import { NextRequest, NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/inventory/submissions/previous
 * Returns the most recent submission values per product before today.
 * Used to show spike warnings when current entry is >20% higher than previous.
 * Auth handled by middleware - no explicit check needed (matches sibling routes).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD, defaults to today

    // Validate date format if provided
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD.' },
        { status: 400 }
      )
    }

    // Use Bangkok timezone to avoid wrong date during early morning hours (2 AM Bangkok = 7 PM UTC previous day)
    const referenceDate = date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())

    // Use RPC with DISTINCT ON for efficient deduplication at the DB level
    // This ensures we get the most recent submission for each product
    const { data, error } = await refacSupabaseAdmin
      .rpc('get_previous_inventory_values', {
        p_reference_date: referenceDate,
      })

    if (error) {
      console.error('Previous submissions fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch previous submissions' },
        { status: 500 }
      )
    }

    // Transform RPC result to a simple map
    const previousValues: Record<string, number> = {}
    if (data) {
      for (const row of data as Array<{ product_id: string; value_numeric: number }>) {
        if (row.value_numeric !== null) {
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
