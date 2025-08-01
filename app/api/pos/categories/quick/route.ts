import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

// Set aggressive caching for category data (5 minutes)
export const revalidate = 300;

interface CategoryWithCount {
  id: string;
  name: string;
  display_order: number;
  color_code: string;
  product_count: number;
  children: CategoryWithCount[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Single optimized query: get categories with product counts via JOIN
    const { data: categoryData, error } = await refacSupabaseAdmin
      .schema('products')
      .from('categories')
      .select(`
        id,
        name,
        parent_id,
        display_order,
        color_code,
        is_active,
        product_count:products(count)
      `)
      .eq('is_active', true)
      .eq('products.is_active', true)
      .eq('products.show_in_staff_ui', true)
      .order('display_order')
      .order('name');

    if (error) {
      console.error('Error fetching categories with counts:', error);
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }

    // Build hierarchy with pre-calculated counts
    const categoryMap = new Map();
    const rootCategories: CategoryWithCount[] = [];

    // First pass: create category objects
    categoryData?.forEach((cat: any) => {
      const categoryObj: CategoryWithCount = {
        id: cat.id,
        name: cat.name,
        display_order: cat.display_order || 0,
        color_code: cat.color_code || '#6B7280',
        product_count: cat.product_count?.[0]?.count || 0,
        children: []
      };
      categoryMap.set(cat.id, categoryObj);
      
      if (!cat.parent_id) {
        rootCategories.push(categoryObj);
      }
    });

    // Second pass: build hierarchy
    categoryData?.forEach((cat: any) => {
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        const child = categoryMap.get(cat.id);
        if (parent && child) {
          parent.children.push(child);
        }
      }
    });

    // Calculate total counts including children
    const calculateTotalCount = (category: CategoryWithCount): number => {
      let total = category.product_count;
      category.children.forEach(child => {
        total += calculateTotalCount(child);
      });
      return total;
    };

    rootCategories.forEach(cat => {
      (cat as any).totalProductCount = calculateTotalCount(cat);
    });

    // Filter out categories with no products
    const activeCategoriesWithProducts = rootCategories.filter(cat => 
      (cat as any).totalProductCount > 0
    );

    return NextResponse.json({
      categories: activeCategoriesWithProducts,
      metadata: {
        totalCategories: activeCategoriesWithProducts.length,
        lastUpdated: new Date().toISOString(),
        cached: true
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, s-maxage=300',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=300'
      }
    });

  } catch (error) {
    console.error('Error in quick categories API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}