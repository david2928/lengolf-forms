import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const includeExpired = searchParams.get('include_expired') === 'true';
    const includeUsed = searchParams.get('include_used') === 'true';

    const { data, error } = await refacSupabaseAdmin
      .rpc('get_all_packages_by_customer', {
        p_customer_name: decodeURIComponent(params.id),
        p_include_expired: includeExpired,
        p_include_used: includeUsed
      });

    if (error) {
      console.error('Error fetching packages by customer:', error);
      return NextResponse.json(
        { error: 'Failed to fetch packages' },
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