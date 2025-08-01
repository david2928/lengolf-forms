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
    const { date, bay, duration, startHour, endHour } = await request.json();

    if (!date || !bay) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const { data, error } = await refacSupabaseAdmin.rpc('get_available_slots', {
      p_date: date,
      p_bay: bay,
      p_duration: duration || 1.0,
      p_start_hour: startHour || 10,
      p_end_hour: endHour || 22
    });

    if (error) {
      console.error('Database error getting available slots:', error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ slots: data || [] });
  } catch (error) {
    console.error('Error in get-slots API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}