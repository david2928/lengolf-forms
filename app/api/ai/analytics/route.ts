import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Get AI suggestion analytics and performance metrics
 * GET /api/ai/analytics?days=7
 */
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('days') || '7', 10);

    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        error: 'Database not available'
      }, { status: 503 });
    }

    // Get analytics using the stored function
    const { data: analytics, error } = await refacSupabaseAdmin
      .rpc('get_ai_suggestion_analytics', { days_back: daysBack });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const stats = analytics[0] || {
      total_suggestions: 0,
      accepted_count: 0,
      edited_count: 0,
      declined_count: 0,
      avg_confidence: 0,
      avg_response_time_ms: 0,
      acceptance_rate: 0
    };

    // Get daily breakdown
    const { data: dailyStats, error: dailyError } = await refacSupabaseAdmin
      .from('ai_suggestions')
      .select(`
        created_at,
        was_accepted,
        was_edited,
        was_declined,
        confidence_score,
        response_time_ms
      `)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (dailyError) {
      console.error('Error fetching daily stats:', dailyError);
    }

    // Process daily breakdown
    const dailyBreakdown = processDailyBreakdown(dailyStats || [], daysBack);

    // Get top similar messages usage
    const { data: topCategories, error: categoryError } = await refacSupabaseAdmin
      .from('ai_suggestions')
      .select(`
        context_used,
        was_accepted,
        confidence_score
      `)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    if (categoryError) {
      console.error('Error fetching category stats:', categoryError);
    }

    return NextResponse.json({
      success: true,
      period: `${daysBack} days`,
      analytics: {
        totalSuggestions: stats.total_suggestions,
        acceptedCount: stats.accepted_count,
        editedCount: stats.edited_count,
        declinedCount: stats.declined_count,
        averageConfidence: Math.round(stats.avg_confidence * 100) / 100,
        averageResponseTime: Math.round(stats.avg_response_time_ms),
        acceptanceRate: Math.round(stats.acceptance_rate * 100) / 100,
        editRate: stats.total_suggestions > 0
          ? Math.round((stats.edited_count / stats.total_suggestions) * 100 * 100) / 100
          : 0,
        declineRate: stats.total_suggestions > 0
          ? Math.round((stats.declined_count / stats.total_suggestions) * 100 * 100) / 100
          : 0
      },
      dailyBreakdown,
      insights: generateInsights(stats, dailyStats || [])
    });

  } catch (error) {
    console.error('Error fetching AI analytics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Process daily breakdown data
function processDailyBreakdown(data: any[], daysBack: number) {
  const days = Array.from({ length: daysBack }, (_, i) => {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    return {
      date: date.toISOString().split('T')[0],
      suggestions: 0,
      accepted: 0,
      edited: 0,
      declined: 0,
      avgConfidence: 0,
      avgResponseTime: 0
    };
  }).reverse();

  // Group data by date
  const grouped = data.reduce((acc, item) => {
    const date = item.created_at.split('T')[0];
    if (!acc[date]) {
      acc[date] = {
        suggestions: 0,
        accepted: 0,
        edited: 0,
        declined: 0,
        confidenceSum: 0,
        responseTimeSum: 0
      };
    }

    acc[date].suggestions++;
    if (item.was_accepted) acc[date].accepted++;
    if (item.was_edited) acc[date].edited++;
    if (item.was_declined) acc[date].declined++;
    acc[date].confidenceSum += item.confidence_score || 0;
    acc[date].responseTimeSum += item.response_time_ms || 0;

    return acc;
  }, {} as Record<string, any>);

  // Fill in the days array with actual data
  return days.map(day => {
    const dayData = grouped[day.date];
    if (dayData) {
      return {
        ...day,
        suggestions: dayData.suggestions,
        accepted: dayData.accepted,
        edited: dayData.edited,
        declined: dayData.declined,
        avgConfidence: dayData.suggestions > 0
          ? Math.round((dayData.confidenceSum / dayData.suggestions) * 100) / 100
          : 0,
        avgResponseTime: dayData.suggestions > 0
          ? Math.round(dayData.responseTimeSum / dayData.suggestions)
          : 0
      };
    }
    return day;
  });
}

// Generate insights based on analytics data
function generateInsights(stats: any, dailyData: any[]) {
  const insights = [];

  // Performance insights
  if (stats.avg_response_time_ms > 3000) {
    insights.push({
      type: 'warning',
      message: `Average response time is ${Math.round(stats.avg_response_time_ms)}ms. Consider optimizing for better user experience.`
    });
  } else if (stats.avg_response_time_ms < 1500) {
    insights.push({
      type: 'success',
      message: `Excellent response time of ${Math.round(stats.avg_response_time_ms)}ms.`
    });
  }

  // Acceptance rate insights
  if (stats.acceptance_rate > 70) {
    insights.push({
      type: 'success',
      message: `High acceptance rate of ${Math.round(stats.acceptance_rate)}% indicates good suggestion quality.`
    });
  } else if (stats.acceptance_rate < 50) {
    insights.push({
      type: 'warning',
      message: `Low acceptance rate of ${Math.round(stats.acceptance_rate)}%. Consider improving prompt engineering or context.`
    });
  }

  // Confidence insights
  if (stats.avg_confidence > 0.8) {
    insights.push({
      type: 'success',
      message: `High average confidence of ${Math.round(stats.avg_confidence * 100)}%.`
    });
  } else if (stats.avg_confidence < 0.6) {
    insights.push({
      type: 'info',
      message: `Average confidence is ${Math.round(stats.avg_confidence * 100)}%. More training data might help improve accuracy.`
    });
  }

  // Usage insights
  if (stats.total_suggestions < 10) {
    insights.push({
      type: 'info',
      message: 'Low usage detected. Consider promoting the AI suggestion feature to staff.'
    });
  }

  return insights;
}