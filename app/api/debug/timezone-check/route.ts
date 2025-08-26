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
    // Get Pavin's record to check timezone handling
    const { data: feedbackData, error } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        id,
        created_at,
        call_date,
        processed_leads!inner(meta_submitted_at, full_name, phone_number)
      `)
      .eq('processed_leads.full_name', 'Pavin Boonsermvongkij')
      .single();

    if (error) {
      console.error('Error fetching feedback data:', error);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    const leadSubmitted = new Date(feedbackData.processed_leads.meta_submitted_at);
    const feedbackCreated = new Date(feedbackData.created_at);

    // Convert to Bangkok timezone (+07:00)
    const bangkokOffset = 7 * 60; // 7 hours in minutes
    const leadSubmittedBangkok = new Date(leadSubmitted.getTime() + (bangkokOffset * 60 * 1000));
    const feedbackCreatedBangkok = new Date(feedbackCreated.getTime() + (bangkokOffset * 60 * 1000));

    // Alternative: Use Intl.DateTimeFormat for proper timezone conversion
    const bangkokFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const leadBangkokFormatted = bangkokFormatter.format(leadSubmitted);
    const feedbackBangkokFormatted = bangkokFormatter.format(feedbackCreated);

    // Manual timezone conversion (more reliable)
    const toLocalTime = (utcDate: Date) => {
      const localTime = new Date(utcDate.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
      return localTime;
    };

    const leadLocalTime = toLocalTime(leadSubmitted);
    const feedbackLocalTime = toLocalTime(feedbackCreated);

    return NextResponse.json({
      success: true,
      customer: feedbackData.processed_leads.full_name,
      raw_data: {
        lead_submitted_utc: feedbackData.processed_leads.meta_submitted_at,
        feedback_created_utc: feedbackData.created_at
      },
      utc_dates: {
        lead_submitted: leadSubmitted.toISOString(),
        feedback_created: feedbackCreated.toISOString(),
        raw_diff_hours: Math.round(((feedbackCreated.getTime() - leadSubmitted.getTime()) / (1000 * 60 * 60)) * 10) / 10
      },
      bangkok_timezone_converted: {
        lead_submitted_formatted: leadBangkokFormatted,
        feedback_created_formatted: feedbackBangkokFormatted,
        lead_submitted_local: leadLocalTime.toISOString(),
        feedback_created_local: feedbackLocalTime.toISOString()
      },
      expected_vs_actual: {
        expected_lead_time: "Aug 24, 2025 12:18am Bangkok time",
        expected_feedback_time: "Aug 24, 2025 13:16:21 Bangkok time", 
        actual_calculation_should_use: "Bangkok timezone for business hours"
      }
    });

  } catch (error: any) {
    console.error('Debug API Error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}