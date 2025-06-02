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

    console.log('Fetching packages for customer:', params.id);

    // Use the RPC function to get customer packages with calculated hours
    // Note: The RPC function needs to be updated to include package_type field
    const { data, error } = await supabase
      .rpc('get_customer_packages', {
        p_customer_name: params.id,
        p_active: active === 'true' ? true : active === 'false' ? false : null
      });

    if (error) {
      console.error('RPC error:', error);
      throw error;
    }

    console.log('RPC package data:', JSON.stringify(data, null, 2));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching customer packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer packages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}