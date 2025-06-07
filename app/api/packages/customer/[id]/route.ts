import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .rpc('get_packages_by_customer_name', {
        p_customer_name: decodeURIComponent(params.id)
      });

    if (error) {
      console.error('Error fetching customer packages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customer packages' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/packages/customer/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}