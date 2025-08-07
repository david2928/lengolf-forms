import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';

// PUT /api/admin/products/[id]/modifiers/[modifierId] - Update modifier
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; modifierId: string } }
) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productId = params.id;
    const modifierId = params.modifierId;
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

    // Verify modifier exists and belongs to the product
    const { data: existingModifier, error: fetchError } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .select('id, product_id')
      .eq('id', modifierId)
      .eq('product_id', productId)
      .single();

    if (fetchError || !existingModifier) {
      return NextResponse.json({ error: "Modifier not found" }, { status: 404 });
    }

    // If is_default is true, remove default from other modifiers of this product
    if (is_default) {
      await refacSupabase
        .schema('products')
        .from('product_modifiers')
        .update({ is_default: false })
        .eq('product_id', productId)
        .neq('id', modifierId);
    }

    // Update the modifier
    const { data: modifier, error } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .update({
        name: name.trim(),
        price,
        cost_multiplier,
        modifier_type,
        is_default,
        display_order,
        updated_at: new Date().toISOString(),
        created_by: session.user.email // Keep track of who last updated
      })
      .eq('id', modifierId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating modifier:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'A modifier with this name already exists for this product' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'Failed to update modifier' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: modifier
    });

  } catch (error) {
    console.error('Update modifier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id]/modifiers/[modifierId] - Delete modifier
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; modifierId: string } }
) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productId = params.id;
    const modifierId = params.modifierId;

    // Verify modifier exists and belongs to the product
    const { data: existingModifier, error: fetchError } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .select('id, product_id, name, is_default')
      .eq('id', modifierId)
      .eq('product_id', productId)
      .single();

    if (fetchError || !existingModifier) {
      return NextResponse.json({ error: "Modifier not found" }, { status: 404 });
    }

    // Check if this is the default modifier and if there are other modifiers
    if (existingModifier.is_default) {
      const { data: otherModifiers, error: countError } = await refacSupabase
        .schema('products')
        .from('product_modifiers')
        .select('id')
        .eq('product_id', productId)
        .neq('id', modifierId)
        .eq('is_active', true);

      if (countError) {
        return NextResponse.json({ error: 'Failed to check other modifiers' }, { status: 500 });
      }

      // If there are other modifiers, make the first one default
      if (otherModifiers && otherModifiers.length > 0) {
        await refacSupabase
          .schema('products')
          .from('product_modifiers')
          .update({ is_default: true })
          .eq('id', otherModifiers[0].id);
      }
    }

    // Soft delete by setting is_active = false
    const { error } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', modifierId);

    if (error) {
      console.error('Error deleting modifier:', error);
      return NextResponse.json({ error: 'Failed to delete modifier' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Modifier "${existingModifier.name}" has been deleted`
    });

  } catch (error) {
    console.error('Delete modifier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}