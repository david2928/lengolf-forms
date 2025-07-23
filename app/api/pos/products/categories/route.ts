import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// Helper function to map category names to POS tabs
function mapCategoryToPosTab(categoryName: string): string {
  const name = categoryName.toLowerCase();
  if (name.includes('drink') || name.includes('beverage')) return 'DRINK';
  if (name.includes('food') || name.includes('meal')) return 'FOOD';
  if (name.includes('golf') || name.includes('sport')) return 'GOLF';
  if (name.includes('package') || name.includes('event')) return 'PACKAGE';
  return 'OTHER';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeProductCount = searchParams.get('includeProductCount') === 'true';
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default to true

    // Fetch all categories
    let query = refacSupabaseAdmin
      .schema('products')
      .from('categories')
      .select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    query = query.order('display_order').order('name');

    const { data: categories, error: categoriesError } = await query;

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return NextResponse.json({ error: "Failed to fetch categories", details: categoriesError }, { status: 500 });
    }

    console.log('Successfully fetched categories:', categories?.length || 0);

    // Get product counts per category if requested
    let productCounts: Record<string, number> = {};
    if (includeProductCount) {
      const { data: productCountData, error: countError } = await refacSupabaseAdmin
        .schema('products')
        .from('products')
        .select('category_id')
        .eq('is_active', true);

      if (!countError && productCountData) {
        productCounts = productCountData.reduce((acc, product) => {
          acc[product.category_id] = (acc[product.category_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Transform categories for POS interface
    const transformedCategories = (categories || []).map(category => ({
      id: category.id,
      name: category.name,
      parentId: category.parent_id,
      posTabCategory: mapCategoryToPosTab(category.name),
      displayOrder: category.display_order,
      colorTheme: category.color_code || '#6B7280',
      icon: category.icon,
      description: category.description,
      isActive: category.is_active,
      productCount: includeProductCount ? (productCounts[category.id] || 0) : undefined,
      createdAt: category.created_at,
      updatedAt: category.updated_at
    }));

    // Group by POS tab categories for easy navigation
    const tabCategories = {
      DRINK: transformedCategories.filter(cat => cat.posTabCategory === 'DRINK'),
      FOOD: transformedCategories.filter(cat => cat.posTabCategory === 'FOOD'),
      GOLF: transformedCategories.filter(cat => cat.posTabCategory === 'GOLF'),
      PACKAGES: transformedCategories.filter(cat => cat.posTabCategory === 'PACKAGE'),
      OTHER: transformedCategories.filter(cat => !cat.posTabCategory || cat.posTabCategory === 'OTHER')
    };

    // Calculate totals per tab
    const tabTotals = Object.entries(tabCategories).reduce((acc, [tab, cats]) => {
      acc[tab] = {
        categoryCount: cats.length,
        productCount: includeProductCount ? cats.reduce((sum, cat) => sum + (cat.productCount || 0), 0) : undefined
      };
      return acc;
    }, {} as Record<string, { categoryCount: number; productCount?: number }>);

    return NextResponse.json({
      categories: transformedCategories,
      tabCategories,
      tabTotals,
      metadata: {
        totalCategories: transformedCategories.length,
        activeCategories: transformedCategories.filter(cat => cat.isActive).length,
        includeProductCount,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in categories API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}