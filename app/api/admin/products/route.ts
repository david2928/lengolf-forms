import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';
import { ProductFilters, ProductSort } from '@/types/product-management';

// GET /api/admin/products - List products with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const filters: ProductFilters = {
      search: searchParams.get('search') || undefined,
      category_id: searchParams.get('category_id') || undefined,
      is_active: searchParams.get('is_active') ? searchParams.get('is_active') === 'true' : undefined,
      is_sim_usage: searchParams.get('is_sim_usage') ? searchParams.get('is_sim_usage') === 'true' : undefined,
      is_custom_product: searchParams.get('is_custom_product') ? searchParams.get('is_custom_product') === 'true' : undefined,
      show_in_staff_ui: searchParams.get('show_in_staff_ui') ? searchParams.get('show_in_staff_ui') === 'true' : undefined,
      price_min: searchParams.get('price_min') ? parseFloat(searchParams.get('price_min')!) : undefined,
      price_max: searchParams.get('price_max') ? parseFloat(searchParams.get('price_max')!) : undefined,
      has_cost: searchParams.get('has_cost') ? searchParams.get('has_cost') === 'true' : undefined,
    };

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = parseInt(searchParams.get('per_page') || '100');
    const offset = (page - 1) * per_page;

    // Parse sorting
    const sort: ProductSort = {
      field: (searchParams.get('sort_field') as ProductSort['field']) || 'name',
      direction: (searchParams.get('sort_direction') as ProductSort['direction']) || 'asc'
    };

    // Build query
    let query = refacSupabase
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
        )
      `, { count: 'exact' });

    // Apply filters
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
    }

    if (filters.category_id) {
      // Check if the selected category is a parent category
      const { data: subcategories } = await refacSupabase
        .schema('products')
        .from('categories')
        .select('id')
        .eq('parent_id', filters.category_id);
      
      if (subcategories && subcategories.length > 0) {
        // If it's a parent category, include products from both the parent and its subcategories
        const categoryIds = [filters.category_id, ...subcategories.map((sub: any) => sub.id)];
        query = query.in('category_id', categoryIds);
      } else {
        // If it's not a parent category, just filter by the specific category
        query = query.eq('category_id', filters.category_id);
      }
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters.is_sim_usage !== undefined) {
      query = query.eq('is_sim_usage', filters.is_sim_usage);
    }

    if (filters.is_custom_product !== undefined) {
      query = query.eq('is_custom_product', filters.is_custom_product);
    }

    if (filters.show_in_staff_ui !== undefined) {
      query = query.eq('show_in_staff_ui', filters.show_in_staff_ui);
    }

    if (filters.price_min !== undefined) {
      query = query.gte('price', filters.price_min);
    }

    if (filters.price_max !== undefined) {
      query = query.lte('price', filters.price_max);
    }

    if (filters.has_cost !== undefined) {
      if (filters.has_cost) {
        query = query.not('cost', 'is', null).gt('cost', 0);
      } else {
        query = query.or('cost.is.null,cost.eq.0');
      }
    }

    // Apply sorting
    const sortColumn = sort.field === 'display_order' ? 'display_order' : sort.field;
    query = query.order(sortColumn, { ascending: sort.direction === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + per_page - 1);

    const { data: products, error, count } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Get categories for filter options
    const { data: categories } = await refacSupabase
      .schema('products')
      .from('categories')
      .select('*')
      .order('display_order');

    const total_pages = Math.ceil((count || 0) / per_page);

    return NextResponse.json({
      success: true,
      data: products,
      meta: {
        pagination: {
          page,
          per_page,
          total_count: count || 0,
          total_pages,
          has_next: page < total_pages,
          has_prev: page > 1
        },
        filters,
        categories: categories || [],
        total_count: count || 0
      }
    });

  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/products - Create new product
export async function POST(request: NextRequest) {
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
      is_sim_usage = false,
      is_active = true,
      display_order,
      pos_display_color
    } = body;

    // Validation
    if (!name || !category_id || price === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, category_id, price' 
      }, { status: 400 });
    }

    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json({ 
        error: 'Price must be a non-negative number' 
      }, { status: 400 });
    }

    if (cost !== undefined && (typeof cost !== 'number' || cost < 0)) {
      return NextResponse.json({ 
        error: 'Cost must be a non-negative number' 
      }, { status: 400 });
    }

    // Generate slug
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    const { data: product, error } = await refacSupabase
      .schema('products')
      .from('products')
      .insert({
        name,
        slug,
        category_id,
        description: description && description.trim() ? description.trim() : null,
        price,
        cost: cost || null,
        sku: sku && sku.trim() ? sku.trim() : null,
        external_code: external_code && external_code.trim() ? external_code.trim() : null,
        vendor: vendor && vendor.trim() ? vendor.trim() : null,
        unit: unit && unit.trim() ? unit.trim() : null,
        is_sim_usage,
        is_active,
        display_order: display_order || 0,
        pos_display_color: pos_display_color || null,
        created_by: session.user.email,
        is_custom_product: false,
        show_in_staff_ui: true
      })
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
      console.error('Error creating product:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'Product with this name or SKU already exists' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: product
    }, { status: 201 });

  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}