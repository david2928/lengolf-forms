import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope'); // 'item' | 'receipt'
    const productId = searchParams.get('product_id');
    const now = new Date().toISOString();

    let discounts;
    let error;

    if (scope === 'item' && productId) {
      // Use optimized RPC function for item-level discounts
      const { data, error: rpcError } = await supabase
        .schema('pos')
        .rpc('get_available_discounts_for_product', {
          p_product_id: productId,
          p_current_timestamp: now
        });
      
      discounts = data;
      error = rpcError;
    } else if (scope === 'receipt') {
      // Use optimized RPC function for receipt-level discounts
      const { data, error: rpcError } = await supabase
        .schema('pos')
        .rpc('get_available_receipt_discounts', {
          p_current_timestamp: now
        });
      
      discounts = data;
      error = rpcError;
    } else {
      // Fallback for general queries (fetch both types)
      const { data, error: queryError } = await supabase
        .schema('pos')
        .from('discounts')
        .select(`
          id, title, description, discount_type, discount_value, 
          application_scope, availability_type, valid_from, valid_until
        `)
        .eq('is_active', true)
        .or(`availability_type.eq.always,and(availability_type.eq.date_range,valid_from.lte.${now},valid_until.gte.${now})`);
      
      discounts = data;
      error = queryError;
    }

    if (error) {
      console.error('Error fetching available discounts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ discounts: discounts || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}