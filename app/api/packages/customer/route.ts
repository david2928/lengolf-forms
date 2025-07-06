import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerName = searchParams.get('customerName');
    const customerPhone = searchParams.get('customerPhone');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    if (!customerName) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      );
    }

    // Call the database function to get customer packages
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .rpc('get_customer_packages', {
        p_customer_name: decodeURIComponent(customerName),
        p_active: includeInactive ? null : true // null = all packages, true = only active
      });

    if (error) {
      console.error('Error fetching customer packages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch packages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ packages: data || [] });
  } catch (error) {
    console.error('Error in GET /api/packages/customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}