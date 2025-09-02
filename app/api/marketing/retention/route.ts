import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface CohortRetentionData {
  cohort_month: string;
  cohort_size: number;
  month_0: number;
  month_1: number;
  month_2: number;
  month_3: number;
  month_6: number;
  month_12: number;
  retention_1: number;
  retention_3: number;
  retention_6: number;
  retention_12: number;
}

interface RevenueRetentionData {
  cohort_month: string;
  cohort_revenue: number;
  month_0_revenue: number;
  month_1_revenue: number;
  month_3_revenue: number;
  month_6_revenue: number;
  month_12_revenue: number;
  revenue_retention_1: number;
  revenue_retention_3: number;
  revenue_retention_6: number;
  revenue_retention_12: number;
}

interface RetentionByChannelData {
  referral_source: string;
  cohort_month: string;
  cohort_size: number;
  retention_1: number;
  retention_3: number;
  retention_6: number;
  avg_revenue_per_customer: number;
}

interface RetentionAnalysisResponse {
  cohortRetention: CohortRetentionData[];
  revenueRetention: RevenueRetentionData[];
  channelRetention: RetentionByChannelData[];
  summary: {
    totalCustomers: number;
    avgRetentionMonth1: number;
    avgRetentionMonth3: number;
    avgRetentionMonth6: number;
    avgRevenueRetention: number;
    bestPerformingChannel: string;
    dateRange: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '12');
    const endDateParam = searchParams.get('endDate');
    
    // Calculate date range
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - months);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get cohort retention analysis
    const { data: cohortData, error: cohortError } = await supabase.rpc('get_cohort_retention_analysis', {
      start_date: startDateStr,
      end_date: endDateStr
    });

    if (cohortError) {
      console.error('Cohort retention error:', cohortError);
      return NextResponse.json({ error: "Failed to fetch cohort retention data" }, { status: 500 });
    }

    // Get revenue retention analysis
    const { data: revenueData, error: revenueError } = await supabase.rpc('get_revenue_retention_analysis', {
      start_date: startDateStr,
      end_date: endDateStr
    });

    if (revenueError) {
      console.error('Revenue retention error:', revenueError);
      return NextResponse.json({ error: "Failed to fetch revenue retention data" }, { status: 500 });
    }

    // Get retention by channel
    const { data: channelData, error: channelError } = await supabase.rpc('get_retention_by_channel', {
      start_date: startDateStr,
      end_date: endDateStr
    });

    if (channelError) {
      console.error('Channel retention error:', channelError);
      // Don't fail the whole request if channel data fails
    }

    // Calculate summary metrics
    const totalCustomers = cohortData?.reduce((sum: number, cohort: any) => sum + cohort.cohort_size, 0) || 0;
    const avgRetentionMonth1 = cohortData?.length ? 
      cohortData.reduce((sum: number, cohort: any) => sum + cohort.retention_1, 0) / cohortData.length : 0;
    const avgRetentionMonth3 = cohortData?.length ? 
      cohortData.reduce((sum: number, cohort: any) => sum + cohort.retention_3, 0) / cohortData.length : 0;
    const avgRetentionMonth6 = cohortData?.length ? 
      cohortData.reduce((sum: number, cohort: any) => sum + cohort.retention_6, 0) / cohortData.length : 0;
    
    const avgRevenueRetention = revenueData?.length ? 
      revenueData.reduce((sum: number, cohort: any) => sum + cohort.revenue_retention_3, 0) / revenueData.length : 0;

    // Find best performing channel
    const channelPerformance = channelData?.reduce((acc: any, channel: any) => {
      if (!acc[channel.referral_source]) {
        acc[channel.referral_source] = { total: 0, count: 0 };
      }
      acc[channel.referral_source].total += channel.retention_3;
      acc[channel.referral_source].count += 1;
      return acc;
    }, {});

    let bestPerformingChannel = 'Unknown';
    let bestAvgRetention = 0;
    
    if (channelPerformance) {
      Object.entries(channelPerformance).forEach(([channel, data]: [string, any]) => {
        const avgRetention = data.total / data.count;
        if (avgRetention > bestAvgRetention) {
          bestAvgRetention = avgRetention;
          bestPerformingChannel = channel;
        }
      });
    }

    const response: RetentionAnalysisResponse = {
      cohortRetention: cohortData || [],
      revenueRetention: revenueData || [],
      channelRetention: channelData || [],
      summary: {
        totalCustomers,
        avgRetentionMonth1: Math.round(avgRetentionMonth1 * 100) / 100,
        avgRetentionMonth3: Math.round(avgRetentionMonth3 * 100) / 100,
        avgRetentionMonth6: Math.round(avgRetentionMonth6 * 100) / 100,
        avgRevenueRetention: Math.round(avgRevenueRetention * 100) / 100,
        bestPerformingChannel,
        dateRange: `${startDateStr} to ${endDateStr}`
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Retention API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch retention analysis data" },
      { status: 500 }
    );
  }
}