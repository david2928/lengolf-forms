import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get sample bookings to see the structure
    const { data: bookingsSample, error } = await refacSupabaseAdmin
      .from('bookings')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Error fetching bookings:', error);
    }

    // Also check for recent bookings with any phone-like fields
    const { data: recentBookings } = await refacSupabaseAdmin
      .from('bookings')
      .select('id, created_at, customer_name, customer_phone_number, primary_phone, contact_number')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      bookings_sample: bookingsSample,
      recent_bookings: recentBookings,
      analysis: {
        phone_fields_found: Object.keys(bookingsSample?.[0] || {}).filter(key => 
          key.toLowerCase().includes('phone') || 
          key.toLowerCase().includes('contact') ||
          key.toLowerCase().includes('number')
        ),
        total_bookings_checked: bookingsSample?.length || 0
      }
    });

  } catch (error: any) {
    console.error('Bookings structure debug error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}