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

    // Get all active coaches
    const { data: coaches, error: coachesError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, coach_name, coach_display_name, coach_code')
      .eq('is_coach', true)
      .eq('is_active_coach', true);

    if (coachesError) {
      return NextResponse.json({ error: 'Failed to fetch coaches' }, { status: 500 });
    }

    // Calculate performance metrics for each coach
    const performanceMetrics = await Promise.all(
      (coaches || []).map(async (coach) => {
        const coachDisplayName = coach.coach_display_name || coach.coach_name;
        const today = new Date();
        const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

        // Get current month bookings (all statuses)
        const { data: currentBookings } = await supabase
          .from('bookings')
          .select('*')
          .gte('date', currentMonth.toISOString().split('T')[0])
          .ilike('booking_type', `%${coachDisplayName}%`);

        // Get previous month bookings (all statuses)
        const { data: previousBookings } = await supabase
          .from('bookings')
          .select('*')
          .gte('date', previousMonth.toISOString().split('T')[0])
          .lte('date', previousMonthEnd.toISOString().split('T')[0])
          .ilike('booking_type', `%${coachDisplayName}%`);

        // Get today's bookings for utilization
        const todayStr = today.toISOString().split('T')[0];
        const { data: todayBookings } = await supabase
          .from('bookings')
          .select('duration')
          .eq('date', todayStr)
          .ilike('booking_type', `%${coachDisplayName}%`)
          .eq('status', 'confirmed');

        // Calculate current utilization (today)
        const todayBookedHours = todayBookings?.reduce((sum, booking) => sum + (booking.duration || 1), 0) || 0;
        const maxDailyHours = 8; // Assume 8-hour workday
        const currentUtilization = (todayBookedHours / maxDailyHours) * 100;

        // Calculate cancellation rate
        const totalCurrentBookings = currentBookings?.length || 0;
        const cancelledBookings = currentBookings?.filter(b => b.status === 'cancelled').length || 0;
        const completedBookings = currentBookings?.filter(b => b.status === 'confirmed' && new Date(b.date) < today).length || 0;
        const cancellationRate = totalCurrentBookings > 0 
          ? (cancelledBookings / totalCurrentBookings) * 100 
          : 0;

        // Calculate remaining available hours this month based on actual bookings
        const remainingDaysThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
        
        // Get total coaching hours booked this month for this coach
        const totalBookedHoursThisMonth = currentBookings?.reduce((sum, booking) => {
          return sum + (booking.duration || 1);
        }, 0) || 0;
        
        // Calculate remaining hours based on typical coach capacity
        // Assume coaches can work 6 hours/day, 5 days/week = 30 hours/week
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const weeksInMonth = daysInMonth / 7;
        const maxHoursPerMonth = Math.floor(weeksInMonth * 30); // 30 hours per week
        
        let availableHoursRemaining = Math.max(0, maxHoursPerMonth - totalBookedHoursThisMonth);
        
        // Adjust for remaining days (don't count past days)
        const progressThroughMonth = (today.getDate() - 1) / daysInMonth;
        const expectedHoursByNow = maxHoursPerMonth * progressThroughMonth;
        
        if (totalBookedHoursThisMonth < expectedHoursByNow) {
          // Behind schedule, show realistic remaining capacity
          availableHoursRemaining = Math.min(availableHoursRemaining, remainingDaysThisMonth * 6);
        }

        // Calculate total scheduled hours this month
        const totalScheduledHours = totalBookedHoursThisMonth;

        // Calculate booking trends (confirmed bookings only)
        const currentConfirmedCount = currentBookings?.filter(b => b.status === 'confirmed').length || 0;
        const previousConfirmedCount = previousBookings?.filter(b => b.status === 'confirmed').length || 0;
        
        const bookingChangePercent = previousConfirmedCount > 0 
          ? ((currentConfirmedCount - previousConfirmedCount) / previousConfirmedCount) * 100 
          : 0;

        const bookingTrend = bookingChangePercent > 10 ? 'up' : 
                            bookingChangePercent < -10 ? 'down' : 'stable';

        // Remove student retention calculation - not needed for staff view

        // Determine health status and alerts
        const alerts: string[] = [];
        let healthStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'good';

        if (currentUtilization < 30) {
          alerts.push('Low utilization today');
          healthStatus = 'warning';
        }

        if (cancellationRate > 20) {
          alerts.push('High cancellation rate');
          healthStatus = 'critical';
        } else if (cancellationRate > 15) {
          alerts.push('Elevated cancellation rate');
          healthStatus = 'warning';
        }

        if (availableHoursRemaining < 5) {
          alerts.push('Very few available hours remaining');
          if (healthStatus !== 'critical') healthStatus = 'warning';
        }

        if (currentConfirmedCount === 0) {
          alerts.push('No confirmed bookings this month');
          healthStatus = 'critical';
        }

        if (alerts.length === 0 && currentUtilization > 70 && cancellationRate < 10) {
          healthStatus = 'excellent';
        }

        return {
          coach_id: coach.id,
          coach_name: coachDisplayName,
          current_utilization: currentUtilization,
          booking_trend: bookingTrend,
          booking_change_percent: bookingChangePercent,
          cancellation_rate: cancellationRate,
          available_hours_remaining: availableHoursRemaining,
          completed_lessons_this_month: completedBookings,
          total_scheduled_hours: totalScheduledHours,
          last_updated: new Date().toISOString(),
          health_status: healthStatus,
          alerts
        };
      })
    );

    return NextResponse.json({
      metrics: performanceMetrics,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in coaching performance API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}