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
    const { date, bay, startTime, duration, excludeBookingId } = await request.json();

    if (!date || !bay || !startTime || !duration) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const { data, error } = await refacSupabaseAdmin.rpc('check_availability', {
      p_date: date,
      p_bay: bay,
      p_start_time: startTime,
      p_duration: duration,
      p_exclude_booking_id: excludeBookingId || null
    });

    if (error) {
      console.error('Database error checking availability:', error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ available: data || false });
  } catch (error) {
    console.error('Error in check-slot API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}