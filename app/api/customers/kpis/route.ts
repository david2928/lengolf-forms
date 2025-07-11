/**
 * Customer KPIs API Endpoint
 * CMS-005: Customer Analytics - KPI Endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';

// GET /api/customers/kpis - Get customer KPIs
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    
    const dateFrom = searchParams.get('dateFrom') || null;
    const dateTo = searchParams.get('dateTo') || null;

    // Get KPIs using the database function
    const { data: kpis, error } = await refacSupabase
      .rpc('get_customer_kpis', {
        date_from: dateFrom,
        date_to: dateTo
      });

    if (error) throw error;

    return NextResponse.json(kpis || {});

  } catch (error: any) {
    console.error('Error fetching customer KPIs:', error);
    return NextResponse.json(
      { error: "Failed to fetch customer KPIs", details: error.message },
      { status: 500 }
    );
  }
}