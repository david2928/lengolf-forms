import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';

// GET /api/admin/products/[id] - Get product details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: product, error } = await refacSupabase
      .schema('products')
      .from('products')
      .select(`
        *,
        category:category_id (
          id,
          name,
          slug,
          parent_id,
          parent:parent_id (
            name
          )
        ),
        modifiers:product_modifiers!left (
          id,
          name,
          price,
          cost_multiplier,
          modifier_type,
          is_default,
          is_active,
          display_order,
          created_at,
          updated_at,
          created_by
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      console.error('Error fetching product:', error);
      return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }

    // Get price history
    const { data: priceHistory } = await refacSupabase
      .schema('products')
      .from('price_history')
      .select('*')
      .eq('product_id', id)
      .order('changed_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        price_history: priceHistory || []
      }
    });

  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      category_id,
      description,
      price,
      cost,
      sku,
      external_code,
      vendor,
      unit,
      is_sim_usage,
      is_active,
      display_order,
      pos_display_color
    } = body;

    // Get current product for price history
    const { data: currentProduct, error: fetchError } = await refacSupabase
      .schema('products')
      .from('products')
      .select('price, cost')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch current product' }, { status: 500 });
    }

    // Validation
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return NextResponse.json({ 
        error: 'Price must be a non-negative number' 
      }, { status: 400 });
    }

    if (cost !== undefined && cost !== null && (typeof cost !== 'number' || cost < 0)) {
      return NextResponse.json({ 
        error: 'Cost must be a non-negative number' 
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {
      updated_by: session.user.email
    };

    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
    }

    if (category_id !== undefined) updateData.category_id = category_id;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (cost !== undefined) updateData.cost = cost;
    if (sku !== undefined) updateData.sku = sku || null;
    if (external_code !== undefined) updateData.external_code = external_code || null;
    if (vendor !== undefined) updateData.vendor = vendor || null;
    if (unit !== undefined) updateData.unit = unit || null;
    if (is_sim_usage !== undefined) updateData.is_sim_usage = is_sim_usage;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (pos_display_color !== undefined) updateData.pos_display_color = pos_display_color || null;

    // Update product
    const { data: product, error } = await refacSupabase
      .schema('products')
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        category:category_id (
          id,
          name,
          slug,
          parent_id,
          parent:parent_id (
            name
          )
        )
      `)
      .single();

    if (error) {
      console.error('Error updating product:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'Product with this name or SKU already exists' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    // Log price/cost change if applicable
    if ((price !== undefined && price !== currentProduct.price) || 
        (cost !== undefined && cost !== currentProduct.cost)) {
      
      const priceHistoryData = {
        product_id: id,
        old_price: currentProduct.price,
        new_price: price !== undefined ? price : currentProduct.price,
        old_cost: currentProduct.cost,
        new_cost: cost !== undefined ? cost : currentProduct.cost,
        changed_by: session.user.email,
        reason: body.reason || 'Manual update'
      };

      await refacSupabase
        .schema('products')
        .from('price_history')
        .insert(priceHistoryData);
    }

    return NextResponse.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if product exists
    const { data: product, error: fetchError } = await refacSupabase
      .schema('products')
      .from('products')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }

    // Soft delete by setting is_active = false instead of hard delete
    // This preserves data integrity and allows for recovery
    const { error } = await refacSupabase
      .schema('products')
      .from('products')
      .update({ 
        is_active: false,
        updated_by: session.user.email 
      })
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Product "${product.name}" has been deleted`
    });

  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}