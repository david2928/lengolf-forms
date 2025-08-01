import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

interface DiscountPreviewRequest {
  discount_id: string;
  order_items?: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
  application_scope: 'item' | 'receipt';
  target_item?: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
  };
}

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: DiscountPreviewRequest = await request.json();
    const { discount_id, order_items, application_scope, target_item } = body;

    if (!discount_id || !application_scope) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use optimized RPC function for discount calculation and validation
    const { data: result, error: rpcError } = await supabase
      .schema('pos')
      .rpc('calculate_discount_preview', {
        p_discount_id: discount_id,
        p_application_scope: application_scope,
        p_order_items: order_items || null,
        p_target_item: target_item || null,
        p_current_timestamp: new Date().toISOString()
      });

    if (rpcError) {
      console.error('Error calculating discount preview:', rpcError);
      return NextResponse.json({ error: "Failed to calculate discount" }, { status: 500 });
    }

    if (!result || !result.success) {
      return NextResponse.json({ 
        error: result?.error || "Discount calculation failed" 
      }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}