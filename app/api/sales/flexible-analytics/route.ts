import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// Force dynamic rendering for this route since it uses search parameters
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {

    const { searchParams } = request.nextUrl;
    
    // Get parameters from query string
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const metric_type = searchParams.get('metric_type') || 'revenue';
    const time_period = searchParams.get('time_period') || 'daily';
    const dimension_type = searchParams.get('dimension_type') || 'none';
    const chart_type = searchParams.get('chart_type') || 'line';

    // Validate required parameters
    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    // Validate metric_type
    const validMetrics = ['revenue', 'profit', 'transaction_count', 'avg_transaction_value', 'utilization'];
    if (!validMetrics.includes(metric_type)) {
      return NextResponse.json(
        { error: `Invalid metric_type. Must be one of: ${validMetrics.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate time_period
    const validTimePeriods = ['daily', 'weekly', 'monthly'];
    if (!validTimePeriods.includes(time_period)) {
      return NextResponse.json(
        { error: `Invalid time_period. Must be one of: ${validTimePeriods.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate dimension_type
    const validDimensions = ['none', 'category', 'payment_method', 'customer_type'];
    if (!validDimensions.includes(dimension_type)) {
      return NextResponse.json(
        { error: `Invalid dimension_type. Must be one of: ${validDimensions.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate chart_type
    const validChartTypes = ['line', 'stacked', 'stacked100'];
    if (!validChartTypes.includes(chart_type)) {
      return NextResponse.json(
        { error: `Invalid chart_type. Must be one of: ${validChartTypes.join(', ')}` },
        { status: 400 }
      );
    }

    console.log('Calling get_flexible_analytics with params:', {
      start_date,
      end_date,
      metric_type,
      time_period,
      dimension_type,
      chart_type
    });

    // Call the database function
    const { data, error } = await refacSupabaseAdmin.rpc('get_flexible_analytics', {
      start_date,
      end_date,
      metric_type,
      time_period,
      dimension_type,
      chart_type
    });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No data returned from database function' },
        { status: 404 }
      );
    }

    console.log('Flexible analytics data fetched successfully');
    return NextResponse.json(data);

  } catch (error) {
    console.error('Flexible analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 