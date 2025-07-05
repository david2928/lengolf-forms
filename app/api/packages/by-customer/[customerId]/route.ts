import { NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { customerId: string } }
) {
  try {
    // Get query parameters to determine if we should include inactive packages
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';
    
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .rpc('get_customer_packages', {
        p_customer_name: decodeURIComponent(params.customerId),
        p_active: includeInactive ? null : true // null = all packages, true = only active
      })

    if (error) {
      console.error('Error fetching packages by customer:', error)
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