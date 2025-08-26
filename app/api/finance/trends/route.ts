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
    const startMonth = searchParams.get('startMonth');
    const endMonth = searchParams.get('endMonth');

    // Default to last 12 months if not specified
    const defaultEndMonth = new Date().toISOString().split('T')[0].slice(0, 7) + '-01';
    const defaultStartMonth = new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1)
      .toISOString().split('T')[0];

    const start = startMonth || defaultStartMonth;
    const end = endMonth || defaultEndMonth;

    const { data, error } = await supabase
      .schema('finance')
      .rpc('get_pl_trends', {
        p_start_month: start,
        p_end_month: end
      });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: "Failed to fetch P&L trends" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}