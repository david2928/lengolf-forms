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

// Helper function to get current Bangkok date
function getBangkokToday(): string {
  const now = new Date();
  const bangkokTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // Add 7 hours for Bangkok timezone
  return bangkokTime.toISOString().split('T')[0];
}

// Helper function to calculate comparison period dates with smart "today" handling
function getComparisonDates(startDate: string, endDate: string, comparisonPeriod: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Check if this is a "today" comparison using Bangkok timezone
  const bangkokToday = getBangkokToday();
  const isToday = startDate === endDate && startDate === bangkokToday;
  
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
      if (isToday) {
        // Special handling for "today": compare same time yesterday
        // Yesterday at 00:00
        comparisonStart = new Date(start);
        comparisonStart.setDate(comparisonStart.getDate() - 1);
        // Yesterday at same current time (not full day)
        comparisonEnd = new Date(start);
        comparisonEnd.setDate(comparisonEnd.getDate() - 1);
      } else {
        // Regular period comparison
        comparisonStart = new Date(start);
        comparisonStart.setDate(comparisonStart.getDate() - daysDiff);
        comparisonEnd = new Date(start);
        comparisonEnd.setDate(comparisonEnd.getDate() - 1);
      }
      break;
  }

  return {
    comparison_start_date: comparisonStart.toISOString().split('T')[0],
    comparison_end_date: comparisonEnd.toISOString().split('T')[0],
    is_today_comparison: isToday,
    bangkok_today: bangkokToday
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
    // Use Bangkok timezone for default dates
    const bangkokToday = getBangkokToday();
    const startDate = searchParams.get('start_date') || '2024-05-01';
    const endDate = searchParams.get('end_date') || '2024-05-31';
    const comparisonPeriod = searchParams.get('comparison_period') || 'previousPeriod';
    
    // Log timezone information for debugging
    console.log('Timezone Debug:', {
      bangkokToday,
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      requestedDates: { startDate, endDate }
    });
    
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
    const { comparison_start_date, comparison_end_date, is_today_comparison, bangkok_today } = getComparisonDates(startDate, endDate, comparisonPeriod);
    
    // Create cache key (include time for today comparisons)
    const timeKey = is_today_comparison ? `-${new Date().getHours()}${new Date().getMinutes()}` : '';
    const cacheKey = `dashboard-summary-${startDate}-${endDate}-${comparison_start_date}-${comparison_end_date}${timeKey}`;
    
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
        duration_ms: duration,
        timezone_info: { bangkok_today, is_today_comparison }
      });
    }

    // Fetch current period data using the enhanced functions
    const { data: currentData, error: currentError } = await refacSupabaseAdmin.rpc('get_dashboard_summary_enhanced', {
      start_date: startDate,
      end_date: endDate,
      comparison_start_date: comparison_start_date,
      comparison_end_date: comparison_end_date
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

    // For time-aware comparisons (today vs yesterday), use the enhanced time-aware function
    let comparisonData = null;
    let comparisonError = null;
    
    if (is_today_comparison) {
      // Get current Bangkok time for time-aware comparison
      const bangkokTime = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
      const cutoffTime = bangkokTime.toTimeString().split(' ')[0];
      
      const { data: timeAwareData, error: timeAwareError } = await refacSupabaseAdmin.rpc('get_dashboard_summary_enhanced_with_time', {
        start_date: comparison_start_date,
        end_date: comparison_end_date,
        comparison_start_date: comparison_start_date,
        comparison_end_date: comparison_end_date,
        cutoff_time_param: cutoffTime
      });
      comparisonData = timeAwareData;
      comparisonError = timeAwareError;
    }
    // Note: For non-today comparisons, we already have comparison data from the main function

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

    // Extract current period metrics from enhanced function JSON structure
    const current = {
      net_revenue: currentData?.current_period?.total_revenue ?? 0,
      gross_profit: currentData?.current_period?.gross_profit ?? 0,
      transaction_count: currentData?.current_period?.transaction_count ?? 0,
      unique_customers: currentData?.current_period?.unique_customers ?? 0,
      avg_transaction_value: currentData?.current_period?.avg_transaction_value ?? 0,
      gross_margin_pct: currentData?.current_period?.gross_margin_pct ?? 0,
      sim_utilization_count: currentData?.current_period?.sim_utilization_count ?? 0,
      sim_utilization_pct: currentData?.current_period?.sim_utilization_pct ?? 0,
      new_customers: currentData?.current_period?.new_customers ?? 0,
    };

    // Extract comparison period metrics using enhanced function structure
    const comparison = (is_today_comparison && comparisonData) ? {
      // For today comparisons, use the separate time-aware function result
      net_revenue: comparisonData?.current_period?.total_revenue ?? 0,
      gross_profit: comparisonData?.current_period?.gross_profit ?? 0,
      transaction_count: comparisonData?.current_period?.transaction_count ?? 0,
      unique_customers: comparisonData?.current_period?.unique_customers ?? 0,
      avg_transaction_value: comparisonData?.current_period?.avg_transaction_value ?? 0,
      gross_margin_pct: comparisonData?.current_period?.gross_margin_pct ?? 0,
      sim_utilization_count: comparisonData?.current_period?.sim_utilization_count ?? 0,
      sim_utilization_pct: comparisonData?.current_period?.sim_utilization_pct ?? 0,
      new_customers: comparisonData?.current_period?.new_customers ?? 0,
    } : {
      // For non-today comparisons, use the comparison_period from the main function
      net_revenue: currentData?.comparison_period?.total_revenue ?? 0,
      gross_profit: currentData?.comparison_period?.gross_profit ?? 0,
      transaction_count: currentData?.comparison_period?.transaction_count ?? 0,
      unique_customers: currentData?.comparison_period?.unique_customers ?? 0,
      avg_transaction_value: currentData?.comparison_period?.avg_transaction_value ?? 0,
      gross_margin_pct: currentData?.comparison_period?.gross_margin_pct ?? 0,
      sim_utilization_count: currentData?.comparison_period?.sim_utilization_count ?? 0,
      sim_utilization_pct: currentData?.comparison_period?.sim_utilization_pct ?? 0,
      new_customers: currentData?.comparison_period?.new_customers ?? 0,
    };

    // Calculate changes with proper percentage calculations
    const changes = {
      revenue_change_pct: calculatePercentageChange(current.net_revenue, comparison.net_revenue),
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
      trend_data: currentData?.trend_data || {
        revenue: [],
        profit: [],
        utilization: [],
        customers: [],
        transaction: [],
        margin: []
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