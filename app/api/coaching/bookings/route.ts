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
    const status = searchParams.get('status') || 'all';
    const period = searchParams.get('period'); // 'today', 'week', 'month', 'year'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Calculate date range based on period
    let calculatedStartDate = startDate;
    let calculatedEndDate = endDate;
    
    if (period) {
      const now = new Date();
      // Use local date string to avoid timezone issues
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
      .select('id, email, is_admin, is_coach, coach_name, coach_display_name')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    // Build query - note: We'll fetch package info separately to avoid complex joins
    let query = supabase
      .from('bookings')
      .select('id, customer_name:name, contact_number:phone_number, booking_date:date, start_time, duration, number_of_pax:number_of_people, bay_number:bay, notes:customer_notes, status, booking_type, customer_id')
      .ilike('booking_type', 'Coaching%');

    // Create precise booking type filter to prevent data mixing between coaches
    const getBookingTypeFilter = (coachDisplayName: string) => {
      switch (coachDisplayName) {
        case 'Boss':
          return 'Coaching (Boss)'; // Exact match to exclude "Coaching (Boss - Ratchavin)"
        case 'Ratchavin':
          return 'Coaching (Boss - Ratchavin)'; // Exact match for Ratchavin's bookings
        case 'Noon':
          return 'Coaching (Noon)'; // Exact match for Noon's bookings
        default:
          return `Coaching (${coachDisplayName})`; // Fallback for other coaches
      }
    };

    // If user is a coach (not admin), only show their bookings
    if (currentUser.is_coach && !currentUser.is_admin) {
      const coachName = currentUser.coach_display_name || currentUser.coach_name;
      if (coachName) {
        const exactBookingType = getBookingTypeFilter(coachName);
        query = query.eq('booking_type', exactBookingType);
      }
    } else if (currentUser.is_admin && coachId) {
      // Admin viewing specific coach's bookings
      const { data: selectedCoach } = await supabase
        .schema('backoffice')
        .from('allowed_users')
        .select('coach_name, coach_display_name')
        .eq('id', coachId)
        .single();
      
      if (selectedCoach) {
        const coachName = selectedCoach.coach_display_name || selectedCoach.coach_name;
        const exactBookingType = getBookingTypeFilter(coachName);
        query = query.eq('booking_type', exactBookingType);
      }
    }

    // Apply date filters - only apply custom date filters when both start and end are provided
    if (calculatedStartDate && (period || (startDate && endDate))) {
      query = query.gte('date', calculatedStartDate);
    }
    if (calculatedEndDate && (period || (startDate && endDate))) {
      // Use lte to include records on the end date
      query = query.lte('date', calculatedEndDate);
    }

    // Apply status filter (if needed in future)
    // Status filtering could be added based on booking status field

    // Apply pagination and ordering
    query = query
      .order('date', { ascending: false })
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }
    
    // Fetch package names for all bookings using a simplified query with explicit joins
    const bookingIds = data?.map(b => b.id) || [];

    // Use a raw SQL query through RPC or direct table query with proper joins
    const { data: packageData, error: pkgError } = await supabase
      .schema('backoffice')
      .from('package_usage')
      .select(`
        booking_id,
        packages!inner(
          package_types!inner(
            name
          )
        )
      `)
      .in('booking_id', bookingIds);

    if (pkgError) {
      console.error('Error fetching package data:', pkgError);
    }

    // Create a map of booking_id to package_name
    const packageMap = new Map<string, string | null>();
    packageData?.forEach((pu: any) => {
      // Supabase nested query: packages is an object, package_types is an object inside it
      const packageName = pu.packages?.package_types?.name || null;
      if (packageName) {
        packageMap.set(pu.booking_id, packageName);
      }
    });

    const bookingsWithEndTime = data?.map(b => {
        if (!b.start_time) {
            return {
                ...b,
                end_time: '',
                package_name: packageMap.get(b.id) || null
            }
        }
        const [hours, minutes] = b.start_time.split(':').map(Number);
        const endHours = hours + b.duration;
        const endMinutes = minutes;
        const end_time = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

        return {
            ...b,
            end_time,
            package_name: packageMap.get(b.id) || null
        }
    })

    // Get total count for pagination
    let countQuery = supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .ilike('booking_type', 'Coaching%');

    if (currentUser.is_coach && !currentUser.is_admin) {
      const coachName = currentUser.coach_display_name || currentUser.coach_name;
      if(coachName) {
        const exactBookingType = getBookingTypeFilter(coachName);
        countQuery = countQuery.eq('booking_type', exactBookingType);
      }
    } else if (currentUser.is_admin && coachId) {
      const { data: selectedCoach } = await supabase
        .schema('backoffice')
        .from('allowed_users')
        .select('coach_name, coach_display_name')
        .eq('id', coachId)
        .single();
      
      if (selectedCoach) {
        const coachName = selectedCoach.coach_display_name || selectedCoach.coach_name;
        const exactBookingType = getBookingTypeFilter(coachName);
        countQuery = countQuery.eq('booking_type', exactBookingType);
      }
    }

    if (calculatedStartDate && (period || (startDate && endDate))) {
      countQuery = countQuery.gte('date', calculatedStartDate);
    }
    if (calculatedEndDate && (period || (startDate && endDate))) {
      // Use lte to include records on the end date
      countQuery = countQuery.lte('date', calculatedEndDate);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      bookings: bookingsWithEndTime || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit
    });

  } catch (error) {
    console.error('Error in bookings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 