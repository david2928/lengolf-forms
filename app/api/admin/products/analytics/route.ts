import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

// GET /api/admin/products/analytics - Get product analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get overall product statistics
    const { data: overallStats } = await refacSupabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            COUNT(*) as total_products,
            COUNT(*) FILTER (WHERE is_active = true) as active_products,
            COUNT(*) FILTER (WHERE is_active = false) as inactive_products,
            COUNT(*) FILTER (WHERE is_custom_product = true) as custom_products,
            COUNT(*) FILTER (WHERE show_in_staff_ui = false) as hidden_products,
            ROUND(SUM(price), 2) as total_catalog_value,
            ROUND(AVG(price), 2) as avg_price,
            ROUND(AVG(profit_margin), 2) as avg_profit_margin,
            COUNT(DISTINCT category_id) as categories_count,
            COUNT(*) FILTER (WHERE cost IS NULL OR cost = 0) as products_without_cost,
            COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '30 days') as recent_changes
          FROM products.products
        `
      });

    // Get category breakdown
    const { data: categoryStats } = await refacSupabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            c.id as category_id,
            c.name as category_name,
            COUNT(p.id) as product_count,
            ROUND(SUM(p.price), 2) as total_value,
            ROUND(AVG(p.price), 2) as avg_price,
            ROUND(AVG(p.profit_margin), 2) as avg_profit_margin,
            COUNT(*) FILTER (WHERE p.updated_at > NOW() - INTERVAL '30 days') as recent_changes
          FROM products.categories c
          LEFT JOIN products.products p ON c.id = p.category_id
          WHERE c.parent_id IS NOT NULL
            AND p.is_active = true
          GROUP BY c.id, c.name
          HAVING COUNT(p.id) > 0
          ORDER BY product_count DESC
        `
      });

    // Get top/bottom performing products by profit margin
    const { data: profitAnalysis } = await refacSupabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            p.id as product_id,
            p.name as product_name,
            p.price as current_price,
            p.cost,
            p.profit_margin,
            c.name as category_name,
            p.updated_at as last_updated
          FROM products.products p
          JOIN products.categories c ON p.category_id = c.id
          WHERE p.is_active = true 
            AND p.cost IS NOT NULL 
            AND p.cost > 0
            AND p.show_in_staff_ui = true
          ORDER BY p.profit_margin DESC
          LIMIT 20
        `
      });

    // Get recent price changes
    const { data: recentPriceChanges } = await refacSupabase
      .schema('products')
      .from('price_history')
      .select(`
        id,
        product_id,
        old_price,
        new_price,
        old_cost,
        new_cost,
        reason,
        changed_by,
        changed_at,
        product:product_id (
          name,
          category:category_id (
            name
          )
        )
      `)
      .order('changed_at', { ascending: false })
      .limit(10);

    // Get price distribution
    const { data: priceDistribution } = await refacSupabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            CASE 
              WHEN price < 50 THEN 'Under ฿50'
              WHEN price < 200 THEN '฿50 - ฿200'
              WHEN price < 500 THEN '฿200 - ฿500'
              WHEN price < 1000 THEN '฿500 - ฿1,000'
              WHEN price < 5000 THEN '฿1,000 - ฿5,000'
              ELSE 'Over ฿5,000'
            END as price_range,
            COUNT(*) as product_count,
            ROUND(AVG(price), 2) as avg_price_in_range
          FROM products.products 
          WHERE is_active = true 
            AND show_in_staff_ui = true
          GROUP BY 
            CASE 
              WHEN price < 50 THEN 'Under ฿50'
              WHEN price < 200 THEN '฿50 - ฿200'
              WHEN price < 500 THEN '฿200 - ฿500'
              WHEN price < 1000 THEN '฿500 - ฿1,000'
              WHEN price < 5000 THEN '฿1,000 - ฿5,000'
              ELSE 'Over ฿5,000'
            END
          ORDER BY MIN(price)
        `
      });

    // Get margin distribution
    const { data: marginDistribution } = await refacSupabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            CASE 
              WHEN profit_margin < 30 THEN 'Low (0-30%)'
              WHEN profit_margin < 60 THEN 'Medium (30-60%)'
              WHEN profit_margin < 80 THEN 'High (60-80%)'
              ELSE 'Excellent (80%+)'
            END as margin_range,
            COUNT(*) as product_count,
            ROUND(AVG(profit_margin), 2) as avg_margin_in_range
          FROM products.products 
          WHERE is_active = true 
            AND show_in_staff_ui = true
            AND profit_margin IS NOT NULL
          GROUP BY 
            CASE 
              WHEN profit_margin < 30 THEN 'Low (0-30%)'
              WHEN profit_margin < 60 THEN 'Medium (30-60%)'
              WHEN profit_margin < 80 THEN 'High (60-80%)'
              ELSE 'Excellent (80%+)'
            END
          ORDER BY MIN(profit_margin)
        `
      });

    return NextResponse.json({
      success: true,
      data: {
        overview: overallStats?.[0] || {},
        category_breakdown: categoryStats || [],
        profit_analysis: {
          top_performers: profitAnalysis?.slice(0, 10) || [],
          bottom_performers: profitAnalysis?.slice(-10).reverse() || []
        },
        recent_price_changes: recentPriceChanges || [],
        price_distribution: priceDistribution || [],
        margin_distribution: marginDistribution || []
      }
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}