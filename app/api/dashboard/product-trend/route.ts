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
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');
    const productName = searchParams.get('product_name');

    if (!startDateParam || !endDateParam || !productName) {
      return NextResponse.json({
        error: "Start date, end date, and product name are required"
      }, { status: 400 });
    }

    // Use dates directly - they're already in YYYY-MM-DD format from frontend
    const startDate = startDateParam;
    const endDate = endDateParam;

    // Get daily trend data for the specific product
    const { data: trendData, error: trendError } = await supabase.rpc('get_product_daily_trend', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_product_name: productName
    });

    if (trendError) {
      console.error('Product trend query error:', trendError);
      return NextResponse.json({ error: "Failed to fetch product trend data" }, { status: 500 });
    }

    return NextResponse.json({
      trend_data: trendData || []
    });

  } catch (error) {
    console.error('Product trend API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}