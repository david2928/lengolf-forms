import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

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
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json({ error: "Month parameter is required" }, { status: 400 });
    }

    // Validate month format (YYYY-MM-DD or YYYY-MM)
    const monthDate = month.includes('-01') ? month : `${month}-01`;
    const parsedDate = new Date(monthDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid month format" }, { status: 400 });
    }

    // Get current month P&L data
    const { data: currentData, error: currentError } = await supabase
      .rpc('get_monthly_pl', {
        p_month: monthDate,
        p_include_runrate: true
      });

    if (currentError) {
      console.error('Database error (current):', currentError);
      return NextResponse.json({ error: "Failed to fetch current month data" }, { status: 500 });
    }

    // Get previous month P&L data for comparison
    const previousMonth = new Date(parsedDate.getFullYear(), parsedDate.getMonth() - 1, 1)
      .toISOString().split('T')[0];

    const { data: previousData, error: previousError } = await supabase
      .rpc('get_monthly_pl', {
        p_month: previousMonth,
        p_include_runrate: false
      });

    if (previousError) {
      console.error('Database error (previous):', previousError);
      // Don't fail if previous month data is missing, just return 0 growth
    }

    // Calculate KPIs
    const totalRevenue = currentData?.revenue?.total_sales || 0;
    const grossProfit = currentData?.gross_profit?.calculated || 0;
    const ebitda = currentData?.ebitda?.calculated || 0;

    // Calculate gross margin percentage
    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Calculate month-over-month growth
    const previousRevenue = previousData?.revenue?.total_sales || 0;
    const momGrowthPct = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    // Get run-rate projections if available
    const revenueRunrate = currentData?.run_rate_projections?.total_sales;
    const ebitdaRunrate = currentData?.run_rate_projections?.ebitda;

    const kpis = {
      total_revenue: totalRevenue,
      gross_margin_pct: grossMarginPct,
      ebitda: ebitda,
      mom_growth_pct: momGrowthPct,
      revenue_runrate: revenueRunrate,
      ebitda_runrate: ebitdaRunrate
    };

    return NextResponse.json(kpis);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}