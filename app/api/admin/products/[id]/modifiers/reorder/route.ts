import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';

// PUT /api/admin/products/[id]/modifiers/reorder - Reorder modifiers
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const productId = id;
    const body = await request.json();
    const { modifierId, targetDisplayOrder } = body;

    // Validation
    if (!modifierId || targetDisplayOrder === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: modifierId, targetDisplayOrder' 
      }, { status: 400 });
    }

    // Verify product exists
    const { data: product, error: productError } = await refacSupabase
      .schema('products')
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get current modifier
    const { data: currentModifier, error: modifierError } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .select('id, display_order')
      .eq('id', modifierId)
      .eq('product_id', productId)
      .single();

    if (modifierError || !currentModifier) {
      return NextResponse.json({ error: "Modifier not found" }, { status: 404 });
    }

    // Get all modifiers for this product to adjust orders
    const { data: allModifiers, error: allModifiersError } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .select('id, display_order')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (allModifiersError) {
      return NextResponse.json({ error: 'Failed to fetch modifiers' }, { status: 500 });
    }

    // Calculate new display orders
    const currentOrder = currentModifier.display_order;
    const newOrder = targetDisplayOrder;

    // Update orders in a transaction-like manner
    if (currentOrder !== newOrder) {
      const updates: Promise<any>[] = [];

      // If moving down (increasing order), shift others up
      if (newOrder > currentOrder) {
        // Update all modifiers between current and target positions
        const affectedModifiers = allModifiers.filter((m: any) => 
          m.display_order > currentOrder && m.display_order <= newOrder && m.id !== modifierId
        );
        
        for (const modifier of affectedModifiers) {
          updates.push(
            refacSupabase
              .schema('products')
              .from('product_modifiers')
              .update({ display_order: modifier.display_order - 1 })
              .eq('id', modifier.id)
          );
        }
      } 
      // If moving up (decreasing order), shift others down
      else {
        // Update all modifiers between target and current positions
        const affectedModifiers = allModifiers.filter((m: any) => 
          m.display_order >= newOrder && m.display_order < currentOrder && m.id !== modifierId
        );
        
        for (const modifier of affectedModifiers) {
          updates.push(
            refacSupabase
              .schema('products')
              .from('product_modifiers')
              .update({ display_order: modifier.display_order + 1 })
              .eq('id', modifier.id)
          );
        }
      }

      // Update the dragged modifier to its new position
      updates.push(
        refacSupabase
          .schema('products')
          .from('product_modifiers')
          .update({ display_order: newOrder })
          .eq('id', modifierId)
      );

      // Execute all updates
      await Promise.all(updates);
    }

    // Return updated modifiers
    const { data: updatedModifiers, error: fetchError } = await refacSupabase
      .schema('products')
      .from('product_modifiers')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch updated modifiers' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedModifiers
    });

  } catch (error) {
    console.error('Reorder modifiers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}