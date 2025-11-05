import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import NodeCache from 'node-cache';

// Create cache instance with 5-minute TTL
const cache = new NodeCache({ stdTTL: 300 });

// Logging utility
function logRequest(method: string, url: string, params: any, duration?: number) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${method} ${url}`, {
    params,
    duration: duration ? `${duration}ms` : undefined,
    cached: !!duration && duration < 10 // Likely cached if very fast
  });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams, pathname } = new URL(request.url);
  
  try {
    const startDate = searchParams.get('start_date') || '2024-05-01';
    const endDate = searchParams.get('end_date') || '2024-05-31';
    
    // Enhanced validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      logRequest('GET', pathname, { startDate, endDate, error: 'Invalid date format' });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid date format. Use YYYY-MM-DD',
          code: 'INVALID_DATE_FORMAT'
        },
        { status: 400 }
      );
    }

    // Validate date range (not more than 1 year)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 365) {
      logRequest('GET', pathname, { startDate, endDate, error: 'Date range too large' });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Date range cannot exceed 365 days',
          code: 'DATE_RANGE_TOO_LARGE'
        },
        { status: 400 }
      );
    }

    if (start > end) {
      logRequest('GET', pathname, { startDate, endDate, error: 'Invalid date order' });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Start date must be before or equal to end date',
          code: 'INVALID_DATE_ORDER'
        },
        { status: 400 }
      );
    }
    
    // Create cache key
    const cacheKey = `dashboard-charts-${startDate}-${endDate}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      const duration = Date.now() - startTime;
      logRequest('GET', pathname, { startDate, endDate, cached: true }, duration);
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString(),
        duration_ms: duration
      });
    }

    // Call the OPTIMIZED database function that uses materialized view for better YTD performance
    // Falls back to the original function if the optimized one is not available
    const useOptimizedFunction = process.env.USE_OPTIMIZED_DASHBOARD !== 'false'; // Default to true
    const functionName = useOptimizedFunction ? 'get_dashboard_charts_optimized' : 'get_dashboard_charts';

    const { data, error } = await refacSupabaseAdmin
      .rpc(functionName, {
        start_date: startDate,
        end_date: endDate
      });

    if (error) {
      const duration = Date.now() - startTime;
      console.error('Database function error:', error);
      logRequest('GET', pathname, { startDate, endDate, error: error.message }, duration);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Database error: ${error.message}`,
          code: 'DATABASE_ERROR',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    if (!data) {
      const duration = Date.now() - startTime;
      logRequest('GET', pathname, { startDate, endDate, error: 'No data returned' }, duration);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'No data returned from database function',
          code: 'NO_DATA',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Transform the database response to match our TypeScript interface
    const transformedData = {
      revenue_trends: (data.revenue_trends ?? []).map((item: any) => ({
        period_date: item.date,
        total_revenue: item.revenue,
        gross_profit: item.profit,
        transaction_count: item.transactions,
        avg_transaction_value: item.transactions > 0 ? item.revenue / item.transactions : 0,
        unique_customers: item.unique_customers || 0 // Use actual unique customers from database
      })),
      sim_utilization: (data.sim_utilization_trends ?? []).map((item: any) => ({
        date: item.date,
        sim_usage_count: item.sim_transactions,
        total_transactions: item.total_transactions,
        utilization_pct: item.utilization_percentage,
        sim_revenue: 0 // Not available in current data
      })),
      category_breakdown: (data.category_breakdown ?? []).map((item: any) => ({
        parent_category: item.category || 'Unknown',
        revenue: item.revenue,
        profit: item.profit,
        margin_pct: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
        transaction_count: item.transaction_count,
        avg_transaction_value: item.transaction_count > 0 ? item.revenue / item.transaction_count : 0
      })),
      payment_methods: (data.payment_methods ?? []).map((item: any) => {
        const totalAmount = (data.payment_methods ?? []).reduce((sum: number, p: any) => sum + p.total_amount, 0);
        return {
          payment_type: item.payment_category,
          transaction_count: item.transaction_count,
          revenue: item.total_amount,
          avg_transaction_value: item.transaction_count > 0 ? item.total_amount / item.transaction_count : 0,
          percentage: totalAmount > 0 ? (item.total_amount / totalAmount) * 100 : 0
        };
      }),
      customer_growth: (data.customer_growth ?? []).map((item: any) => ({
        date: item.date,
        new_customers: item.new_customers,
        returning_customers: item.returning_customers,
        total_customers: item.total_customers,
        retention_rate: item.total_customers > 0 ? (item.returning_customers / item.total_customers) * 100 : 0
      }))
    };
    
    // Cache the result
    cache.set(cacheKey, transformedData);
    
    const duration = Date.now() - startTime;
    logRequest('GET', pathname, { startDate, endDate, cached: false }, duration);
    
    return NextResponse.json({
      success: true,
      data: transformedData,
      cached: false,
      timestamp: new Date().toISOString(),
      duration_ms: duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Dashboard charts API error:', error);
    logRequest('GET', pathname, { error: error instanceof Error ? error.message : 'Unknown error' }, duration);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 