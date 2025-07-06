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
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Get coach information
    const { data: coach, error: coachError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, is_coach, is_admin, coach_name, coach_display_name, coach_email, coach_experience_years, coach_specialties')
      .eq('email', session.user.email)
      .single();

    if (coachError || !coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    if (!coach.is_coach && !coach.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Not a coach' }, { status: 403 });
    }

    // For admins, they can view any coach's dashboard by passing coach_id
    let targetCoachId = coach.id;
    const requestedCoachId = searchParams.get('coach_id');
    
    if (coach.is_admin && requestedCoachId) {
      targetCoachId = requestedCoachId;
    } else if (!coach.is_coach) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get earnings summary for the coach
    const { data: earningsSummary, error: earningsError } = await supabase
      .schema('backoffice')
      .from('coach_earnings_summary')
      .select('*')
      .eq('coach_id', targetCoachId)
      .single();

    if (earningsError) {
      console.error('Error fetching earnings:', earningsError);
      // If no earnings found, create a default structure
    }

    // Get monthly earnings using the function
    const { data: monthlyEarnings, error: monthlyError } = await supabase
      .schema('backoffice')
      .rpc('get_coach_monthly_earnings', {
        p_coach_id: targetCoachId,
        p_year: year,
        p_month: month
      });

    if (monthlyError) {
      console.error('Error fetching monthly earnings:', monthlyError);
    }

    // Get recent sessions
    const { data: recentSessions, error: sessionsError } = await supabase
      .schema('backoffice')
      .from('coaching_sessions')
      .select(`
        id,
        customer_name,
        session_date,
        start_time,
        end_time,
        lesson_type,
        session_rate,
        total_amount,
        payment_status,
        session_status,
        number_of_participants
      `)
      .eq('coach_id', targetCoachId)
      .order('session_date', { ascending: false })
      .limit(10);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
    }

    // Get upcoming sessions (next 7 days)
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const { data: upcomingSessions, error: upcomingError } = await supabase
      .schema('backoffice')
      .from('coaching_sessions')
      .select(`
        id,
        customer_name,
        session_date,
        start_time,
        end_time,
        lesson_type,
        session_status,
        bay_number
      `)
      .eq('coach_id', targetCoachId)
      .gte('session_date', today)
      .lte('session_date', nextWeekStr)
      .in('session_status', ['scheduled', 'confirmed'])
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (upcomingError) {
      console.error('Error fetching upcoming sessions:', upcomingError);
    }

    return NextResponse.json({
      coach: {
        id: coach.id,
        name: coach.coach_name,
        display_name: coach.coach_display_name,
        email: coach.coach_email,
        experience_years: coach.coach_experience_years,
        specialties: coach.coach_specialties
      },
      earnings: earningsSummary || {
        current_month_earnings: '0',
        previous_month_earnings: '0',
        total_earnings: '0',
        current_month_sessions: 0,
        total_sessions: 0,
        average_session_rate: '0'
      },
      monthly_earnings: monthlyEarnings?.[0] || {
        total_earnings: '0',
        session_count: 0,
        average_rate: '0',
        paid_sessions: 0,
        pending_sessions: 0
      },
      recent_sessions: recentSessions || [],
      upcoming_sessions: upcomingSessions || [],
      selected_period: { year, month }
    });

  } catch (error) {
    console.error('Error in coaching dashboard API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 