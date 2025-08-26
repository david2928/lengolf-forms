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
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1); // Start of month

    // Helper function to convert UTC date to Bangkok timezone
    const toBangkokTime = (utcDate: Date): Date => {
      return new Date(utcDate.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
    };

    // Helper function to calculate business hours between two dates in Bangkok timezone
    const calculateBusinessHours = (startDateUTC: Date, endDateUTC: Date): number => {
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

    // Format speed to lead helper
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

    // ===========================================
    // KPI BOX 1: TODAY SPEED (Customer Response)
    // ===========================================
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const { data: todayFeedback } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        id,
        created_at,
        processed_leads!inner(meta_submitted_at, full_name, phone_number)
      `)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    const todayValidData = (todayFeedback || []).filter(item => {
      if (!item.processed_leads?.meta_submitted_at || !item.created_at) return false;
      const leadTime = new Date(item.processed_leads.meta_submitted_at);
      const feedbackTime = new Date(item.created_at);
      const daysDiff = (feedbackTime.getTime() - leadTime.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30; // Exclude outliers >30 days
    });

    const todayBusinessHours = todayValidData.reduce((sum, item) => {
      const leadTime = new Date(item.processed_leads.meta_submitted_at);
      const feedbackTime = new Date(item.created_at);
      return sum + calculateBusinessHours(leadTime, feedbackTime);
    }, 0);

    const todayAverage = todayValidData.length > 0 ? todayBusinessHours / todayValidData.length : 0;

    // ===========================================
    // KPI BOX 2: WEEK AVERAGE (Customer Response)
    // ===========================================
    const { data: weekFeedback } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        id,
        created_at,
        processed_leads!inner(meta_submitted_at, full_name, phone_number)
      `)
      .gte('created_at', thisWeekStart.toISOString())
      .lte('created_at', today.toISOString());

    const weekValidData = (weekFeedback || []).filter(item => {
      if (!item.processed_leads?.meta_submitted_at || !item.created_at) return false;
      const leadTime = new Date(item.processed_leads.meta_submitted_at);
      const feedbackTime = new Date(item.created_at);
      const daysDiff = (feedbackTime.getTime() - leadTime.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30; // Exclude outliers >30 days
    });

    const weekBusinessHours = weekValidData.reduce((sum, item) => {
      const leadTime = new Date(item.processed_leads.meta_submitted_at);
      const feedbackTime = new Date(item.created_at);
      return sum + calculateBusinessHours(leadTime, feedbackTime);
    }, 0);

    const weekAverage = weekValidData.length > 0 ? weekBusinessHours / weekValidData.length : 0;

    // ===========================================
    // KPI BOX 3: OB CALLS (When on OB tab) / LEAD SALES (When on Leads tab)
    // ===========================================
    
    // OB Calls: Count of calls made from OB list this week
    const { data: obCallsData } = await refacSupabaseAdmin
      .schema('marketing')
      .from('ob_sales_notes')
      .select('id', { count: 'exact' })
      .gte('created_at', thisWeekStart.toISOString())
      .lte('created_at', today.toISOString());

    // Lead Sales: Bookings that came from leads (matching phone numbers after feedback) - ALL TIME
    const { data: leadConversions } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        created_at,
        processed_leads!inner(phone_number, meta_submitted_at)
      `);

    let leadSalesCount = 0;
    if (leadConversions && leadConversions.length > 0) {
      const phoneNumbers = leadConversions
        .map((item: any) => item.processed_leads?.phone_number)
        .filter((phone: any) => phone);

      if (phoneNumbers.length > 0) {
        const { data: bookingsData } = await refacSupabaseAdmin
          .from('bookings')
          .select('customer_phone_number, created_at')
          .in('customer_phone_number', phoneNumbers)
          .gte('created_at', thisWeekStart.toISOString())
          .lte('created_at', today.toISOString());

        if (bookingsData) {
          leadSalesCount = leadConversions.reduce((count: number, leadFeedback: any) => {
            const leadPhone = leadFeedback.processed_leads?.phone_number;
            const feedbackDate = new Date(leadFeedback.created_at);
            
            const hasBooking = bookingsData.some((booking: any) => 
              booking.customer_phone_number === leadPhone &&
              new Date(booking.created_at) >= feedbackDate
            );
            
            return count + (hasBooking ? 1 : 0);
          }, 0);
        }
      }
    }

    // ===========================================
    // KPI BOX 4: SALES (Context-aware)
    // ===========================================
    
    // OB Sales: Successful OB calls that resulted in bookings
    const { data: obSalesData } = await refacSupabaseAdmin
      .schema('marketing')
      .from('ob_sales_notes')
      .select('id', { count: 'exact' })
      .eq('booking_submitted', true)
      .gte('created_at', thisWeekStart.toISOString())
      .lte('created_at', today.toISOString());

    return NextResponse.json({
      success: true,
      time_ranges: {
        today: { start: todayStart.toISOString(), end: todayEnd.toISOString() },
        week: { start: thisWeekStart.toISOString(), end: today.toISOString() }
      },
      kpi_breakdown: {
        box_1_today_speed: {
          title: "Today Speed / Speed",
          description: "Average business hours between customer contact (lead/callback) and feedback completion TODAY",
          calculation: "Business hours only (10am-9pm Bangkok, exclude Mondays)",
          data_source: "lead_feedback table with processed_leads join",
          outlier_filter: "Excludes customers contacted >30 days ago",
          records_today: todayValidData.length,
          total_business_seconds: todayBusinessHours,
          average_seconds: Math.round(todayAverage),
          formatted_result: formatSpeedToLead(todayAverage)
        },
        box_2_week_average: {
          title: "Week Avg",
          description: "Average business hours between customer contact and feedback completion THIS WEEK",
          calculation: "Same as Box 1 but for full week",
          data_source: "lead_feedback table with processed_leads join",
          outlier_filter: "Excludes customers contacted >30 days ago",
          records_week: weekValidData.length,
          total_business_seconds: weekBusinessHours,
          average_seconds: Math.round(weekAverage),
          formatted_result: formatSpeedToLead(weekAverage)
        },
        box_3_context_aware: {
          new_leads_tab: {
            title: "Lead Sales",
            description: "Number of bookings made by customers who previously had feedback submitted",
            calculation: "Match phone numbers: feedback -> subsequent booking",
            data_source: "lead_feedback + bookings tables",
            time_filter: "Both feedback and booking must be this week",
            result: leadSalesCount
          },
          ob_sales_tab: {
            title: "OB Calls", 
            description: "Total number of outbound calls made to existing customers",
            calculation: "Count of records in ob_sales_notes",
            data_source: "marketing.ob_sales_notes table",
            time_filter: "Created this week",
            result: obCallsData?.length || 0
          }
        },
        box_4_sales: {
          new_leads_tab: {
            title: "Sales",
            description: "Same as Box 3 - Lead Sales (shows conversion from feedback to booking)",
            result: leadSalesCount
          },
          ob_sales_tab: {
            title: "Sales",
            description: "OB calls that resulted in successful bookings",
            calculation: "Count where booking_submitted = true",
            data_source: "marketing.ob_sales_notes table",
            time_filter: "Created this week", 
            result: obSalesData?.length || 0
          }
        }
      },
      current_stats: {
        speedToLead: formatSpeedToLead(todayAverage),
        weekAverage: formatSpeedToLead(weekAverage),
        obCalls: obCallsData?.length || 0,
        obSales: obSalesData?.length || 0,
        leadSales: leadSalesCount
      }
    });

  } catch (error: any) {
    console.error('KPI Logic Debug Error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message
      },
      { status: 500 }
    );
  }
}