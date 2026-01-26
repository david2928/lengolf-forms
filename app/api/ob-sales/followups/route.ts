/**
 * OB Follow-ups API
 * Returns customers with scheduled follow-ups from their most recent call
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

// GET /api/ob-sales/followups - Get paginated follow-ups list
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate parameters
    if (offset < 0 || limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: "Invalid offset or limit parameters. Limit must be 1-50." },
        { status: 400 }
      );
    }

    // Get paginated follow-ups
    const { data: customers, error: customersError } = await refacSupabaseAdmin
      .rpc('get_ob_followups', {
        p_offset: offset,
        p_limit: limit
      });

    if (customersError) {
      console.error('Error fetching follow-ups:', customersError);
      throw customersError;
    }

    // Get total count for pagination
    const { data: totalCount, error: countError } = await refacSupabaseAdmin
      .rpc('count_ob_followups');

    if (countError) {
      console.error('Error fetching follow-up count:', countError);
    }

    const total = countError ? 0 : (totalCount || 0);
    const hasMore = (offset + limit) < total;
    const customerList = customers || [];

    console.log(`OB Follow-ups: Fetched ${customerList.length} customers (offset: ${offset}, limit: ${limit}, total: ${total})`);

    return NextResponse.json({
      success: true,
      customers: customerList,
      pagination: {
        offset: offset,
        limit: limit,
        total: total,
        hasMore: hasMore,
        returned: customerList.length
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('OB Follow-ups API Error:', error);
    return NextResponse.json(
      { error: "Failed to fetch follow-ups", details: errorMessage },
      { status: 500 }
    );
  }
}
