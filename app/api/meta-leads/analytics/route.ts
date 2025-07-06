import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '../../../../src/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = refacSupabaseAdmin;
    
    // Get period parameter from query
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date | null = null;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'last7':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'last_quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart - 3, 1);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        startDate = null;
        break;
    }
    
    // Focus on recent forms only
    const recentForms = ['B2C (New)', 'B2B (New)'];
    
    // Build query with optional date filter
    let query = supabase
      .from('processed_leads')
      .select('*')
      .in('form_type', recentForms);
    
    if (startDate) {
      query = query.gte('meta_submitted_at', startDate.toISOString());
    }
    
    const { data: allLeads, error: allLeadsError } = await query;

    if (allLeadsError) {
      throw allLeadsError;
    }

    // Overall statistics for recent forms
    const totalLeads = allLeads?.length || 0;
    const spamLeads = allLeads?.filter((lead: any) => lead.is_likely_spam)?.length || 0;
    const legitimateLeads = totalLeads - spamLeads;
    const spamPercentage = totalLeads > 0 ? parseFloat((spamLeads / totalLeads * 100).toFixed(2)) : 0;
    
    // Calculate average spam score
    const totalSpamScore = allLeads?.reduce((sum: number, lead: any) => sum + (lead.spam_score || 0), 0) || 0;
    const avgSpamScore = totalLeads > 0 ? parseFloat((totalSpamScore / totalLeads).toFixed(2)) : 0;
    
    // Get date range
    const sortedDates = allLeads?.map((lead: any) => new Date(lead.meta_submitted_at)) || [];
    sortedDates.sort((a, b) => a.getTime() - b.getTime());
    const earliestLead = sortedDates[0]?.toISOString();
    const latestLead = sortedDates[sortedDates.length - 1]?.toISOString();

    // Breakdown by lead type for recent forms only
    const breakdown: Record<string, any> = {};
    allLeads?.forEach((lead: any) => {
      const key = `${lead.lead_type}-${lead.form_type}`;
      if (!breakdown[key]) {
        breakdown[key] = {
          lead_type: lead.lead_type,
          form_type: lead.form_type,
          total: 0,
          spam: 0,
          legitimate: 0,
          spam_percentage: 0,
          avg_spam_score: 0
        };
      }
      
      breakdown[key].total++;
      if (lead.is_likely_spam) {
        breakdown[key].spam++;
      } else {
        breakdown[key].legitimate++;
      }
    });

    // Calculate percentages for breakdown
    Object.values(breakdown).forEach((item: any) => {
      item.spam_percentage = item.total > 0 ? parseFloat((item.spam / item.total * 100).toFixed(2)) : 0;
      const relevantLeads = allLeads?.filter((lead: any) => 
        lead.lead_type === item.lead_type && lead.form_type === item.form_type
      ) || [];
      const totalScore = relevantLeads.reduce((sum: number, lead: any) => sum + (lead.spam_score || 0), 0);
      item.avg_spam_score = relevantLeads.length > 0 
        ? parseFloat((totalScore / relevantLeads.length).toFixed(2))
        : 0;
    });

    // Get legitimate leads with better filtering (exclude suspicious patterns even if marked as legitimate)
    const { data: legitimateLeadsData, error: legitimateError } = await supabase
      .from('processed_leads')
      .select('id, lead_type, form_type, full_name, email, phone_number, company_name, group_size, expected_attendees, event_planning_timeline, budget_per_person, interested_activities, additional_inquiries, meta_submitted_at')
      .in('form_type', recentForms)
      .eq('is_likely_spam', false)
      // Additional filtering to exclude suspicious patterns
      .not('email', 'like', '%tosomavertey%')
      .not('email', 'like', '%putheaggc%')
      .not('email', 'like', '%rothacr11%')
      .not('full_name', 'like', '%sdeg%')
      .not('full_name', 'like', '%GGG%')
      .order('meta_submitted_at', { ascending: false })
      .limit(50);

    if (legitimateError) {
      console.error('Error fetching legitimate leads:', legitimateError);
    }

    // Weekly trend data for charts
    const getWeekStart = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as week start
      return new Date(d.setDate(diff)).toISOString().split('T')[0];
    };

    const weeklyData: Record<string, any> = {};
    allLeads?.forEach((lead: any) => {
      const weekStart = getWeekStart(new Date(lead.meta_submitted_at));
      if (!weeklyData[weekStart]) {
        weeklyData[weekStart] = {
          week: weekStart,
          total: 0,
          spam: 0,
          legitimate: 0,
          b2b_total: 0,
          b2b_legitimate: 0,
          b2c_total: 0,
          b2c_legitimate: 0,
          spam_percentage: 0
        };
      }
      
      weeklyData[weekStart].total++;
      if (lead.is_likely_spam) {
        weeklyData[weekStart].spam++;
      } else {
        weeklyData[weekStart].legitimate++;
        if (lead.lead_type?.toLowerCase() === 'b2b') {
          weeklyData[weekStart].b2b_legitimate++;
        } else if (lead.lead_type?.toLowerCase() === 'b2c') {
          weeklyData[weekStart].b2c_legitimate++;
        }
      }
      
      if (lead.lead_type?.toLowerCase() === 'b2b') {
        weeklyData[weekStart].b2b_total++;
      } else if (lead.lead_type?.toLowerCase() === 'b2c') {
        weeklyData[weekStart].b2c_total++;
      }
    });

    // Calculate spam percentages for weekly data
    Object.values(weeklyData).forEach((week: any) => {
      week.spam_percentage = week.total > 0 ? parseFloat((week.spam / week.total * 100).toFixed(2)) : 0;
    });

    const trendData = Object.values(weeklyData).sort((a: any, b: any) => 
      new Date(a.week).getTime() - new Date(b.week).getTime()
    );

    // Lead responses analysis (only truly legitimate ones)
    const leadResponses = {
      b2c: {
        group_sizes: {} as Record<string, number>,
        total_legitimate: 0
      },
      b2b: {
        expected_attendees: {} as Record<string, number>,
        budget_ranges: {} as Record<string, number>,
        total_legitimate: 0
      }
    };

    legitimateLeadsData?.forEach((lead: any) => {
      if (lead.lead_type === 'b2c') {
        leadResponses.b2c.total_legitimate++;
        if (lead.group_size) {
          leadResponses.b2c.group_sizes[lead.group_size] = (leadResponses.b2c.group_sizes[lead.group_size] || 0) + 1;
        }
      } else if (lead.lead_type === 'b2b') {
        leadResponses.b2b.total_legitimate++;
        if (lead.expected_attendees) {
          leadResponses.b2b.expected_attendees[lead.expected_attendees] = (leadResponses.b2b.expected_attendees[lead.expected_attendees] || 0) + 1;
        }
        if (lead.budget_per_person) {
          leadResponses.b2b.budget_ranges[lead.budget_per_person] = (leadResponses.b2b.budget_ranges[lead.budget_per_person] || 0) + 1;
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_leads: totalLeads,
          spam_leads: spamLeads,
          legitimate_leads: legitimateLeads,
          spam_percentage: spamPercentage,
          avg_spam_score: avgSpamScore,
          earliest_lead: earliestLead,
          latest_lead: latestLead,
          focus: "Recent Forms Only (B2C New, B2B New)",
          period: period,
          period_label: getPeriodLabel(period)
        },
        breakdown: Object.values(breakdown).sort((a: any, b: any) => b.total - a.total),
        weeklyTrends: trendData,
        legitimateLeads: legitimateLeadsData || [],
        leadResponses: leadResponses
      }
    });

  } catch (error) {
    console.error('Meta Leads Analytics API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch meta leads analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getPeriodLabel(period: string): string {
  switch (period) {
    case 'today': return 'Today';
    case 'last7': return 'Last 7 Days';
    case 'last30': return 'Last 30 Days';
    case 'last_month': return 'Last Month';
    case 'last_quarter': return 'Last Quarter';
    case 'this_year': return 'This Year';
    case 'all': return 'All Time';
    default: return 'All Time';
  }
} 