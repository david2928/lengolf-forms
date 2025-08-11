import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

interface DailySalesRequest {
  startDate: string;
  endDate: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: DailySalesRequest = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    // Query the lengolf_sales table for daily breakdown
    const { data, error } = await refacSupabaseAdmin.rpc('get_daily_sales_report', {
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: "Failed to fetch daily sales data" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Daily sales report error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}