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
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json({ error: "Month parameter is required" }, { status: 400 });
    }

    // Validate month format (YYYY-MM-DD or YYYY-MM)
    const monthDate = month.length > 7 ? month : `${month}-01`;
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

    // Get previous month P&L data for comparison - Fixed date calculation
    const currYear = parsedDate.getFullYear();
    const currMonthIndex = parsedDate.getMonth(); // 0-indexed (Aug = 7)
    const prevYear = currMonthIndex === 0 ? currYear - 1 : currYear;
    const prevMonthIndex = currMonthIndex === 0 ? 11 : currMonthIndex - 1;
    const previousMonth = `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-01`;

    const { data: previousData, error: previousError } = await supabase
      .rpc('get_monthly_pl', {
        p_month: previousMonth,
        p_include_runrate: false,
        p_calculation_date: null
      });

    if (previousError) {
      console.error('Database error (previous):', previousError);
      // Don't fail if previous month data is missing, just return 0 growth
    }


    // Check if this is current month (for run-rate comparison)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const isCurrentMonth = month.slice(0, 7) === currentMonth;
    
    // Calculate KPIs - use run-rate values for current month if available
    const netSales = (isCurrentMonth && currentData?.run_rate_projections?.combined_net) 
      ? currentData.run_rate_projections.combined_net 
      : currentData?.revenue?.combined_net || 0;
    const grossProfit = (isCurrentMonth && currentData?.run_rate_projections?.gross_profit) 
      ? currentData.run_rate_projections.gross_profit 
      : currentData?.gross_profit?.calculated || 0;
    const marketingExpenses = (isCurrentMonth && currentData?.run_rate_projections) 
      ? (currentData.run_rate_projections.google_ads || 0) + 
        (currentData.run_rate_projections.meta_ads || 0) + 
        (currentData.run_rate_projections.operating_expenses_by_category?.["Marketing Expenses"]?.reduce((sum: number, expense: any) => sum + expense.amount, 0) || 0)
      : (currentData?.marketing_expenses?.calculated_total || 0);
    const ebitda = (isCurrentMonth && currentData?.run_rate_projections?.ebitda) 
      ? currentData.run_rate_projections.ebitda 
      : currentData?.ebitda?.calculated || 0;

    // Calculate month-over-month growth using run-rate values for current month
    const previousNetSales = previousData?.revenue?.combined_net || 0;
    const previousGrossProfit = previousData?.gross_profit?.calculated || 0;
    
    // FIXED: Use the calculated_total which already includes operating marketing expenses
    const previousMarketingExpenses = previousData?.marketing_expenses?.calculated_total || 0;
    
    
    const previousEbitda = previousData?.ebitda?.calculated || 0;

    const netSalesMoMPct = previousNetSales > 0 ? ((netSales - previousNetSales) / previousNetSales) * 100 : 0;
    const grossProfitMoMPct = previousGrossProfit > 0 ? ((grossProfit - previousGrossProfit) / previousGrossProfit) * 100 : 0;
    const marketingExpensesMoMPct = previousMarketingExpenses > 0 ? ((marketingExpenses - previousMarketingExpenses) / previousMarketingExpenses) * 100 : 0;
    const ebitdaMoMPct = previousEbitda > 0 ? ((ebitda - previousEbitda) / previousEbitda) * 100 : 0;

    // Calculate year-over-year growth (available from April 2025 onwards)
    let netSalesYoYPct = null;
    let grossProfitYoYPct = null;
    let marketingExpensesYoYPct = null;
    let ebitdaYoYPct = null;

    // Check if YoY comparison is available (from April 2025 onwards)
    const currentYear = parsedDate.getFullYear();
    const currentMonthNum = parsedDate.getMonth() + 1; // 1-based month
    const isYoYAvailable = currentYear >= 2025 && (currentYear > 2025 || currentMonthNum >= 4);

    if (isYoYAvailable) {
      const previousYear = new Date(parsedDate.getFullYear() - 1, parsedDate.getMonth(), 1)
        .toISOString().split('T')[0];

      const { data: previousYearData, error: previousYearError } = await supabase
        .rpc('get_monthly_pl', {
          p_month: previousYear,
          p_include_runrate: false
        });

      if (!previousYearError && previousYearData) {
        const previousYearNetSales = previousYearData?.revenue?.combined_net || 0;
        const previousYearGrossProfit = previousYearData?.gross_profit?.calculated || 0;
        const previousYearMarketingExpenses = previousYearData?.marketing_expenses?.calculated_total || 0;
        const previousYearEbitda = previousYearData?.ebitda?.calculated || 0;


        netSalesYoYPct = previousYearNetSales > 0 ? ((netSales - previousYearNetSales) / previousYearNetSales) * 100 : null;
        grossProfitYoYPct = previousYearGrossProfit > 0 ? ((grossProfit - previousYearGrossProfit) / previousYearGrossProfit) * 100 : null;
        marketingExpensesYoYPct = previousYearMarketingExpenses > 0 ? ((marketingExpenses - previousYearMarketingExpenses) / previousYearMarketingExpenses) * 100 : null;
        
        // For EBITDA, if previous year was negative/zero, show absolute difference instead of percentage
        if (previousYearEbitda > 0) {
          ebitdaYoYPct = ((ebitda - previousYearEbitda) / previousYearEbitda) * 100;
        } else {
          // Return absolute difference when percentage doesn't make sense
          ebitdaYoYPct = ebitda - previousYearEbitda;
        }
      }
    }

    // Get run-rate projections if available
    const revenueRunrate = currentData?.run_rate_projections?.total_sales;
    const ebitdaRunrate = currentData?.run_rate_projections?.ebitda;


    const kpis = {
      net_sales: netSales,
      gross_profit: grossProfit,
      marketing_expenses: marketingExpenses,
      ebitda: ebitda,
      net_sales_mom_pct: netSalesMoMPct,
      gross_profit_mom_pct: grossProfitMoMPct,
      marketing_expenses_mom_pct: marketingExpensesMoMPct,
      ebitda_mom_pct: ebitdaMoMPct,
      net_sales_yoy_pct: netSalesYoYPct,
      gross_profit_yoy_pct: grossProfitYoYPct,
      marketing_expenses_yoy_pct: marketingExpensesYoYPct,
      ebitda_yoy_pct: ebitdaYoYPct,
      revenue_runrate: revenueRunrate,
      ebitda_runrate: ebitdaRunrate
    };

    return NextResponse.json(kpis);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}