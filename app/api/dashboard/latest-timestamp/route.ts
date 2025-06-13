import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .rpc('get_latest_data_timestamp');

    if (error) {
      console.error('Error fetching latest timestamp:', error);
      return NextResponse.json(
        { error: 'Failed to fetch latest timestamp' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No data found' },
        { status: 404 }
      );
    }

    const result = data[0];
    
    return NextResponse.json({
      latest_sales_date: result.latest_sales_date,
      latest_sales_timestamp: result.latest_sales_timestamp,
      latest_sales_timestamp_bkk: result.latest_sales_timestamp_bkk,
      total_sales_today: result.total_sales_today,
      total_revenue_today: result.total_revenue_today,
      last_receipt_number: result.last_receipt_number
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 