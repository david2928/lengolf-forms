import { NextRequest, NextResponse } from 'next/server'
import { refacSupabase as supabase } from '@/lib/refac-supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/inventory/submissions/previous
 * Returns the most recent submission values per product before today.
 * Used to show spike warnings when current entry is >20% higher than previous.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD, defaults to today

    const referenceDate = date || new Date().toISOString().split('T')[0]

    // Get the most recent submission for each product before the reference date.
    // We use DISTINCT ON to get the latest entry per product.
    const { data, error } = await supabase.rpc('get_previous_inventory_values', {
      p_reference_date: referenceDate,
    })

    if (error) {
      // If RPC doesn't exist, fall back to a direct query
      if (error.code === '42883') {
        // Function doesn't exist - use direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('inventory_submission')
          .select('product_id, value_numeric, date')
          .lt('date', referenceDate)
          .not('value_numeric', 'is', null)
          .order('date', { ascending: false })

        if (fallbackError) {
          console.error('Previous submissions fetch error:', fallbackError)
          return NextResponse.json(
            { error: 'Failed to fetch previous submissions' },
            { status: 500 }
          )
        }

        // Deduplicate: keep only the most recent entry per product
        const previousValues: Record<string, number> = {}
        if (fallbackData) {
          for (const row of fallbackData) {
            if (!(row.product_id in previousValues) && row.value_numeric !== null) {
              previousValues[row.product_id] = Number(row.value_numeric)
            }
          }
        }

        return NextResponse.json({ previousValues })
      }

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
