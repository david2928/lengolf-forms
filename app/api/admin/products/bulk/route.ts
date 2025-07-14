import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';

// POST /api/admin/products/bulk - Bulk operations on products
export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { operation, product_ids, updates, reason } = body;

    if (!operation || !product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: operation, product_ids' 
      }, { status: 400 });
    }

    let results: { success: number; failed: number; errors: string[] } = { success: 0, failed: 0, errors: [] };

    switch (operation) {
      case 'update_prices':
        results = await bulkUpdatePrices(product_ids, updates, session.user.email, reason);
        break;
      
      case 'update_category':
        results = await bulkUpdateCategory(product_ids, updates.category_id, session.user.email);
        break;
      
      case 'update_status':
        results = await bulkUpdateStatus(product_ids, updates.is_active, session.user.email);
        break;
      
      case 'update_fields':
        results = await bulkUpdateFields(product_ids, updates, session.user.email);
        break;
      
      case 'delete':
        results = await bulkDelete(product_ids, session.user.email);
        break;
      
      default:
        return NextResponse.json({ 
          error: 'Invalid operation. Supported: update_prices, update_category, update_status, update_fields, delete' 
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Bulk operations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function: Bulk update prices
async function bulkUpdatePrices(productIds: string[], updates: any, userEmail: string, reason?: string) {
  const results: { success: number; failed: number; errors: string[] } = { success: 0, failed: 0, errors: [] };
  
  for (const productId of productIds) {
    try {
      // Get current product data
      const { data: currentProduct, error: fetchError } = await refacSupabase
        .schema('products')
        .from('products')
        .select('price, cost, name')
        .eq('id', productId)
        .single();

      if (fetchError) {
        results.failed++;
        results.errors.push(`Product ${productId}: ${fetchError.message}`);
        continue;
      }

      // Calculate new price
      let newPrice = currentProduct.price;
      let newCost = updates.cost !== undefined ? updates.cost : currentProduct.cost;

      if (updates.price !== undefined) {
        newPrice = updates.price;
      } else if (updates.price_adjustment) {
        if (updates.price_adjustment.type === 'percentage') {
          newPrice = currentProduct.price * (1 + updates.price_adjustment.value / 100);
        } else if (updates.price_adjustment.type === 'fixed') {
          newPrice = currentProduct.price + updates.price_adjustment.value;
        }
      }

      // Update product
      const { error: updateError } = await refacSupabase
        .schema('products')
        .from('products')
        .update({
          price: Math.round(newPrice * 100) / 100, // Round to 2 decimal places
          cost: newCost,
          updated_by: userEmail
        })
        .eq('id', productId);

      if (updateError) {
        results.failed++;
        results.errors.push(`Product ${currentProduct.name}: ${updateError.message}`);
        continue;
      }

      // Log price change
      if (newPrice !== currentProduct.price || newCost !== currentProduct.cost) {
        await refacSupabase
          .schema('products')
          .from('price_history')
          .insert({
            product_id: productId,
            old_price: currentProduct.price,
            new_price: newPrice,
            old_cost: currentProduct.cost,
            new_cost: newCost,
            changed_by: userEmail,
            reason: reason || 'Bulk price update'
          });
      }

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

// Helper function: Bulk update category
async function bulkUpdateCategory(productIds: string[], categoryId: string, userEmail: string) {
  const results: { success: number; failed: number; errors: string[] } = { success: 0, failed: 0, errors: [] };

  // Verify category exists
  const { data: category, error: categoryError } = await refacSupabase
    .schema('products')
    .from('categories')
    .select('id, name')
    .eq('id', categoryId)
    .single();

  if (categoryError) {
    return {
      success: 0,
      failed: productIds.length,
      errors: [`Invalid category: ${categoryError.message}`]
    };
  }

  for (const productId of productIds) {
    try {
      const { error } = await refacSupabase
        .schema('products')
        .from('products')
        .update({
          category_id: categoryId,
          updated_by: userEmail
        })
        .eq('id', productId);

      if (error) {
        results.failed++;
        results.errors.push(`Product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } else {
        results.success++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

// Helper function: Bulk update status
async function bulkUpdateStatus(productIds: string[], isActive: boolean, userEmail: string) {
  const results: { success: number; failed: number; errors: string[] } = { success: 0, failed: 0, errors: [] };

  for (const productId of productIds) {
    try {
      const { error } = await refacSupabase
        .schema('products')
        .from('products')
        .update({
          is_active: isActive,
          updated_by: userEmail
        })
        .eq('id', productId);

      if (error) {
        results.failed++;
        results.errors.push(`Product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } else {
        results.success++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

// Helper function: Bulk update multiple fields
async function bulkUpdateFields(productIds: string[], updates: any, userEmail: string) {
  const results: { success: number; failed: number; errors: string[] } = { success: 0, failed: 0, errors: [] };

  // Prepare update object
  const updateData: any = {
    updated_by: userEmail
  };

  // Only include defined fields
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
  if (updates.is_sim_usage !== undefined) updateData.is_sim_usage = updates.is_sim_usage;
  if (updates.show_in_staff_ui !== undefined) updateData.show_in_staff_ui = updates.show_in_staff_ui;
  if (updates.unit !== undefined) updateData.unit = updates.unit;
  if (updates.pos_display_color !== undefined) updateData.pos_display_color = updates.pos_display_color;

  for (const productId of productIds) {
    try {
      const { error } = await refacSupabase
        .schema('products')
        .from('products')
        .update(updateData)
        .eq('id', productId);

      if (error) {
        results.failed++;
        results.errors.push(`Product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } else {
        results.success++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

// Helper function: Bulk delete (soft delete)
async function bulkDelete(productIds: string[], userEmail: string) {
  const results: { success: number; failed: number; errors: string[] } = { success: 0, failed: 0, errors: [] };

  for (const productId of productIds) {
    try {
      const { error } = await refacSupabase
        .schema('products')
        .from('products')
        .update({
          is_active: false,
          updated_by: userEmail
        })
        .eq('id', productId);

      if (error) {
        results.failed++;
        results.errors.push(`Product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } else {
        results.success++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}