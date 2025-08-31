import { NextResponse } from 'next/server'
import { refacSupabaseAdmin } from '@/lib/refac-supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  try {
    // Get query parameters to determine if we should include inactive packages
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';
    
    // Check if customerId is a valid UUID (new system) or customer name (legacy)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
    
    let data, error;
    
    if (isUUID) {
      // Use new function for UUID-based lookups
      ({ data, error } = await refacSupabaseAdmin
        .schema('backoffice')
        .rpc('get_customer_packages_by_id', {
          p_customer_id: customerId,
          p_active: includeInactive ? null : true
        }));
    } else {
      // Legacy support for customer name lookups
      ({ data, error } = await refacSupabaseAdmin
        .schema('backoffice')
        .rpc('get_customer_packages', {
          p_customer_name: decodeURIComponent(customerId),
          p_active: includeInactive ? null : true
        }));
    }

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