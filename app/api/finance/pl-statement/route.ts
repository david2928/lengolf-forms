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
    const includeRunRate = searchParams.get('includeRunRate') === 'true';
    const comparison = searchParams.get('comparison'); // 'previous' for previous month comparison
    const calculationDate = searchParams.get('calculationDate'); // Custom calculation cutoff date

    if (!month) {
      return NextResponse.json({ error: "Month parameter is required" }, { status: 400 });
    }

    // Validate month format (YYYY-MM-DD or YYYY-MM)
    const monthDate = month.includes('-01') ? month : `${month}-01`;
    const parsedDate = new Date(monthDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid month format" }, { status: 400 });
    }

    if (comparison === 'previous') {
      // Get comparison with previous month
      const currentMonth = monthDate;
      const previousMonth = new Date(parsedDate.getFullYear(), parsedDate.getMonth() - 1, 1)
        .toISOString().split('T')[0];

      const { data, error } = await supabase
        .rpc('get_pl_comparison', {
          p_current_month: currentMonth,
          p_previous_month: previousMonth
        });

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: "Failed to fetch P&L comparison" }, { status: 500 });
      }

      return NextResponse.json(data);
    } else {
      // Get single month P&L
      const { data, error } = await supabase
        .rpc('get_monthly_pl', {
          p_month: monthDate,
          p_include_runrate: includeRunRate,
          p_calculation_date: calculationDate || null
        });

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: "Failed to fetch P&L data" }, { status: 500 });
      }

      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { month, action } = body;

    if (!month) {
      return NextResponse.json({ error: "Month is required" }, { status: 400 });
    }

    if (action === 'save_snapshot') {
      // Save monthly snapshot
      const { data, error } = await supabase
        .schema('finance')
        .rpc('save_monthly_snapshot', {
          p_month: month
        });

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}