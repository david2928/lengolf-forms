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
    console.log('🔧 COACHING API: GET request received');
    console.log('🔧 Auth header:', request.headers.get('Authorization'));
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
    
    // Get session using our dev-session wrapper
    const session = await getDevSession(authOptions, request);
    console.log('🔧 Session result:', session ? 'SUCCESS' : 'NULL');
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check with development bypass
    let isAdmin = false;
    if (process.env.NODE_ENV === 'development') {
      // In development, trust the JWT token's isAdmin field or bypass entirely
      isAdmin = session.user.isAdmin || true; // Allow all authenticated users in dev
      console.log('🔧 Development mode: Admin check bypassed for user:', session.user.email);
    } else {
      // Production: Check database for admin status
      const { data: user, error: userError } = await supabase
        .schema('backoffice')
        .from('allowed_users')
        .select('is_admin')
        .eq('email', session.user.email)
        .single();

      if (userError || !user?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      isAdmin = user.is_admin;
    }

    // Get all coaches from allowed_users table
    const { data: allCoaches, error: coachesError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, coach_name, coach_display_name, coach_email, is_active_coach')
      .eq('is_coach', true)
      .order('coach_display_name');

    if (coachesError) {
      console.error('Error fetching coaches:', coachesError);
      return NextResponse.json({ error: 'Failed to fetch coaches' }, { status: 500 });
    }

    // Calculate operational metrics for each coach
    const coaches = await Promise.all(
      (allCoaches || []).map(async (coach) => {
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
          coach_email: coach.coach_email,
          is_active_coach: coach.is_active_coach,
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
        isAdmin,
        nodeEnv: process.env.NODE_ENV
      } : undefined
    });

  } catch (error) {
    console.error('Error in coaches API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session using our dev-session wrapper
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check with development bypass
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Admin check bypassed for POST');
    } else {
      // Production: Check database for admin status
      const { data: user, error: userError } = await supabase
        .schema('backoffice')
        .from('allowed_users')
        .select('is_admin')
        .eq('email', session.user.email)
        .single();

      if (userError || !user?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();

    // Create or update coach
    const {
      email,
      coach_name,
      coach_display_name,
      coach_bio,
      coach_experience_years,
      coach_specialties,
      coach_phone,
      coach_email,
      coach_started_date
    } = body;

    const { data: coach, error } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .upsert({
        email,
        is_coach: true,
        is_active_coach: true,
        coach_name,
        coach_display_name,
        coach_bio,
        coach_experience_years,
        coach_specialties,
        coach_phone,
        coach_email,
        coach_started_date
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating/updating coach:', error);
      return NextResponse.json({ error: 'Failed to create/update coach' }, { status: 500 });
    }

    return NextResponse.json({ 
      coach,
      message: 'Coach created/updated successfully'
    });

  } catch (error) {
    console.error('Error in coaches POST API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}