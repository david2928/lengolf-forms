import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .rpc('get_customers_with_packages', {
        p_active_only: active === null ? null : active === 'true'
      });

    if (error) {
      console.error('Error fetching customers with packages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customers with packages' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/customers/with-packages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}