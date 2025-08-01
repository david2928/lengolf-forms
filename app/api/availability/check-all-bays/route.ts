import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { date, startTime, duration, excludeBookingId } = await request.json();

    if (!date || !startTime || !duration) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const { data, error } = await refacSupabaseAdmin.rpc('check_all_bays_availability', {
      p_date: date,
      p_start_time: startTime,
      p_duration: duration,
      p_exclude_booking_id: excludeBookingId || null
    });

    if (error) {
      console.error('Database error checking all bays availability:', error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ availability: data || {} });
  } catch (error) {
    console.error('Error in check-all-bays API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}