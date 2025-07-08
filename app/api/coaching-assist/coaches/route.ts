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
    // Get session using our dev-session wrapper
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Staff access - all authenticated users can access this endpoint
    // No admin check required for coaching assistance

    // Get all coaches from allowed_users table
    const { data: allCoaches, error: coachesError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, coach_name, coach_display_name, email, is_coach')
      .eq('is_coach', true)
      .order('coach_display_name');

    if (coachesError) {
      console.error('Error fetching coaches:', coachesError);
      return NextResponse.json({ error: 'Failed to fetch coaches' }, { status: 500 });
    }

    // Deduplicate coaches by coach_display_name (use the first occurrence)
    const uniqueCoaches = allCoaches?.reduce((acc, coach) => {
      const displayName = coach.coach_display_name || coach.coach_name;
      if (!acc.find(existing => (existing.coach_display_name || existing.coach_name) === displayName)) {
        acc.push(coach);
      }
      return acc;
    }, [] as typeof allCoaches) || [];

    // Calculate operational metrics for each coach
    const coaches = await Promise.all(
      uniqueCoaches.map(async (coach) => {
        const coachDisplayName = coach.coach_display_name || coach.coach_name;
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        
        // Get current month sessions
        const { data: currentSessions } = await supabase
          .from('bookings')
          .select('*')
          .gte('date', `${currentMonth}-01`)
          .ilike('booking_type', `%${coachDisplayName}%`)
          .eq('status', 'confirmed');

        // Get total sessions ever
        const { data: totalSessions } = await supabase
          .from('bookings')
          .select('id')
          .ilike('booking_type', `%${coachDisplayName}%`)
          .eq('status', 'confirmed');

        // Get unique students
        const { data: studentBookings } = await supabase
          .from('bookings')
          .select('name')
          .ilike('booking_type', `%${coachDisplayName}%`)
          .eq('status', 'confirmed');

        const uniqueStudents = new Set(studentBookings?.map(b => b.name) || []).size;

        // Calculate utilization for today
        const today = new Date().toISOString().split('T')[0];
        const { data: todayBookings } = await supabase
          .from('bookings')
          .select('duration')
          .eq('date', today)
          .ilike('booking_type', `%${coachDisplayName}%`)
          .eq('status', 'confirmed');

        const todayHours = todayBookings?.reduce((sum, b) => sum + (b.duration || 1), 0) || 0;
        const utilizationRate = (todayHours / 8) * 100; // Assume 8-hour workday

        // Get last session date
        const { data: lastSession } = await supabase
          .from('bookings')
          .select('date')
          .ilike('booking_type', `%${coachDisplayName}%`)
          .eq('status', 'confirmed')
          .order('date', { ascending: false })
          .limit(1);

        return {
          coach_id: coach.id,
          coach_name: coach.coach_name,
          coach_display_name: coach.coach_display_name,
          email: coach.email,
          is_coach: coach.is_coach,
          current_month_sessions: currentSessions?.length || 0,
          total_sessions: totalSessions?.length || 0,
          student_count: uniqueStudents,
          utilization_rate: Math.round(utilizationRate * 100) / 100,
          last_session_date: lastSession?.[0]?.date || null
        };
      })
    );

    return NextResponse.json({ 
      coaches,
      debug: process.env.NODE_ENV === 'development' ? {
        user: session.user.email,
        nodeEnv: process.env.NODE_ENV
      } : undefined
    });

  } catch (error) {
    console.error('Error in coaching-assist coaches API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}