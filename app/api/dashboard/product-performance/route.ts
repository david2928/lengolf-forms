import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort_by') || 'revenue';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 });
    }

    // Convert timestamps to DATE format
    const startDate = new Date(startDateParam).toISOString().split('T')[0];
    const endDate = new Date(endDateParam).toISOString().split('T')[0];

    // Extract actual category name from hierarchical format
    let actualCategory = category;
    if (category && category.includes(' > ')) {
      actualCategory = category.split(' > ')[1];
    }

    // Get product performance data
    const { data: productData, error: productError } = await supabase.rpc('get_product_performance_analysis', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_category_filter: actualCategory === 'all' || !actualCategory ? '' : actualCategory,
      p_search_term: search,
      p_sort_by: sortBy,
      p_sort_order: sortOrder
    });

    if (productError) {
      console.error('Product performance query error:', productError);
      return NextResponse.json({ error: "Failed to fetch product performance data" }, { status: 500 });
    }

    // Get categories that actually have sales data and try to match with products schema
    const { data: salesCategoryData, error: salesCategoryError } = await supabase
      .schema('pos')
      .from('lengolf_sales')
      .select('product_category')
      .not('product_category', 'is', null)
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('is_voided', false);

    if (salesCategoryError) {
      console.error('Sales categories query error:', salesCategoryError);
      return NextResponse.json({ error: "Failed to fetch sales categories" }, { status: 500 });
    }

    const salesCategories = Array.from(new Set(salesCategoryData?.map(item => item.product_category).filter(Boolean) || []));

    // Get hierarchical categories from products schema for display
    const { data: productCategoryData, error: productCategoryError } = await supabase
      .schema('products')
      .from('categories')
      .select('id, name, parent_id, display_order')
      .eq('is_active', true)
      .order('display_order');

    let categories = salesCategories.sort();

    // If we have product categories, try to create hierarchical display
    if (!productCategoryError && productCategoryData) {
      const categoryMap = new Map(productCategoryData.map(cat => [cat.name, cat]));
      const hierarchicalCategories: string[] = [];

      salesCategories.forEach(salesCat => {
        const productCat = categoryMap.get(salesCat);
        if (productCat && productCat.parent_id) {
          // Find parent
          const parentCat = productCategoryData.find(p => p.id === productCat.parent_id);
          if (parentCat) {
            hierarchicalCategories.push(`${parentCat.name} > ${salesCat}`);
          } else {
            hierarchicalCategories.push(salesCat);
          }
        } else {
          hierarchicalCategories.push(salesCat);
        }
      });

      categories = hierarchicalCategories.sort();
    }

    // Calculate summary metrics
    const products = productData || [];
    const validProducts = products.filter((p: any) => p.total_revenue != null && p.total_profit != null);
    const summary = {
      total_products: products.length,
      total_revenue: products.reduce((sum: number, p: any) => sum + (Number(p.total_revenue) || 0), 0),
      total_profit: products.reduce((sum: number, p: any) => sum + (Number(p.total_profit) || 0), 0),
      avg_profit_margin: validProducts.length > 0 
        ? validProducts.reduce((sum: number, p: any) => sum + (Number(p.avg_profit_margin) || 0), 0) / validProducts.length 
        : 0,
      top_performer: products.length > 0 ? products[0]?.name || 'N/A' : 'N/A',
      worst_performer: products.length > 0 ? products[products.length - 1]?.name || 'N/A' : 'N/A'
    };

    return NextResponse.json({
      products,
      categories,
      summary
    });

  } catch (error) {
    console.error('Product performance API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}