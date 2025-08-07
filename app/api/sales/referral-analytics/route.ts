import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Extrapolates unknown referrals based on the known distribution
 * This distributes unknown customers proportionally among known sources
 */
function extrapolateUnknownReferrals(
  sourceBreakdown: Record<string, { count: number; percentage: number }>,
  totalCustomers: number
): Record<string, { count: number; percentage: number }> {
  const unknownCount = sourceBreakdown.Unknown?.count || 0;
  
  // If no unknown customers, return as-is
  if (unknownCount === 0) {
    return sourceBreakdown;
  }
  
  // Calculate total known customers (excluding unknown)
  const knownCustomers = totalCustomers - unknownCount;
  
  // If all customers are unknown, distribute equally among common sources
  if (knownCustomers === 0) {
    const commonSources = ['Google', 'Instagram', 'Facebook', 'TikTok', 'Friends'];
    const perSource = Math.floor(unknownCount / commonSources.length);
    const remainder = unknownCount % commonSources.length;
    
    const result: Record<string, { count: number; percentage: number }> = {};
    
    commonSources.forEach((source, index) => {
      const count = perSource + (index < remainder ? 1 : 0);
      result[source] = {
        count,
        percentage: (count / totalCustomers) * 100
      };
    });
    
    return result;
  }
  
  // Create a copy without the Unknown entry
  const result = { ...sourceBreakdown };
  delete result.Unknown;
  
  // Calculate distribution ratios based on known sources
  Object.keys(result).forEach(source => {
    const originalCount = result[source].count;
    const ratio = originalCount / knownCustomers;
    const extrapolatedCount = Math.round(ratio * unknownCount);
    
    // Add the extrapolated count to the original count
    result[source].count = originalCount + extrapolatedCount;
    result[source].percentage = (result[source].count / totalCustomers) * 100;
  });
  
  // Handle any rounding differences by adjusting the largest source
  const totalAfterExtrapolation = Object.values(result).reduce((sum, item) => sum + item.count, 0);
  const difference = totalCustomers - totalAfterExtrapolation;
  
  if (difference !== 0) {
    // Find the source with the highest count to adjust
    const largestSource = Object.keys(result).reduce((a, b) => 
      result[a].count > result[b].count ? a : b
    );
    
    result[largestSource].count += difference;
    result[largestSource].percentage = (result[largestSource].count / totalCustomers) * 100;
  }
  
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, analysisType = 'monthly' } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    let result;

    switch (analysisType) {
      case 'daily':
        // Get daily referral data using POS-based functions (matches sales dashboard)
        const { data: dailyData, error: dailyError } = await supabase
          .rpc('get_pos_combined_referral_data', {
            start_date: startDate,
            end_date: endDate
          });

        if (dailyError) {
          console.error('Daily referral data error:', dailyError);
          return NextResponse.json(
            { error: 'Failed to fetch daily referral data' },
            { status: 500 }
          );
        }

        result = {
          analysisType: 'daily',
          data: dailyData,
          summary: generateDailySummary(dailyData)
        };
        break;

      case 'weekly':
        // Get weekly referral trends using POS-based function that matches dashboard
        const { data: weeklyData, error: weeklyError } = await supabase
          .rpc('get_pos_weekly_referral_analytics', {
            weeks_back: 12
          });

        if (weeklyError) {
          console.error('Weekly referral data error:', weeklyError);
          return NextResponse.json(
            { error: 'Failed to fetch weekly referral data' },
            { status: 500 }
          );
        }

        result = {
          analysisType: 'weekly',
          data: weeklyData,
          summary: generateWeeklySummary(weeklyData)
        };
        break;

      case 'monthly':
      default:
        // Get monthly referral summary using final simple solution
        const { data: monthlyData, error: monthlyError } = await supabase
          .rpc('get_monthly_referral_final');

        if (monthlyError) {
          console.error('Monthly referral data error:', monthlyError);
          return NextResponse.json(
            { error: 'Failed to fetch monthly referral data' },
            { status: 500 }
          );
        }

        // Filter data by requested date range
        const startMonth = new Date(startDate).toISOString().substring(0, 7); // YYYY-MM format
        const endMonth = new Date(endDate).toISOString().substring(0, 7);
        
        const filteredMonthlyData = monthlyData.filter((item: any) => 
          item.month >= startMonth && item.month <= endMonth
        );

        result = {
          analysisType: 'monthly',
          data: filteredMonthlyData,
          summary: generateMonthlySummary(filteredMonthlyData)
        };
        break;
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Referral analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateDailySummary(data: any[]) {
  const totalCustomers = data.reduce((sum, item) => sum + item.count, 0);
  const sourceBreakdown = data.reduce((acc, item) => {
    if (!acc[item.source]) {
      acc[item.source] = { count: 0, percentage: 0 };
    }
    acc[item.source].count += item.count;
    return acc;
  }, {} as Record<string, { count: number; percentage: number }>);

  // Calculate percentages
  Object.keys(sourceBreakdown).forEach(source => {
    sourceBreakdown[source].percentage = 
      totalCustomers > 0 ? (sourceBreakdown[source].count / totalCustomers) * 100 : 0;
  });

  const dataSourceBreakdown = data.reduce((acc, item) => {
    if (!acc[item.data_source]) {
      acc[item.data_source] = 0;
    }
    acc[item.data_source] += item.count;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalCustomers,
    sourceBreakdown: extrapolateUnknownReferrals(sourceBreakdown, totalCustomers),
    dataSourceBreakdown,
    dateRange: {
      start: data.length > 0 ? data[0].date : null,
      end: data.length > 0 ? data[data.length - 1].date : null
    }
  };
}

function generateWeeklySummary(data: any[]) {
  // Now using true weekly POS-based data that matches dashboard
  const totalCustomers = data.reduce((sum, item) => sum + item.customer_count, 0);
  const sourceBreakdown = data.reduce((acc, item) => {
    if (!acc[item.referral_source]) {
      acc[item.referral_source] = { count: 0, percentage: 0 };
    }
    acc[item.referral_source].count += item.customer_count;
    return acc;
  }, {} as Record<string, { count: number; percentage: number }>);

  // Calculate percentages
  Object.keys(sourceBreakdown).forEach(source => {
    sourceBreakdown[source].percentage = 
      totalCustomers > 0 ? (sourceBreakdown[source].count / totalCustomers) * 100 : 0;
  });

  // Generate weekly trends
  const weeklyTrends = data.reduce((acc, item) => {
    const weekKey = `${item.week_start} - ${item.week_end}`;
    if (!acc[weekKey]) {
      acc[weekKey] = { total: 0, sources: {} };
    }
    acc[weekKey].total += item.customer_count;
    acc[weekKey].sources[item.referral_source] = (acc[weekKey].sources[item.referral_source] || 0) + item.customer_count;
    return acc;
  }, {} as Record<string, { total: number; sources: Record<string, number> }>);

  // Data source breakdown - show methodology
  const dataSourceBreakdown = data.reduce((acc, item) => {
    const method = item.data_method || 'unknown';
    acc[method] = (acc[method] || 0) + item.customer_count;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalCustomers,
    sourceBreakdown: extrapolateUnknownReferrals(sourceBreakdown, totalCustomers),
    weeklyTrends,
    dataSourceBreakdown,
    weeksAnalyzed: Object.keys(weeklyTrends).length
  };
}

function generateMonthlySummary(data: any[]) {
  const totalCustomers = data.reduce((sum, item) => sum + item.customer_count, 0);
  const sourceBreakdown = data.reduce((acc, item) => {
    if (!acc[item.referral_source]) {
      acc[item.referral_source] = { count: 0, percentage: 0 };
    }
    acc[item.referral_source].count += item.customer_count;
    return acc;
  }, {} as Record<string, { count: number; percentage: number }>);

  // Calculate percentages
  Object.keys(sourceBreakdown).forEach(source => {
    sourceBreakdown[source].percentage = 
      totalCustomers > 0 ? (sourceBreakdown[source].count / totalCustomers) * 100 : 0;
  });

  // Create raw monthly trends first
  const rawMonthlyTrends = data.reduce((acc, item) => {
    if (!acc[item.month]) {
      acc[item.month] = { total: 0, sources: {} };
    }
    acc[item.month].total += item.customer_count;
    acc[item.month].sources[item.referral_source] = (acc[item.month].sources[item.referral_source] || 0) + item.customer_count;
    return acc;
  }, {} as Record<string, { total: number; sources: Record<string, number> }>);

  // Create extrapolated monthly trends (distribute Unknown sources)
  const monthlyTrends: Record<string, { total: number; sources: Record<string, number> }> = {};
  
  Object.entries(rawMonthlyTrends).forEach(([month, monthData]) => {
    const monthDataTyped = monthData as { sources: Record<string, number>; total: number };
    const monthSources = { ...monthDataTyped.sources };
    const extrapolatedSources = extrapolateUnknownReferrals(
      Object.fromEntries(
        Object.entries(monthSources).map(([source, count]) => [
          source, 
          { count: count as number, percentage: ((count as number) / monthDataTyped.total) * 100 }
        ])
      ),
      monthDataTyped.total
    );
    
    monthlyTrends[month] = {
      total: monthDataTyped.total,
      sources: Object.fromEntries(
        Object.entries(extrapolatedSources).map(([source, info]) => [source, info.count])
      )
    };
  });

  // Data source breakdown - show cutoff methodology
  const dataSourceBreakdown = data.reduce((acc, item) => {
    const method = item.data_method || 'unknown';
    acc[method] = (acc[method] || 0) + item.customer_count;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalCustomers,
    sourceBreakdown: extrapolateUnknownReferrals(sourceBreakdown, totalCustomers),
    monthlyTrends,
    dataSourceBreakdown,
    monthsAnalyzed: Object.keys(monthlyTrends).length
  };
}

export async function GET(request: NextRequest) {
  // Simple GET endpoint for testing
  const { searchParams } = new URL(request.url);
  const analysisType = searchParams.get('type') || 'monthly';
  
  const mockRequest = {
    json: async () => ({
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      analysisType
    })
  };

  return POST(mockRequest as NextRequest);
}