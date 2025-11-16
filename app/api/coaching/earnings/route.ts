import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';

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

    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coach_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const period = searchParams.get('period'); // 'today', 'week', 'month', 'year'
    const rateType = searchParams.get('rate_type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Calculate date range based on period
    let calculatedStartDate = startDate;
    let calculatedEndDate = endDate;
    
    if (period) {
      const now = new Date();
      const todayString = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      
      switch (period) {
        case 'today':
          calculatedStartDate = todayString;
          calculatedEndDate = todayString;
          break;
        case 'week':
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          calculatedStartDate = weekStart.toLocaleDateString('en-CA');
          calculatedEndDate = weekEnd.toLocaleDateString('en-CA');
          break;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          calculatedStartDate = monthStart.toLocaleDateString('en-CA');
          calculatedEndDate = monthEnd.toLocaleDateString('en-CA');
          break;
        case 'year':
          const yearStart = new Date(now.getFullYear(), 0, 1);
          const yearEnd = new Date(now.getFullYear(), 11, 31);
          calculatedStartDate = yearStart.toLocaleDateString('en-CA');
          calculatedEndDate = yearEnd.toLocaleDateString('en-CA');
          break;
      }
    }

    // Get current user information
    const { data: currentUser, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, email, is_admin, is_coach, coach_name, coach_display_name, coach_code')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    // Determine which coach's earnings to fetch
    let targetCoachCode = currentUser.coach_code;
    
    if (currentUser.is_admin && coachId) {
      // Admin viewing specific coach's earnings
      const { data: selectedCoach } = await supabase
        .schema('backoffice')
        .from('allowed_users')
        .select('coach_code')
        .eq('id', coachId)
        .single();
      
      if (selectedCoach) {
        targetCoachCode = selectedCoach.coach_code;
      }
    } else if (!currentUser.is_coach && !currentUser.is_admin) {
      return NextResponse.json({ error: 'Not authorized to view earnings data' }, { status: 403 });
    }

    // Build earnings query from coach earnings data
    let query = supabase
      .schema('backoffice')
      .from('coach_earnings')
      .select('*')
      .eq('coach', targetCoachCode);

    // Apply date filters - support both period-based and custom date ranges (including partial ranges)
    if (calculatedStartDate) {
      query = query.gte('date', calculatedStartDate);
    }
    if (calculatedEndDate) {
      // Use lte to include records on the end date
      query = query.lte('date', calculatedEndDate);
    }

    // Apply rate type filter
    if (rateType && rateType !== 'all') {
      query = query.eq('rate_type', rateType);
    }

    // Apply pagination and ordering
    query = query
      .order('date', { ascending: false })
      .order('receipt_number', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: earnings, error } = await query;

    if (error) {
      console.error('Error fetching earnings:', error);
      return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .schema('backoffice')
      .from('coach_earnings')
      .select('*', { count: 'exact', head: true })
      .eq('coach', targetCoachCode);

    if (calculatedStartDate) {
      countQuery = countQuery.gte('date', calculatedStartDate);
    }
    if (calculatedEndDate) {
      // Use lte to include records on the end date
      countQuery = countQuery.lte('date', calculatedEndDate);
    }
    if (rateType && rateType !== 'all') {
      countQuery = countQuery.eq('rate_type', rateType);
    }

    const { count } = await countQuery;

    // Calculate summary statistics with discount breakdown
    const grossRevenue = earnings?.reduce((sum, earning) => sum + parseFloat(earning.gross_coach_earnings || '0'), 0) || 0;
    const totalDiscounts = earnings?.reduce((sum, earning) => sum + parseFloat(earning.discount_deduction || '0'), 0) || 0;
    const netRevenue = earnings?.reduce((sum, earning) => sum + parseFloat(earning.coach_earnings || '0'), 0) || 0;
    const totalLessons = earnings?.length || 0;
    const avgPerLesson = totalLessons > 0 ? netRevenue / totalLessons : 0;

    // Group by rate type for breakdown (including discount info)
    const rateTypeBreakdown = earnings?.reduce((acc, earning) => {
      const rateType = earning.rate_type || 'Unknown';
      if (!acc[rateType]) {
        acc[rateType] = { count: 0, gross_revenue: 0, discounts: 0, net_revenue: 0 };
      }
      acc[rateType].count += 1;
      acc[rateType].gross_revenue += parseFloat(earning.gross_coach_earnings || '0');
      acc[rateType].discounts += parseFloat(earning.discount_deduction || '0');
      acc[rateType].net_revenue += parseFloat(earning.coach_earnings || '0');
      return acc;
    }, {} as Record<string, { count: number; gross_revenue: number; discounts: number; net_revenue: number }>) || {};

    // Get available rate types for filtering
    const { data: availableRateTypes } = await supabase
      .schema('backoffice')
      .from('coach_rates')
      .select('rate_type, rate')
      .order('rate_type');

    return NextResponse.json({
      earnings: earnings || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
      summary: {
        gross_revenue: grossRevenue,
        total_discounts: totalDiscounts,
        net_revenue: netRevenue,
        total_revenue: netRevenue, // Backward compatibility
        avg_per_lesson: avgPerLesson,
        total_lessons: totalLessons,
        rate_type_breakdown: rateTypeBreakdown
      },
      available_rate_types: availableRateTypes || [],
      period_info: {
        start_date: calculatedStartDate,
        end_date: calculatedEndDate,
        period
      }
    });

  } catch (error) {
    console.error('Error in earnings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}