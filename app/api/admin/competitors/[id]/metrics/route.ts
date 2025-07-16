import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { getRefacSupabaseClient } from '@/lib/refac-supabase';

// GET /api/admin/competitors/[id]/metrics - Get historical metrics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const competitorId = parseInt(params.id);
    if (isNaN(competitorId)) {
      return NextResponse.json({ error: 'Invalid competitor ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supabase = getRefacSupabaseClient();

    let query = supabase
      .schema('marketing').from('competitor_metrics')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('recorded_at', { ascending: false });

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (startDate) {
      query = query.gte('recorded_at', startDate);
    }

    if (endDate) {
      query = query.lte('recorded_at', endDate);
    }

    const { data: metrics, error } = await query;

    if (error) {
      console.error('Error fetching metrics:', error);
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }

    // Calculate growth rates and trends
    const metricsWithAnalysis = calculateMetricsTrends(metrics || []);

    return NextResponse.json({ 
      metrics: metricsWithAnalysis,
      summary: generateMetricsSummary(metricsWithAnalysis)
    });
  } catch (error) {
    console.error('Error in GET /api/admin/competitors/[id]/metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateMetricsTrends(metrics: any[]) {
  if (metrics.length < 2) return metrics;

  // Group by platform
  const byPlatform = metrics.reduce((acc, metric) => {
    if (!acc[metric.platform]) acc[metric.platform] = [];
    acc[metric.platform].push(metric);
    return acc;
  }, {} as Record<string, any[]>);

  // Calculate trends for each platform
  Object.keys(byPlatform).forEach(platform => {
    const platformMetrics = byPlatform[platform];
    
    for (let i = 0; i < platformMetrics.length - 1; i++) {
      const current = platformMetrics[i];
      const previous = platformMetrics[i + 1];
      
      // Calculate follower growth
      if (current.followers_count && previous.followers_count) {
        current.follower_growth = current.followers_count - previous.followers_count;
        current.follower_growth_rate = ((current.followers_count - previous.followers_count) / previous.followers_count) * 100;
      }
    }
  });

  return metrics;
}

function generateMetricsSummary(metrics: any[]) {
  if (metrics.length === 0) return null;

  const latestByPlatform = metrics.reduce((acc, metric) => {
    if (!acc[metric.platform] || new Date(metric.recorded_at) > new Date(acc[metric.platform].recorded_at)) {
      acc[metric.platform] = metric;
    }
    return acc;
  }, {} as Record<string, any>);

  const summary = {
    total_followers: Object.values(latestByPlatform).reduce((sum, m: any) => {
      // Get the primary metric for each platform
      let primaryMetric = 0;
      switch (m.platform) {
        case 'instagram':
        case 'facebook':
          primaryMetric = m.followers_count || m.page_likes || 0;
          break;
        case 'line':
          primaryMetric = m.line_friends_count || 0;
          break;
        case 'google_reviews':
          primaryMetric = m.google_review_count || 0;
          break;
        default:
          primaryMetric = m.followers_count || 0;
      }
      return sum + primaryMetric;
    }, 0),
    platforms_tracked: Object.keys(latestByPlatform).length,
    last_updated: metrics[0]?.recorded_at,
    growth_trends: {} as Record<string, string>
  };

  // Determine growth trends
  Object.entries(latestByPlatform).forEach(([platform, metric]: [string, any]) => {
    if (metric.follower_growth_rate) {
      summary.growth_trends[platform] = metric.follower_growth_rate > 0 ? 'increasing' : 
                                       metric.follower_growth_rate < 0 ? 'decreasing' : 'stable';
    }
  });

  return summary;
}