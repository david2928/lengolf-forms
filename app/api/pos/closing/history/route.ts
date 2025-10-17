import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .schema('pos')
      .from('daily_reconciliations')
      .select('*', { count: 'exact' })
      .order('closing_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('closing_date', startDate);
    }

    if (endDate) {
      query = query.lte('closing_date', endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching reconciliation history:', error);
      return NextResponse.json({
        error: 'Failed to fetch reconciliation history'
      }, { status: 500 });
    }

    return NextResponse.json({
      reconciliations: data || [],
      total_count: count || 0,
      limit,
      offset,
      has_more: count ? offset + limit < count : false
    });

  } catch (error) {
    console.error('Error in closing history endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
