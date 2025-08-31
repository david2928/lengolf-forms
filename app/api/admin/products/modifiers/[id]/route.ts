import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';

// PUT /api/admin/products/modifiers/[id] - Update modifier
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: modifierId } = await params;
    
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const {
      name,
      price,
      cost_multiplier,
      is_default,
      display_order,
      is_active
    } = body;

    // Get existing modifier
    const { data: existingModifier, error: fetchError } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .select('*')
      .eq('id', modifierId)
      .single();

    if (fetchError || !existingModifier) {
      return NextResponse.json({ error: "Modifier not found" }, { status: 404 });
    }

    // Validation
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return NextResponse.json({ 
        error: 'Price must be a non-negative number' 
      }, { status: 400 });
    }

    if (cost_multiplier !== undefined && (typeof cost_multiplier !== 'number' || cost_multiplier < 0)) {
      return NextResponse.json({ 
        error: 'Cost multiplier must be a non-negative number' 
      }, { status: 400 });
    }

    // If setting this as default, remove default from other modifiers of the same product
    if (is_default === true) {
      await refacSupabase
        .schema('products')
        .from('product_modifiers')
        .update({ is_default: false })
        .eq('product_id', existingModifier.product_id)
        .neq('id', modifierId);
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = price;
    if (cost_multiplier !== undefined) updateData.cost_multiplier = cost_multiplier;
    if (is_default !== undefined) updateData.is_default = is_default;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Update the modifier
    const { data: modifier, error } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .update(updateData)
      .eq('id', modifierId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating modifier:', error);
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

// DELETE /api/admin/products/modifiers/[id] - Delete modifier
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: modifierId } = await params;
    
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get modifier to check if it exists and get product_id
    const { data: modifier, error: fetchError } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .select('id, product_id, is_default')
      .eq('id', modifierId)
      .single();

    if (fetchError || !modifier) {
      return NextResponse.json({ error: "Modifier not found" }, { status: 404 });
    }

    // Delete the modifier
    const { error: deleteError } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .delete()
      .eq('id', modifierId);

    if (deleteError) {
      console.error('Error deleting modifier:', deleteError);
      return NextResponse.json({ error: 'Failed to delete modifier' }, { status: 500 });
    }

    // Check if this was the last modifier for the product
    const { data: remainingModifiers } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .select('id')
      .eq('product_id', modifier.product_id)
      .eq('is_active', true);

    // If no modifiers remain, disable modifiers for the product
    if (!remainingModifiers || remainingModifiers.length === 0) {
      await refacSupabase
        .schema('products')
        .from('products')
        .update({ has_modifiers: false })
        .eq('id', modifier.product_id);
    } else if (modifier.is_default) {
      // If deleted modifier was default, make the first remaining one default
      const firstModifier = remainingModifiers[0];
      if (firstModifier) {
        await refacSupabase
          .schema('products')
          .from('product_modifiers')
          .update({ is_default: true })
          .eq('id', firstModifier.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Modifier deleted successfully'
    });

  } catch (error) {
    console.error('Delete modifier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}