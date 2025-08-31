import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';

// GET /api/admin/products/[id]/modifiers - Get modifiers for a product
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const productId = id;

    // Get product and its modifiers
    const { data: product, error: productError } = await refacSupabase
      .schema('products')
      .from('products')
      .select('id, name, has_modifiers, cost')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get modifiers for this product
    const { data: modifiers, error: modifiersError } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (modifiersError) {
      console.error('Error fetching modifiers:', modifiersError);
      return NextResponse.json({ error: 'Failed to fetch modifiers' }, { status: 500 });
    }

    // Calculate profit margins for each modifier
    const modifiersWithMargins = (modifiers || []).map((modifier: any) => {
      const actualCost = (product.cost || 0) * modifier.cost_multiplier;
      const profitMargin = modifier.price > 0 
        ? ((modifier.price - actualCost) / modifier.price * 100)
        : 0;

      return {
        ...modifier,
        actual_cost: actualCost,
        profit_margin: Math.round(profitMargin * 100) / 100
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          has_modifiers: product.has_modifiers,
          base_cost: product.cost
        },
        modifiers: modifiersWithMargins,
        modifier_type: modifiers && modifiers.length > 0 ? modifiers[0].modifier_type : null
      }
    });

  } catch (error) {
    console.error('Get modifiers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/products/[id]/modifiers - Create new modifier
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const productId = id;
    const body = await request.json();
    const {
      name,
      price,
      cost_multiplier = 1.0,
      modifier_type,
      is_default = false,
      display_order = 0
    } = body;

    // Validation
    if (!name || !modifier_type || price === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, modifier_type, price' 
      }, { status: 400 });
    }

    if (!['time', 'quantity'].includes(modifier_type)) {
      return NextResponse.json({ 
        error: 'modifier_type must be either "time" or "quantity"' 
      }, { status: 400 });
    }

    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json({ 
        error: 'Price must be a non-negative number' 
      }, { status: 400 });
    }

    if (typeof cost_multiplier !== 'number' || cost_multiplier < 0) {
      return NextResponse.json({ 
        error: 'Cost multiplier must be a non-negative number' 
      }, { status: 400 });
    }

    // Verify product exists
    const { data: product, error: productError } = await refacSupabase
      .schema('products')
      .from('products')
      .select('id, has_modifiers')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // If this is the first modifier, enable modifiers for the product
    if (!product.has_modifiers) {
      await refacSupabase
        .schema('products')
        .from('products')
        .update({ has_modifiers: true })
        .eq('id', productId);
    }

    // If is_default is true, remove default from other modifiers of this product
    if (is_default) {
      await refacSupabase
        .schema('products')
        .from('product_modifiers')
        .update({ is_default: false })
        .eq('product_id', productId);
    }

    // Create the modifier
    const { data: modifier, error } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .insert({
        product_id: productId,
        name: name.trim(),
        price,
        cost_multiplier,
        modifier_type,
        is_default,
        display_order,
        is_active: true,
        created_by: session.user.email
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating modifier:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'A modifier with this name already exists for this product' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'Failed to create modifier' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: modifier
    }, { status: 201 });

  } catch (error) {
    console.error('Create modifier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}