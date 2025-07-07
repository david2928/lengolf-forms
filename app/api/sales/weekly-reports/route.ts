import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Call optimized materialized view function
    const { data, error } = await refacSupabaseAdmin
      .schema('pos')
      .rpc('get_weekly_reports_mv', {
        start_date: startDate,
        end_date: endDate
      });

    if (error) {
      console.error('Weekly reports error:', error);
      throw error;
    }

    // The function returns a JSON object, so we need to extract the data array
    const reportData = data && Array.isArray(data) ? data : [];
    
    // Transform the data to match frontend expectations
    const transformedData = reportData.map((row: any) => ({
      week: row.week,
      weekRange: row.weekRange,
      totalRevenue: row.totalRevenue,
      grossProfit: row.grossProfit,
      transactionCount: row.transactionCount,
      uniqueCustomers: row.uniqueCustomers,
      newCustomers: row.newCustomers,
      avgTransactionValue: row.avgTransactionValue,
      grossMarginPct: row.grossMarginPct,
      simUtilizationPct: row.simUtilizationPct,
      simUsageCount: row.simUsageCount,
      customerRetentionRate: row.customerRetentionRate,
      avgTransactionsPerDay: row.avgTransactionsPerDay,
      revenueGrowth: row.revenueGrowth,
      profitGrowth: row.profitGrowth,
      customerGrowth: row.customerGrowth
    }));
    
    return NextResponse.json({ 
      data: transformedData,
      success: true,
      period: 'weekly',
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    console.error('Weekly reports API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly reports' },
      { status: 500 }
    );
  }
}