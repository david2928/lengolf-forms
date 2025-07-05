import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (skip in development with SKIP_AUTH)
    if (process.env.NODE_ENV === 'production' || process.env.SKIP_AUTH !== 'true') {
      const { data: currentUser, error: userError } = await supabase
        .schema('backoffice')
        .from('allowed_users')
        .select('id, email, is_admin')
        .eq('email', session.user.email)
        .single();

      if (userError || !currentUser?.is_admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coach_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const month = searchParams.get('month'); // Format: YYYY-MM

    // Get earnings summary
    let summaryQuery = supabase
      .from('coach_earnings_summary_real')
      .select('*');

    if (coachId) {
      summaryQuery = summaryQuery.eq('coach_id', coachId);
    }

    const { data: summary, error: summaryError } = await summaryQuery;

    if (summaryError) {
      console.error('Error fetching earnings summary:', summaryError);
      return NextResponse.json({ error: 'Failed to fetch earnings summary' }, { status: 500 });
    }

    // Get detailed earnings data
    let detailQuery = supabase
      .from('coach_earnings_real')
      .select(`
        pos_sale_id,
        lesson_date,
        coach_id,
        coach_name,
        coach_display_name,
        customer_name,
        customer_phone_number,
        product_name,
        package_name,
        package_active_at_lesson_time,
        pax_count,
        rate_type,
        coach_revenue,
        booking_classification
      `)
      .order('lesson_date', { ascending: false });

    if (coachId) {
      detailQuery = detailQuery.eq('coach_id', coachId);
    }

    if (startDate) {
      detailQuery = detailQuery.gte('lesson_date', startDate);
    }

    if (endDate) {
      detailQuery = detailQuery.lte('lesson_date', endDate);
    }

    if (month) {
      const [year, monthNum] = month.split('-');
      const startOfMonth = `${year}-${monthNum}-01`;
      const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];
      detailQuery = detailQuery.gte('lesson_date', startOfMonth).lte('lesson_date', endOfMonth);
    }

    const { data: details, error: detailError } = await detailQuery;

    if (detailError) {
      console.error('Error fetching earnings details:', detailError);
      return NextResponse.json({ error: 'Failed to fetch earnings details' }, { status: 500 });
    }

    // Get monthly breakdown
    const { data: monthlyBreakdown, error: monthlyError } = await supabase
      .rpc('get_monthly_coaching_breakdown', { 
        coach_id_param: coachId || null 
      });

    if (monthlyError) {
      console.warn('Monthly breakdown not available:', monthlyError);
    }

    return NextResponse.json({
      success: true,
      summary: summary || [],
      details: details || [],
      monthlyBreakdown: monthlyBreakdown || [],
      metadata: {
        totalRecords: details?.length || 0,
        filters: {
          coachId,
          startDate,
          endDate,
          month
        }
      }
    });

  } catch (error) {
    console.error('Error in coaching earnings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 