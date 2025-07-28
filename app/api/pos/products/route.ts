import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// Type definitions for products
interface DatabaseProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  category_id: string;
  sku: string;
  description: string;
  is_active: boolean;
  show_in_staff_ui: boolean;
  pos_display_color: string;
  categories: DatabaseCategory;
}

interface DatabaseCategory {
  id: string;
  name: string;
  parent_id: string | null;
}

interface TransformedProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  categoryId: string;
  categoryName?: string;
  sku: string;
  description: string;
  posDisplayColor: string;
  imageUrl: null;
  modifiers: any[];
  isActive: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const loadAll = searchParams.get('all') === 'true';
    
    // Validate and sanitize pagination parameters
    let page = parseInt(searchParams.get('page') || '1');
    let limit = parseInt(searchParams.get('limit') || '50');
    
    // Ensure page is at least 1
    if (isNaN(page) || page < 1) {
      page = 1;
    }
    
    // Ensure limit is between 1 and 100
    if (isNaN(limit) || limit < 1) {
      limit = 50;
    } else if (limit > 100) {
      limit = 100;
    }
    
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const offset = (page - 1) * limit;

    // Build query for POS-optimized product retrieval
    let query = refacSupabaseAdmin
      .schema('products')
      .from('products')
      .select(`
        id,
        name,
        price,
        unit,
        category_id,
        sku,
        description,
        is_active,
        show_in_staff_ui,
        pos_display_color,
        categories!inner(
          id,
          name,
          parent_id
        )
      `)
      .eq('is_active', true)
      .eq('show_in_staff_ui', true);

    // Apply category filter
    if (category) {
      query = query.eq('categories.name', category);
    }

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination only if not loading all products
    if (!loadAll) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: products, error: productsError, count } = await query;

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }

    // Get category hierarchy for navigation
    const { data: categories, error: categoriesError } = await refacSupabaseAdmin
      .schema('products')
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }

    // Build category hierarchy
    const categoryMap = new Map((categories || []).map((cat: DatabaseCategory) => [cat.id, cat]));
    const rootCategories = categories?.filter((cat: DatabaseCategory) => !cat.parent_id) || [];
    
    const buildCategoryTree = (parentId: string | null): DatabaseCategory[] => {
      return categories
        ?.filter((cat: DatabaseCategory) => cat.parent_id === parentId)
        .map((cat: DatabaseCategory) => ({
          ...cat,
          children: buildCategoryTree(cat.id)
        })) || [];
    };

    const categoryHierarchy = buildCategoryTree(null);

    // Transform products for POS interface - use pure database hierarchy
    const transformedProducts = products?.map((product: DatabaseProduct): TransformedProduct => {
      const category = product.categories;
      
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        categoryId: product.category_id,
        categoryName: category?.name,
        sku: product.sku,
        description: product.description,
        posDisplayColor: product.pos_display_color,
        imageUrl: null, // No image_url in database
        modifiers: [], // No modifiers in database yet
        isActive: product.is_active
      };
    }) || [];

    return NextResponse.json({
      products: transformedProducts,
      categories: categoryHierarchy,
      pagination: loadAll ? {
        page: 1,
        limit: transformedProducts.length,
        total: transformedProducts.length,
        totalPages: 1,
        loadedAll: true
      } : {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        loadedAll: false
      },
      metadata: {
        totalProducts: loadAll ? transformedProducts.length : (count || 0),
        categoriesCount: categories?.length || 0,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}