import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const active = searchParams.get('active');
  
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data, error } = await supabase
      .rpc('get_customer_packages', {
        p_customer_name: params.id,
        p_active: active === null ? null : active === 'true'
      });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching customer packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer packages' },
      { status: 500 }
    );
  }
}