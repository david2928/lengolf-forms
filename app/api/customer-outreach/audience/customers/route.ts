/**
 * Paginated Audience Customers API
 * Returns customers in small batches for progressive loading
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// GET /api/customer-outreach/audience/customers - Get paginated customers
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');
    const excludeCalled = searchParams.get('excludeCalled') === 'true';

    // Validate parameters
    if (offset < 0 || limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: "Invalid offset or limit parameters. Limit must be 1-50." },
        { status: 400 }
      );
    }

    // Get the selected audience ID from database
    const { data: selectedData, error: selectedError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('selected_audience')
      .select('audience_id')
      .eq('user_email', session.user.email)
      .single();

    if (selectedError && selectedError.code !== 'PGRST116') {
      throw selectedError;
    }

    const selectedAudienceId = selectedData?.audience_id || null;
    
    if (!selectedAudienceId) {
      return NextResponse.json({
        customers: [],
        hasMore: false,
        total: 0,
        offset: offset,
        limit: limit,
        message: "No audience selected"
      });
    }

    // Get audience details to determine sort order
    const { data: audience, error: audienceError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('audiences')
      .select('definition_json')
      .eq('id', selectedAudienceId)
      .single();

    if (audienceError) throw audienceError;

    // Extract sort preferences from audience definition
    const audienceFilters = audience?.definition_json?.filters || {};
    const sortBy = audienceFilters.sortBy || 'lifetimeValue';
    const sortOrder = audienceFilters.sortOrder || 'desc';

    // Map sortBy to database column names
    const sortColumnMap: Record<string, string> = {
      'lastVisit': 'last_visit_date',
      'lastContacted': 'last_contacted',
      'lifetimeValue': 'lifetime_spending',
      'totalBookings': 'total_bookings',
      'name': 'customer_name'
    };
    
    const dbSortColumn = sortColumnMap[sortBy] || 'lifetime_spending';
    const ascending = sortOrder === 'asc';

    // Get paginated customers using optimized function
    const { data: customers, error: customersError } = await refacSupabaseAdmin
      .rpc('get_paginated_audience_customers', {
        p_audience_id: selectedAudienceId,
        p_offset: offset,
        p_limit: limit,
        p_sort_column: dbSortColumn,
        p_sort_ascending: ascending,
        p_thai_only: true,
        p_exclude_called: excludeCalled
      });

    if (customersError) {
      console.error('Error fetching paginated customers:', customersError);
      throw customersError;
    }

    const customerList = customers || [];

    // Get total count for pagination info
    const { data: totalCount, error: countError } = await refacSupabaseAdmin
      .rpc('count_audience_customers', {
        p_audience_id: selectedAudienceId,
        p_thai_only: true,
        p_exclude_called: excludeCalled
      });

    const total = countError ? 0 : (totalCount || 0);
    const hasMore = (offset + limit) < total;

    console.log(`Fetched ${customerList.length} customers (offset: ${offset}, limit: ${limit}) from audience ${selectedAudienceId}`);

    return NextResponse.json({
      success: true,
      customers: customerList,
      pagination: {
        offset: offset,
        limit: limit,
        total: total,
        hasMore: hasMore,
        returned: customerList.length
      },
      audienceId: selectedAudienceId,
      sortBy: sortBy,
      sortOrder: sortOrder
    });

  } catch (error: any) {
    console.error('Error fetching paginated audience customers:', error);
    return NextResponse.json(
      { error: "Failed to fetch customers", details: error.message },
      { status: 500 }
    );
  }
}