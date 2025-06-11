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

// Helper function to calculate comparison period dates
function getComparisonDates(startDate: string, endDate: string, comparisonPeriod: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  let comparisonStart: Date;
  let comparisonEnd: Date;

  switch (comparisonPeriod) {
    case 'previousMonth':
      // Go back 30 days from start
      comparisonStart = new Date(start);
      comparisonStart.setDate(comparisonStart.getDate() - 30);
      comparisonEnd = new Date(comparisonStart);
      comparisonEnd.setDate(comparisonEnd.getDate() + daysDiff - 1);
      break;
    case 'previousYear':
      // Go back 365 days from start
      comparisonStart = new Date(start);
      comparisonStart.setDate(comparisonStart.getDate() - 365);
      comparisonEnd = new Date(comparisonStart);
      comparisonEnd.setDate(comparisonEnd.getDate() + daysDiff - 1);
      break;
    default: // 'previousPeriod'
      // Go back the same number of days as the current period
      comparisonStart = new Date(start);
      comparisonStart.setDate(comparisonStart.getDate() - daysDiff);
      comparisonEnd = new Date(start);
      comparisonEnd.setDate(comparisonEnd.getDate() - 1);
      break;
  }

  return {
    comparison_start_date: comparisonStart.toISOString().split('T')[0],
    comparison_end_date: comparisonEnd.toISOString().split('T')[0]
  };
}

// Helper function to calculate percentage change
function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0 || previous === null || previous === undefined) {
    return current > 0 ? 100 : null;
  }
  return ((current - previous) / previous) * 100;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams, pathname } = new URL(request.url);
  
  try {
    const startDate = searchParams.get('start_date') || '2024-05-01';
    const endDate = searchParams.get('end_date') || '2024-05-31';
    const comparisonPeriod = searchParams.get('comparison_period') || 'previousPeriod';
    
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

    // Calculate comparison period dates
    const { comparison_start_date, comparison_end_date } = getComparisonDates(startDate, endDate, comparisonPeriod);
    
    // Create cache key
    const cacheKey = `dashboard-summary-${startDate}-${endDate}-${comparison_start_date}-${comparison_end_date}`;
    
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

    // Fetch current period data
    const { data: currentData, error: currentError } = await refacSupabaseAdmin
      .rpc('get_dashboard_summary', {
        start_date: startDate,
        end_date: endDate
      });

    if (currentError) {
      const duration = Date.now() - startTime;
      console.error('Database function error (current):', currentError);
      logRequest('GET', pathname, { startDate, endDate, error: currentError.message }, duration);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Database error: ${currentError.message}`,
          code: 'DATABASE_ERROR',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Fetch comparison period data
    const { data: comparisonData, error: comparisonError } = await refacSupabaseAdmin
      .rpc('get_dashboard_summary', {
        start_date: comparison_start_date,
        end_date: comparison_end_date
      });

    if (comparisonError) {
      console.warn('Comparison period data error:', comparisonError);
      // Continue without comparison data
    }

    if (!currentData) {
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

    // Extract current period metrics using the new database function structure
    const current = {
      total_revenue: currentData.current?.total_revenue ?? 0,
      gross_profit: currentData.current?.gross_profit ?? 0,
      transaction_count: currentData.current?.transaction_count ?? 0,
      unique_customers: currentData.current?.unique_customers ?? 0,
      avg_transaction_value: currentData.current?.avg_transaction_value ?? 0,
      gross_margin_pct: currentData.current?.gross_margin_pct ?? 0,
      sim_utilization_count: currentData.current?.sim_utilization_count ?? 0,
      sim_utilization_pct: currentData.current?.sim_utilization_pct ?? 0,
      new_customers: currentData.current?.new_customers ?? 0,
    };

    // Extract comparison period metrics using the new structure
    const comparison = comparisonData ? {
      total_revenue: comparisonData.current?.total_revenue ?? 0,
      gross_profit: comparisonData.current?.gross_profit ?? 0,
      transaction_count: comparisonData.current?.transaction_count ?? 0,
      unique_customers: comparisonData.current?.unique_customers ?? 0,
      avg_transaction_value: comparisonData.current?.avg_transaction_value ?? 0,
      gross_margin_pct: comparisonData.current?.gross_margin_pct ?? 0,
      sim_utilization_count: comparisonData.current?.sim_utilization_count ?? 0,
      sim_utilization_pct: comparisonData.current?.sim_utilization_pct ?? 0,
      new_customers: comparisonData.current?.new_customers ?? 0,
    } : {
      total_revenue: 0,
      gross_profit: 0,
      transaction_count: 0,
      unique_customers: 0,
      avg_transaction_value: 0,
      gross_margin_pct: 0,
      sim_utilization_count: 0,
      sim_utilization_pct: 0,
      new_customers: 0,
    };

    // Calculate changes with proper percentage calculations
    const changes = {
      revenue_change_pct: calculatePercentageChange(current.total_revenue, comparison.total_revenue),
      profit_change_pct: calculatePercentageChange(current.gross_profit, comparison.gross_profit),
      transaction_change_pct: calculatePercentageChange(current.avg_transaction_value, comparison.avg_transaction_value),
      customer_acquisition_change_pct: calculatePercentageChange(current.new_customers, comparison.new_customers),
      sim_utilization_change_pct: current.sim_utilization_pct - comparison.sim_utilization_pct, // Percentage point change
      margin_change_pct: current.gross_margin_pct - comparison.gross_margin_pct, // Percentage point change
    };

    const transformedData = {
      current,
      comparison,
      changes,
      trend_data: {
        revenue: currentData.trend_data?.revenue ? currentData.trend_data.revenue.map((value: number, index: number) => ({
          date: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          value: value
        })) : [],
        profit: currentData.trend_data?.profit ? currentData.trend_data.profit.map((value: number, index: number) => ({
          date: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          value: value
        })) : [],
        utilization: currentData.trend_data?.utilization ? currentData.trend_data.utilization.map((value: number, index: number) => ({
          date: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          value: value
        })) : [],
        customers: currentData.trend_data?.customers ? currentData.trend_data.customers.map((value: number, index: number) => ({
          date: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          value: value
        })) : [],
        transaction: currentData.trend_data?.transaction ? currentData.trend_data.transaction.map((value: number, index: number) => ({
          date: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          value: value
        })) : [],
        margin: currentData.trend_data?.margin ? currentData.trend_data.margin.map((value: number, index: number) => ({
          date: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          value: value
        })) : []
      }
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
    console.error('Dashboard summary API error:', error);
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