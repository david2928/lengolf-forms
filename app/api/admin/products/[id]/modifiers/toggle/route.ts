import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';

// PATCH /api/admin/products/[id]/modifiers/toggle - Enable/disable modifiers for product
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const productId = id;
    const body = await request.json();
    const { has_modifiers, modifier_type } = body;

    // Validation
    if (typeof has_modifiers !== 'boolean') {
      return NextResponse.json({ 
        error: 'has_modifiers must be a boolean value' 
      }, { status: 400 });
    }

    if (has_modifiers && modifier_type && !['time', 'quantity'].includes(modifier_type)) {
      return NextResponse.json({ 
        error: 'modifier_type must be either "time" or "quantity"' 
      }, { status: 400 });
    }

    // Verify product exists
    const { data: product, error: productError } = await refacSupabase
      .schema('products')
      .from('products')
      .select('id, name, has_modifiers')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Update product modifiers flag
    const { error: updateError } = await refacSupabase
      .schema('products')
      .from('products')
      .update({ has_modifiers })
      .eq('id', productId);

    if (updateError) {
      console.error('Error updating product:', updateError);
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    // If disabling modifiers, deactivate all existing modifiers for this product
    if (!has_modifiers) {
      await refacSupabase
        .schema('products')
        .from('product_modifiers')
        .update({ is_active: false })
        .eq('product_id', productId);
    } else if (has_modifiers && !product.has_modifiers) {
      // If enabling modifiers for the first time, reactivate existing modifiers
      await refacSupabase
        .schema('products')
        .from('product_modifiers')
        .update({ is_active: true })
        .eq('product_id', productId);
    }

    // Get current modifiers after update
    const { data: modifiers } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('display_order');

    return NextResponse.json({
      success: true,
      data: {
        product_id: productId,
        has_modifiers,
        modifier_type: modifiers && modifiers.length > 0 ? modifiers[0].modifier_type : modifier_type,
        active_modifiers_count: modifiers ? modifiers.length : 0
      }
    });

  } catch (error) {
    console.error('Toggle modifiers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}