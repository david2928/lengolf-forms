import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface Coach {
  id: string;
  coach_name: string;
  coach_display_name: string;
  email: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const adminSelectedCoachId = searchParams.get('coach_id'); // For admin to select specific coach

    // Get current user information to check if they're admin or coach
    const { data: currentUser, error: userError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, email, is_admin, is_coach, coach_name, coach_display_name, coach_phone, coach_code')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    let targetCoach = currentUser;
    let isAdminView = false;

    // If user is admin and they've selected a specific coach, get that coach's data
    if (currentUser.is_admin && adminSelectedCoachId) {
      const { data: selectedCoach, error: selectedCoachError } = await supabase
        .schema('backoffice')
        .from('allowed_users')
        .select('id, email, is_admin, is_coach, coach_name, coach_display_name, coach_phone, coach_code')
        .eq('id', adminSelectedCoachId)
        .eq('is_coach', true)
        .single();

      if (selectedCoachError || !selectedCoach) {
        return NextResponse.json({ error: 'Selected coach not found' }, { status: 404 });
      }

      targetCoach = selectedCoach;
      isAdminView = true;
    } else if (!currentUser.is_coach && !currentUser.is_admin) {
      // User is neither coach nor admin
      return NextResponse.json({ error: 'Not authorized to view coaching data' }, { status: 403 });
    } else if (!currentUser.is_coach && currentUser.is_admin && !adminSelectedCoachId) {
      // Admin user but no coach selected - return list of coaches for selection
      const { data: allCoachesRaw, error: coachesError } = await supabase
        .schema('backoffice')
        .from('allowed_users')
        .select('id, coach_name, coach_display_name, coach_phone, email')
        .eq('is_coach', true)
        .order('coach_display_name');

      if (coachesError) {
        console.error('Error fetching coaches for admin selection:', coachesError);
        return NextResponse.json({
          isAdminView: true,
          requiresCoachSelection: true,
          availableCoaches: [],
          currentUser: {
            id: currentUser.id,
            email: currentUser.email,
            isAdmin: currentUser.is_admin,
            isCoach: currentUser.is_coach
          },
          error: 'Failed to fetch coaches'
        });
      }

      // Remove duplicates by coach_display_name (keep first occurrence)
      const seenDisplayNames = new Set();
      const allCoaches = (allCoachesRaw || []).filter(coach => {
        if (seenDisplayNames.has(coach.coach_display_name)) {
          return false;
        }
        seenDisplayNames.add(coach.coach_display_name);
        return true;
      });

      return NextResponse.json({
        isAdminView: true,
        requiresCoachSelection: true,
        availableCoaches: allCoaches || [],
        currentUser: {
          id: currentUser.id,
          email: currentUser.email,
          isAdmin: currentUser.is_admin,
          isCoach: currentUser.is_coach
        }
      });
    }

    // Get coach code for filtering POS data
    const coachCode = targetCoach.coach_code || (
      targetCoach.coach_display_name === 'Boss' ? 'BOSS' :
      targetCoach.coach_display_name === 'Ratchavin' ? 'RATCHAVIN' :
      targetCoach.coach_display_name === 'Noon' ? 'NOON' : null
    );

    // FIXED: Use coach_display_name for matching instead of coach_name
    const coachDisplayName = targetCoach.coach_display_name || targetCoach.coach_name?.replace('Coach ', '') || '';
    
    console.log(`[DEBUG] Target coach info:`, {
      id: targetCoach.id,
      coach_name: targetCoach.coach_name,
      coach_display_name: targetCoach.coach_display_name,
      coach_code: targetCoach.coach_code,
      derived_coachDisplayName: coachDisplayName
    });

    // Get real coaching lessons from POS reconciliation data using display name
    const { data: allCoachingLessons, error: lessonsError } = await supabase
      .schema('backoffice')
      .from('coach_earnings')
      .select('*')
      .eq('coach', targetCoach.coach_code)
      .order('date', { ascending: false });

    if (lessonsError) {
      console.error('Error fetching coaching lessons:', lessonsError);
    }

    const lessons = allCoachingLessons || [];

    // Current timestamp for comparisons
    const currentDate = new Date();

    // Get upcoming bookings from public.bookings table for this specific coach
    const today = currentDate.toISOString().split('T')[0];
    const nextMonth = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Create precise booking type filter to prevent data mixing between coaches
    const getBookingTypeFilter = (coachDisplayName: string) => {
      console.log(`[DEBUG] getBookingTypeFilter called with coachDisplayName: "${coachDisplayName}"`);
      
      switch (coachDisplayName) {
        case 'Boss':
          console.log(`[DEBUG] Boss selected, returning: "Coaching (Boss)"`);
          return 'Coaching (Boss)'; // Exact match to exclude "Coaching (Boss - Ratchavin)"
        case 'Ratchavin':
          console.log(`[DEBUG] Ratchavin selected, returning: "Coaching (Boss - Ratchavin)"`);
          return 'Coaching (Boss - Ratchavin)'; // Exact match for Ratchavin's bookings
        case 'Noon':
          console.log(`[DEBUG] Noon selected, returning: "Coaching (Noon)"`);
          return 'Coaching (Noon)'; // Exact match for Noon's bookings
        default:
          const fallback = `Coaching (${coachDisplayName})`;
          console.log(`[DEBUG] Default case, returning: "${fallback}"`);
          return fallback; // Fallback for other coaches
      }
    };
    
    const bookingTypeFilter = getBookingTypeFilter(coachDisplayName);
    console.log(`[DEBUG] Upcoming bookings query:`, {
      today,
      nextMonth,
      bookingTypeFilter,
      coachDisplayName
    });
    
    const { data: upcomingBookingsRaw, error: bookingsError } = await supabase
      .schema('public')
      .from('bookings')
      .select('*')
      .gte('date', today)
      .lte('date', nextMonth)
      .eq('booking_type', bookingTypeFilter)
      .eq('status', 'confirmed')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
    
    console.log(`[DEBUG] Upcoming bookings result:`, {
      count: upcomingBookingsRaw?.length || 0,
      error: bookingsError,
      first_few: upcomingBookingsRaw?.slice(0, 3)
    });

    if (bookingsError) {
      console.error('Error fetching upcoming bookings:', bookingsError);
    }

    // Filter out past times (today but already finished)
    const upcomingBookings = (upcomingBookingsRaw || []).filter(b => {
      const bookingDateTimeStr = `${b.date}T${b.start_time || '00:00'}`;
      const bookingDateTime = new Date(bookingDateTimeStr);
      return bookingDateTime > currentDate;
    });

    // Recent activity: last 20 past bookings (completed or cancelled)
    const recentBookingTypeFilter = getBookingTypeFilter(coachDisplayName);
    console.log(`[DEBUG] Recent bookings query:`, {
      today,
      bookingTypeFilter: recentBookingTypeFilter,
      coachDisplayName
    });
    
    const { data: recentBookingsRaw } = await supabase
      .schema('public')
      .from('bookings')
      .select('*')
      .lte('date', today)
      .eq('booking_type', recentBookingTypeFilter)
      .in('status', ['confirmed', 'cancelled'])
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(20);
    
    console.log(`[DEBUG] Recent bookings result:`, {
      count: recentBookingsRaw?.length || 0,
      first_few: recentBookingsRaw?.slice(0, 3)
    });

    const recentBookings = (recentBookingsRaw || []).map(b => ({
      id: b.id,
      customer_name: b.name,
      booking_date: b.date,
      start_time: b.start_time,
      end_time: (function() {
        if (!b.start_time) return null;
        const parts = b.start_time.split(':');
        if (parts.length !== 2) return null;
        const d = new Date();
        d.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
        d.setHours(d.getHours() + (b.duration || 1));
        return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      })(),
      status: b.status,
      bay_number: b.bay_number || b.bay
    }));

    // Calculate earnings and statistics from real data
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const previousMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    const selectedMonthStart = new Date(year, month - 1, 1);
    const selectedMonthEnd = new Date(year, month, 0);

    // Helper function to determine rate and calculate coach revenue
    const calculateRevenue = (lesson: any) => {
      return parseFloat(lesson.coach_earnings || '0');
    };

    // Calculate monthly statistics
    const currentMonthLessons = lessons.filter(l => {
      const lessonDate = new Date(l.date);
      return lessonDate >= currentMonthStart && lessonDate < new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    });

    const previousMonthLessons = lessons.filter(l => {
      const lessonDate = new Date(l.date);
      return lessonDate >= previousMonthStart && lessonDate <= previousMonthEnd;
    });

    const selectedMonthLessons = lessons.filter(l => {
      const lessonDate = new Date(l.date);
      return lessonDate >= selectedMonthStart && lessonDate <= selectedMonthEnd;
    });

    // Calculate earnings
    const currentMonthEarnings = currentMonthLessons.reduce((sum, lesson) => sum + calculateRevenue(lesson), 0);
    const previousMonthEarnings = previousMonthLessons.reduce((sum, lesson) => sum + calculateRevenue(lesson), 0);
    const totalEarnings = lessons.reduce((sum, lesson) => sum + calculateRevenue(lesson), 0);
    const selectedMonthEarnings = selectedMonthLessons.reduce((sum, lesson) => sum + calculateRevenue(lesson), 0);
    
    const averageSessionRate = lessons.length > 0 ? totalEarnings / lessons.length : 0;

    // Fetch all bookings for the selected period for this coach (both past and upcoming)
    const { data: selectedMonthBookings, error: selectedBookingsError } = await supabase
      .schema('public')
      .from('bookings')
      .select('*')
      .gte('date', selectedMonthStart.toISOString().split('T')[0])
      .lte('date', selectedMonthEnd.toISOString().split('T')[0])
      .eq('booking_type', getBookingTypeFilter(coachDisplayName));

    if (selectedBookingsError) {
      console.error('Error fetching selected month bookings:', selectedBookingsError);
    }

    // Determine completed sessions as bookings that are before today and confirmed
    const completedSelectedMonthBookings = (selectedMonthBookings || []).filter(b => {
      const bookingDate = new Date(b.date);
      return bookingDate < currentDate && b.status === 'confirmed';
    });

    // Use bookings count for session metrics
    const selectedMonthSessionCount = completedSelectedMonthBookings.length;

    // Calculate selected month average
    const selectedMonthAverage = selectedMonthSessionCount > 0 ? selectedMonthEarnings / selectedMonthSessionCount : 0;

    // Convert lessons to session format for display
    const recentLessons = selectedMonthLessons.slice(0, 20);

    const formatLessonAsSession = (lesson: any) => {
      const getPax = (rateType: string) => {
        if (!rateType) return 1;
        const match = rateType.match(/(\d+)\s*PAX/i);
        return match ? parseInt(match[1], 10) : 1;
      };

      return {
        id: lesson.receipt_number,
        customer_name: lesson.customer_name,
        session_date: lesson.date,
        start_time: 'N/A', // Not available in this view
        end_time: 'N/A', // Not available in this view
        lesson_type: lesson.rate_type,
        session_rate: String(lesson.rate),
        total_amount: String(lesson.coach_earnings),
        payment_status: 'paid', // Assumed from being in earnings
        session_status: 'completed',
        number_of_participants: getPax(lesson.rate_type),
        bay_number: 'N/A'
      };
    };

    // Convert bookings to session format for upcoming sessions
    const formatBookingAsSession = (booking: any) => {
      const bookingStart = new Date(`${booking.date}T${booking.start_time}`);
      let endTime = '??:??';
      if (bookingStart) {
        const endDate = new Date(bookingStart);
        endDate.setHours(bookingStart.getHours() + (booking.duration || 1));
        endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      }
      
      return {
        id: booking.id,
        customer_name: booking.name,
        session_date: booking.date,
        start_time: booking.start_time,
        end_time: endTime,
        lesson_type: 'Coaching Session',
        session_status: booking.status,
        bay_number: booking.bay_number,
        number_of_participants: booking.number_of_people || 1
      };
    };

    // Get recent sessions (last 10)
    const recentSessions = await Promise.all(recentLessons.map(formatLessonAsSession));

    // Get upcoming sessions from bookings
    let upcomingSessions = upcomingBookings ? upcomingBookings.map(formatBookingAsSession) : [];

    // Sort upcoming sessions by date and time (next lessons first)
    upcomingSessions.sort((a, b) => {
      // First sort by date
      const dateA = new Date(a.session_date);
      const dateB = new Date(b.session_date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // If same date, sort by time
      if (!a.start_time || a.start_time.includes('??') || !b.start_time || b.start_time.includes('??')) return 0;
      return a.start_time.localeCompare(b.start_time);
    });

    // If admin is viewing, also get list of all coaches for the selector
    let availableCoaches: Coach[] = [];
    if (isAdminView || currentUser.is_admin) {
      const { data: allCoachesRaw, error: coachesError } = await supabase
        .schema('backoffice')
        .from('allowed_users')
        .select('id, coach_name, coach_display_name, coach_phone, email')
        .eq('is_coach', true)
        .order('coach_display_name');

      if (coachesError) {
        console.error('Error fetching coaches for admin view:', coachesError);
      } else {
        // Remove duplicates by coach_display_name (keep first occurrence)
        const seenDisplayNames = new Set();
        const allCoaches = (allCoachesRaw || []).filter(coach => {
          if (seenDisplayNames.has(coach.coach_display_name)) {
            return false;
          }
          seenDisplayNames.add(coach.coach_display_name);
          return true;
        });

        availableCoaches = allCoaches as Coach[] || [];
      }
    }

    const responsePayload = {
      isAdminView,
      requiresCoachSelection: false,
      coach: {
        id: targetCoach.id,
        name: targetCoach.coach_name,
        display_name: targetCoach.coach_display_name,
        phone: targetCoach.coach_phone,
        code: targetCoach.coach_code,
      },
      earnings: {
        current_month_earnings: String(currentMonthEarnings),
        previous_month_earnings: String(previousMonthEarnings),
        total_earnings: String(totalEarnings),
        current_month_sessions: currentMonthLessons.length,
        total_sessions: lessons.length,
        average_session_rate: String(averageSessionRate),
      },
      monthly_earnings: {
        total_earnings: String(selectedMonthEarnings),
        session_count: selectedMonthLessons.length,
        average_rate: String(selectedMonthLessons.length > 0 ? selectedMonthEarnings / selectedMonthLessons.length : 0),
        paid_sessions: selectedMonthLessons.length,
        pending_sessions: 0
      },
      recent_sessions: recentSessions,
      upcoming_sessions: upcomingSessions,
      selected_period: { year, month },
      availableCoaches: availableCoaches,
      selectedCoachId: adminSelectedCoachId || targetCoach.id,
      recent_bookings: recentBookings,
      currentUser: {
        id: currentUser.id,
        email: currentUser.email,
        isAdmin: currentUser.is_admin,
        isCoach: currentUser.is_coach
      }
    };

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('Error in coaching dashboard API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 