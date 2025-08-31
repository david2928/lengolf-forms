import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';

// GET /api/admin/products/categories/[id] - Get category details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: category, error } = await refacSupabase
      .schema('products')
      .from('categories')
      .select(`
        *,
        parent:parent_id (
          id,
          name,
          slug
        ),
        products(count)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
      console.error('Error fetching category:', error);
      return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error('Get category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/products/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      parent_id,
      description,
      display_order,
      color_code,
      icon,
      is_active
    } = body;

    // Validation
    if (name !== undefined && !name) {
      return NextResponse.json({ 
        error: 'Name cannot be empty' 
      }, { status: 400 });
    }

    // Check if category exists
    const { data: existingCategory, error: fetchError } = await refacSupabase
      .schema('products')
      .from('categories')
      .select('id, name, slug')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name;
      // Regenerate slug if name changes
      updateData.slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
    }
    
    if (parent_id !== undefined) updateData.parent_id = parent_id || null;
    if (description !== undefined) updateData.description = description || null;
    if (display_order !== undefined) updateData.display_order = display_order || 0;
    if (color_code !== undefined) updateData.color_code = color_code || null;
    if (icon !== undefined) updateData.icon = icon || null;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    // Add audit fields
    updateData.updated_at = new Date().toISOString();

    const { data: category, error } = await refacSupabase
      .schema('products')
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        parent:parent_id (
          id,
          name,
          slug
        )
      `)
      .single();

    if (error) {
      console.error('Error updating category:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'Category with this name already exists' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/products/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if category exists
    const { data: existingCategory, error: fetchError } = await refacSupabase
      .schema('products')
      .from('categories')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
    }

    // Check if category has products
    const { data: products, error: productsError } = await refacSupabase
      .schema('products')
      .from('products')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (productsError) {
      console.error('Error checking products:', productsError);
      return NextResponse.json({ error: 'Failed to check category usage' }, { status: 500 });
    }

    if (products && products.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete category that contains products. Please move or delete the products first.' 
      }, { status: 400 });
    }

    // Check if category has child categories
    const { data: children, error: childrenError } = await refacSupabase
      .schema('products')
      .from('categories')
      .select('id')
      .eq('parent_id', id)
      .limit(1);

    if (childrenError) {
      console.error('Error checking child categories:', childrenError);
      return NextResponse.json({ error: 'Failed to check category children' }, { status: 500 });
    }

    if (children && children.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete category that has subcategories. Please delete or move the subcategories first.' 
      }, { status: 400 });
    }

    // Delete the category
    const { error } = await refacSupabase
      .schema('products')
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Category "${existingCategory.name}" deleted successfully`
    });

  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}