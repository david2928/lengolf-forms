import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

const ALL_BAYS = ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4'];

export async function POST(request: NextRequest) {
  try {
    const { dates, start_time, duration } = await request.json();

    if (!dates || !Array.isArray(dates) || dates.length === 0 || !start_time || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields: dates (array), start_time, duration' },
        { status: 400 }
      );
    }

    if (dates.length > 31) {
      return NextResponse.json(
        { error: 'Maximum 31 dates allowed per batch check' },
        { status: 400 }
      );
    }

    // duration comes in minutes, RPC expects hours
    const durationHours = duration / 60;

    const results: Record<string, { available: boolean; availableBays: string[] }> = {};

    // Check each date in parallel
    await Promise.all(
      dates.map(async (date: string) => {
        const availableBays: string[] = [];

        // Check all bays for this date in parallel
        const bayChecks = await Promise.all(
          ALL_BAYS.map(async (bay) => {
            try {
              const { data, error } = await refacSupabaseAdmin.rpc('check_availability', {
                p_date: date,
                p_bay: bay,
                p_start_time: start_time,
                p_duration: durationHours,
                p_exclude_booking_id: null,
              });

              if (!error && data === true) {
                return bay;
              }
              return null;
            } catch {
              return null;
            }
          })
        );

        bayChecks.forEach((bay) => {
          if (bay) availableBays.push(bay);
        });

        results[date] = {
          available: availableBays.length > 0,
          availableBays,
        };
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Batch availability check error:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
