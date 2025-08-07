import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { CreateCustomProductRequest, CreateCustomProductResponse } from '@/types/pos';

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateCustomProductRequest = await request.json();
    const { name, price, description, createdBy, categoryId } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: "Product name is required" 
      }, { status: 400 });
    }

    if (!price || price <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Valid price is required" 
      }, { status: 400 });
    }

    if (!createdBy?.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: "Created by is required" 
      }, { status: 400 });
    }

    // Get the "Other" category ID if not provided
    let finalCategoryId = categoryId;
    if (!finalCategoryId) {
      const { data: otherCategory, error: categoryError } = await supabase
        .schema('products')
        .from('categories')
        .select('id')
        .eq('slug', 'golf-other')
        .single();

      if (categoryError || !otherCategory) {
        return NextResponse.json({ 
          success: false, 
          error: "Could not find 'Other' category for custom product" 
        }, { status: 500 });
      }
      
      finalCategoryId = otherCategory.id;
    }

    // Create a slug from the product name
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();

    // Ensure slug is unique by appending timestamp
    const uniqueSlug = `custom-${slug}-${Date.now()}`;

    // Create the custom product
    const { data: newProduct, error: createError } = await supabase
      .schema('products')
      .from('products')
      .insert({
        category_id: finalCategoryId,
        name: name.trim(),
        slug: uniqueSlug,
        description: description?.trim() || null,
        price: price,
        cost: 0, // Custom products have no cost basis
        sku: null, // Custom products don't have SKUs
        external_code: null,
        unit: 'item', // Default unit
        is_sim_usage: false,
        is_active: true,
        display_order: 0,
        pos_display_color: '#6B7280', // Gray color for custom products
        legacy_qashier_id: null,
        legacy_pos_name: null,
        created_by: createdBy.trim(),
        updated_by: createdBy.trim(),
        is_custom_product: true, // Mark as custom product
        custom_created_by: createdBy.trim(),
        show_in_staff_ui: false // Hide from main catalog
        // Note: profit_margin is excluded as it's a generated column
      })
      .select(`
        id,
        category_id,
        name,
        slug,
        description,
        price,
        cost,
        sku,
        external_code,
        unit,
        is_sim_usage,
        is_active,
        display_order,  
        pos_display_color,
        legacy_qashier_id,
        legacy_pos_name,
        created_at,
        updated_at,
        created_by,
        updated_by,
        is_custom_product,
        custom_created_by,
        show_in_staff_ui
      `)
      .single();

    if (createError) {
      console.error('Error creating custom product:', createError);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to create custom product" 
      }, { status: 500 });
    }

    // Transform the database result to POSProduct format
    const posProduct = {
      id: newProduct.id,
      name: newProduct.name,
      price: parseFloat(newProduct.price),
      unit: newProduct.unit || 'item',
      categoryId: newProduct.category_id,
      categoryName: 'Other', // We know it's in the Other category
      sku: newProduct.sku,
      description: newProduct.description,
      posDisplayColor: newProduct.pos_display_color,
      imageUrl: undefined, // Custom products don't have images
      hasModifiers: false, // Custom products don't have modifiers
      modifiers: [], // Custom products don't have modifiers
      isActive: newProduct.is_active,
      isCustomProduct: newProduct.is_custom_product,
      customCreatedBy: newProduct.custom_created_by,
      showInStaffUi: newProduct.show_in_staff_ui
    };

    const response: CreateCustomProductResponse = {
      success: true,
      product: posProduct
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in POST /api/pos/products/custom:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error" 
      },
      { status: 500 }
    );
  }
}