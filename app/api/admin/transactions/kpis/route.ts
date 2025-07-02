import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function POST(req: NextRequest) {
  try {
    const { startDate, endDate, compareStartDate, compareEndDate } = await req.json();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Use the same function as the sales dashboard for consistency
    const { data, error } = await refacSupabaseAdmin.rpc('get_dashboard_summary_enhanced', {
      start_date: startDate,
      end_date: endDate,
      comparison_start_date: compareStartDate || null,
      comparison_end_date: compareEndDate || null
    });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch transaction KPIs',
          details: error.message 
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No data returned from database' },
        { status: 404 }
      );
    }

    // Transform the data to match our TransactionKPIs interface
    const transformKPIData = (periodData: any) => ({
      totalSales: periodData.total_revenue || 0,
      salesGrowth: 0, // Will be calculated client-side
      transactionCount: periodData.transaction_count || 0,
      transactionGrowth: 0, // Will be calculated client-side
      grossProfit: periodData.gross_profit || 0,
      grossMargin: periodData.gross_margin_pct || 0,
      averageTransactionValue: periodData.avg_transaction_value || 0,
      newCustomers: periodData.new_customers || 0,
      totalCost: (periodData.total_revenue || 0) - (periodData.gross_profit || 0)
    });

    const response = {
      success: true,
      data: {
        current_period: transformKPIData(data.current_period),
        comparison_period: data.comparison_period ? transformKPIData(data.comparison_period) : undefined
      },
      performance: {
        query_time_ms: Date.now() - startTime
      }
    };

    // Calculate growth percentages if comparison data exists
    if (response.data.comparison_period) {
      const current = response.data.current_period;
      const previous = response.data.comparison_period;

      current.salesGrowth = previous.totalSales > 0 
        ? ((current.totalSales - previous.totalSales) / previous.totalSales) * 100
        : 0;

      current.transactionGrowth = previous.transactionCount > 0
        ? ((current.transactionCount - previous.transactionCount) / previous.transactionCount) * 100
        : 0;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 