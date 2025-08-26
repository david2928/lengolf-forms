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
    // Get recent feedback data with lead submission times
    const { data: feedbackData, error } = await refacSupabaseAdmin
      .from('lead_feedback')
      .select(`
        id,
        created_at,
        call_date,
        processed_leads!inner(meta_submitted_at, full_name, phone_number)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching feedback data:', error);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    // Calculate differences and format for analysis
    const analysis = feedbackData?.map((item: any) => {
      const leadTime = new Date(item.processed_leads.meta_submitted_at);
      const feedbackTime = new Date(item.created_at);
      const diffMs = feedbackTime.getTime() - leadTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      return {
        feedback_id: item.id,
        customer_name: item.processed_leads.full_name,
        lead_submitted: item.processed_leads.meta_submitted_at,
        feedback_created: item.created_at,
        call_date: item.call_date,
        diff_hours: Math.round(diffHours * 10) / 10,
        diff_days: Math.round(diffDays * 10) / 10,
        is_outlier: diffDays > 30 // Flag extreme outliers
      };
    }) || [];

    // Sort by difference descending to see worst cases first
    analysis.sort((a, b) => b.diff_hours - a.diff_hours);

    // Calculate some stats
    const outliers = analysis.filter(item => item.is_outlier);
    const recent = analysis.filter(item => item.diff_days <= 7);
    
    return NextResponse.json({
      success: true,
      data: analysis,
      stats: {
        total_analyzed: analysis.length,
        outliers_count: outliers.length,
        outliers_percentage: Math.round((outliers.length / analysis.length) * 100),
        recent_week_count: recent.length,
        avg_hours_all: Math.round((analysis.reduce((sum, item) => sum + item.diff_hours, 0) / analysis.length) * 10) / 10,
        avg_hours_recent: recent.length > 0 ? Math.round((recent.reduce((sum, item) => sum + item.diff_hours, 0) / recent.length) * 10) / 10 : 0
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