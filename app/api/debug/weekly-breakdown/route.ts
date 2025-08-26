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
    const today = new Date();
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

    // Get this week's feedback data with lead submission times
    const { data: weekFeedback, error } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        id,
        created_at,
        call_date,
        processed_leads!inner(meta_submitted_at, full_name, phone_number)
      `)
      .gte('created_at', thisWeekStart.toISOString())
      .lte('created_at', today.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedback data:', error);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    // Helper function to convert UTC date to Bangkok timezone
    const toBangkokTime = (utcDate: Date): Date => {
      return new Date(utcDate.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
    };

    // Business hours calculation function (same as in stats API)
    const calculateBusinessHours = (startDateUTC: Date, endDateUTC: Date): number => {
      // Convert to Bangkok timezone first
      const startDate = toBangkokTime(startDateUTC);
      const endDate = toBangkokTime(endDateUTC);
      
      if (startDate >= endDate) return 0;
      
      let businessSeconds = 0;
      let current = new Date(startDate);
      
      while (current < endDate) {
        const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Skip Mondays entirely
        if (dayOfWeek === 1) {
          current.setDate(current.getDate() + 1);
          current.setHours(10, 0, 0, 0);
          continue;
        }
        
        // Set business hours for current day (Bangkok time)
        const dayStart = new Date(current);
        dayStart.setHours(10, 0, 0, 0);
        
        const dayEnd = new Date(current);
        dayEnd.setHours(21, 0, 0, 0);
        
        // Calculate intersection with our time range for this day
        const effectiveStart = new Date(Math.max(current.getTime(), dayStart.getTime()));
        const effectiveEnd = new Date(Math.min(endDate.getTime(), dayEnd.getTime()));
        
        // If there's overlap with business hours on this day
        if (effectiveStart < effectiveEnd) {
          const dayBusinessSeconds = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 1000);
          businessSeconds += dayBusinessSeconds;
        }
        
        // Move to next day at 10am
        current.setDate(current.getDate() + 1);
        current.setHours(10, 0, 0, 0);
      }
      
      return businessSeconds;
    };

    // Process each feedback record
    const detailedBreakdown = weekFeedback?.map(item => {
      const leadTime = new Date(item.processed_leads.meta_submitted_at);
      const feedbackTime = new Date(item.created_at);
      
      // Calculate raw difference
      const rawDiffMs = feedbackTime.getTime() - leadTime.getTime();
      const rawDiffHours = rawDiffMs / (1000 * 60 * 60);
      const rawDiffDays = rawDiffHours / 24;
      
      // Calculate business hours
      const businessSeconds = calculateBusinessHours(leadTime, feedbackTime);
      const businessHours = businessSeconds / 3600;
      
      // Check if it's an outlier (>30 days)
      const isOutlier = rawDiffDays > 30;
      
      // Convert to Bangkok timezone for display
      const leadTimeBangkok = toBangkokTime(leadTime);
      const feedbackTimeBangkok = toBangkokTime(feedbackTime);
      
      return {
        feedback_id: item.id,
        customer_name: item.processed_leads.full_name,
        lead_submitted_utc: item.processed_leads.meta_submitted_at,
        feedback_created_utc: item.created_at,
        lead_submitted_bangkok: leadTimeBangkok.toLocaleString('en-US', {timeZone: 'Asia/Bangkok'}),
        feedback_created_bangkok: feedbackTimeBangkok.toLocaleString('en-US', {timeZone: 'Asia/Bangkok'}),
        call_date: item.call_date,
        raw_diff_hours: Math.round(rawDiffHours * 10) / 10,
        raw_diff_days: Math.round(rawDiffDays * 10) / 10,
        business_hours: Math.round(businessHours * 10) / 10,
        business_seconds: businessSeconds,
        is_outlier: isOutlier,
        included_in_average: !isOutlier && businessSeconds > 0
      };
    }) || [];

    // Filter valid data (same logic as in stats API)
    const validData = detailedBreakdown.filter(item => item.included_in_average);
    
    // Calculate the average
    const totalBusinessSeconds = validData.reduce((sum, item) => sum + item.business_seconds, 0);
    const average = validData.length > 0 ? totalBusinessSeconds / validData.length : 0;
    const averageHours = average / 3600;

    // Format like the stats API does
    const formatSpeedToLead = (seconds: number): string => {
      if (!seconds || seconds <= 0) return '0m';
      const hours = seconds / 3600;
      if (hours < 1) {
        const minutes = Math.round(seconds / 60);
        return `${minutes}m`;
      } else if (hours < 24) {
        return `${hours.toFixed(1)}h`;
      } else {
        const days = Math.floor(hours / 24);
        const remainingHours = Math.round(hours % 24);
        return `${days}d ${remainingHours}h`;
      }
    };

    return NextResponse.json({
      success: true,
      week_range: {
        start: thisWeekStart.toISOString(),
        end: today.toISOString()
      },
      calculation_summary: {
        total_feedback_records: detailedBreakdown.length,
        outliers_excluded: detailedBreakdown.filter(item => item.is_outlier).length,
        valid_records_used: validData.length,
        total_business_seconds: totalBusinessSeconds,
        average_business_seconds: Math.round(average),
        average_business_hours: Math.round(averageHours * 10) / 10,
        formatted_result: formatSpeedToLead(average)
      },
      detailed_breakdown: detailedBreakdown,
      valid_records_only: validData
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