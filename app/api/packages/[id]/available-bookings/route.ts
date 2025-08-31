import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

interface AvailableBooking {
  id: string;
  date: string;
  start_time: string;
  duration: number;
  bay: string | null;
  number_of_people: number;
  customer_notes: string | null;
  booking_type: string | null;
  status: string;
  customer_name: string;
  phone_number: string;
  already_linked: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const packageId = id;
    const { searchParams } = new URL(request.url);
    const includeUsed = searchParams.get('include_used') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    // First, get the package details to find the customer
    const { data: packageData, error: packageError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('packages')
      .select('customer_id, customer_name')
      .eq('id', packageId)
      .single();

    if (packageError || !packageData) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      );
    }

    // Get bookings that were made with this specific package
    let bookingsQuery = refacSupabaseAdmin
      .from('bookings')
      .select(`
        id,
        date,
        start_time,
        duration,
        bay,
        number_of_people,
        customer_notes,
        booking_type,
        status,
        name,
        phone_number,
        package_id
      `)
      .eq('package_id', packageId)
      .eq('status', 'confirmed')
      .order('date', { ascending: false })
      .order('start_time', { ascending: true })
      .limit(limit);

    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    // Get already linked booking IDs if we need to filter them out
    let linkedBookingIds: string[] = [];
    if (!includeUsed) {
      const { data: usageData } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('package_usage')
        .select('booking_id')
        .not('booking_id', 'is', null);

      linkedBookingIds = (usageData || [])
        .map((u: any) => u.booking_id)
        .filter(Boolean) as string[];
    }

    // Format and filter bookings
    const availableBookings: AvailableBooking[] = (bookings || [])
    .map((booking: any) => ({
      id: booking.id,
      date: booking.date,
      start_time: booking.start_time,
      duration: booking.duration,
      bay: booking.bay,
      number_of_people: booking.number_of_people,
      customer_notes: booking.customer_notes,
      booking_type: booking.booking_type,
      status: booking.status,
      customer_name: booking.name,
      phone_number: booking.phone_number,
      already_linked: linkedBookingIds.includes(booking.id),
    }))
    .filter((booking: any) => includeUsed || !booking.already_linked)
    .sort((a: any, b: any) => {
      // Sort by date and time descending (most recent first, closest to today at top)
      const dateTimeA = new Date(a.date + 'T' + a.start_time);
      const dateTimeB = new Date(b.date + 'T' + b.start_time);
      return dateTimeB.getTime() - dateTimeA.getTime();
    });

    return NextResponse.json({
      bookings: availableBookings,
      total: availableBookings.length,
      customer_name: packageData.customer_name,
      package_id: packageId
    });

  } catch (error: any) {
    console.error('Error in GET /api/packages/[packageId]/available-bookings:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}