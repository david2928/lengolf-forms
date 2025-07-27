import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';
import { CategoryFilters, CategorySort } from '@/types/product-management';

// GET /api/admin/products/categories - List categories with hierarchy
export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeHierarchy = searchParams.get('include_hierarchy') === 'true';
    const includeProductCount = searchParams.get('include_product_count') === 'true';
    
    // Parse filters
    const filters: CategoryFilters = {
      search: searchParams.get('search') || undefined,
      parent_id: searchParams.get('parent_id') || undefined,
      is_active: searchParams.get('is_active') ? searchParams.get('is_active') === 'true' : undefined,
    };

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = parseInt(searchParams.get('per_page') || '50');
    const offset = (page - 1) * per_page;

    // Parse sorting
    const sort: CategorySort = {
      field: (searchParams.get('sort_field') as CategorySort['field']) || 'display_order',
      direction: (searchParams.get('sort_direction') as CategorySort['direction']) || 'asc'
    };

    // Build base query
    let query = refacSupabase
      .schema('products')
      .from('categories')
      .select(`
        *,
        parent:parent_id (
          id,
          name,
          slug
        )
        ${includeProductCount ? ',products(count)' : ''}
      `, { count: 'exact' });

    // Apply filters
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.parent_id) {
      query = query.eq('parent_id', filters.parent_id);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    // Apply sorting
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + per_page - 1);

    const { data: categories, error, count } = await query;

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    let hierarchy = null;
    if (includeHierarchy) {
      // Build category hierarchy
      hierarchy = await buildCategoryHierarchy();
    }

    const total_pages = Math.ceil((count || 0) / per_page);

    return NextResponse.json({
      success: true,
      data: categories,
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
        hierarchy,
        total_count: count || 0
      }
    });

  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/products/categories - Create new category
export async function POST(request: NextRequest) {
  try {
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
      is_active = true
    } = body;

    // Validation
    if (!name) {
      return NextResponse.json({ 
        error: 'Missing required field: name' 
      }, { status: 400 });
    }

    // Generate slug
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    const { data: category, error } = await refacSupabase
      .schema('products')
      .from('categories')
      .insert({
        name,
        slug,
        parent_id: parent_id || null,
        description: description || null,
        display_order: display_order || 0,
        color_code: color_code || null,
        icon: icon || null,
        is_active
      })
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
      console.error('Error creating category:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          error: 'Category with this name already exists' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: category
    }, { status: 201 });

  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to build category hierarchy
async function buildCategoryHierarchy() {
  const { data: allCategories, error } = await refacSupabase
    .schema('products')
    .from('categories')
    .select(`
      *,
      products(count)
    `)
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('Error building hierarchy:', error);
    return null;
  }

  // Build hierarchy tree
  const categoryMap = new Map();
  const rootCategories: any[] = [];

  // First pass: create map of all categories
  allCategories.forEach((cat: any) => {
    categoryMap.set(cat.id, {
      ...cat,
      children: [],
      product_count: cat.products?.[0]?.count || 0
    });
  });

  // Second pass: build parent-child relationships
  allCategories.forEach((cat: any) => {
    const category = categoryMap.get(cat.id);
    if (cat.parent_id) {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        parent.children.push(category);
      }
    } else {
      rootCategories.push(category);
    }
  });

  // Calculate total values for parent categories
  function calculateTotals(categories: any[]): any[] {
    return categories.map((cat: any) => {
      if (cat.children.length > 0) {
        const childTotals = calculateTotals(cat.children);
        cat.total_products = childTotals.reduce((sum: number, child: any) => 
          sum + (child.total_products || child.product_count), 0);
      } else {
        cat.total_products = cat.product_count;
      }
      return cat;
    });
  }

  return calculateTotals(rootCategories);
}