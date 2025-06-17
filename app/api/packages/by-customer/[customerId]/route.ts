import { NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { customerId: string } }
) {
  try {
    const { data, error } = await refacSupabaseAdmin
      .rpc('get_active_packages_by_customer', {
        p_customer_name: decodeURIComponent(params.customerId)
      })

    if (error) {
      console.error('Error fetching active packages by customer:', error)
      return NextResponse.json(
        { error: 'Failed to fetch packages' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/packages/by-customer/[customerId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}