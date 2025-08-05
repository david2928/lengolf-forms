import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';

    const supabase = refacSupabaseAdmin;

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
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
      default:
        startDate = null;
        break;
    }

    // Build query
    let query = supabase
      .from('lead_feedback')
      .select(`
        *,
        lead:processed_leads!inner(
          full_name,
          phone_number,
          email,
          group_size,
          meta_submitted_at
        )
      `);

    if (startDate) {
      query = query.gte('call_date', startDate.toISOString().split('T')[0]);
    }

    const { data: feedbackData, error } = await query;

    if (error) {
      console.error('Error fetching feedback stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback statistics' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      total_calls: feedbackData?.length || 0,
      reachable: feedbackData?.filter(f => f.was_reachable).length || 0,
      unreachable: feedbackData?.filter(f => !f.was_reachable).length || 0,
      response_breakdown: {
        very_interested: 0,
        interested_need_time: 0,
        not_interested: 0,
        no_clear_answer: 0
      },
      visit_timeline: {
        within_1_week: 0,
        within_month: 0,
        no_plan: 0
      },
      follow_ups_required: feedbackData?.filter(f => f.requires_followup).length || 0,
      bookings_submitted: feedbackData?.filter(f => f.booking_submitted).length || 0,
      reachability_rate: 0,
      conversion_rate: 0
    };

    // Count response types and visit timelines
    feedbackData?.forEach(feedback => {
      if (feedback.response_type) {
        stats.response_breakdown[feedback.response_type]++;
      }
      if (feedback.visit_timeline) {
        stats.visit_timeline[feedback.visit_timeline]++;
      }
    });

    // Calculate rates
    if (stats.total_calls > 0) {
      stats.reachability_rate = parseFloat((stats.reachable / stats.total_calls * 100).toFixed(2));
      stats.conversion_rate = parseFloat((stats.bookings_submitted / stats.total_calls * 100).toFixed(2));
    }

    // Get recent feedback with lead details
    const recentFeedback = feedbackData
      ?.sort((a, b) => new Date(b.call_date).getTime() - new Date(a.call_date).getTime())
      .slice(0, 10)
      .map(f => ({
        ...f,
        lead_name: f.lead.full_name,
        lead_phone: f.lead.phone_number
      }));

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recent_feedback: recentFeedback,
        period,
        period_label: getPeriodLabel(period)
      }
    });

  } catch (error) {
    console.error('Feedback Stats API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
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
    case 'this_month': return 'This Month';
    case 'all': return 'All Time';
    default: return 'All Time';
  }
}