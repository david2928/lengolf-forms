import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface TrafficAnalytics {
  // Overall traffic metrics
  totalSessions: number;
  totalUsers: number;
  totalPageViews: number;
  avgPagesPerSession: number;
  avgSessionDuration: number;
  avgBounceRate: number;
  
  // Channel performance
  channelPerformance: Array<{
    channel: string;
    sessions: number;
    users: number;
    bookingConversions: number;
    conversionRate: number;
    sessionsChange: number;
    conversionRateChange: number;
  }>;
  
  // Device breakdown
  deviceBreakdown: Array<{
    device: string;
    sessions: number;
    percentage: number;
    conversionRate: number;
  }>;
  
  // Funnel analysis
  funnelData: Array<{
    channel: string;
    stage1Users: number; // Landing
    stage2Users: number; // Book Now
    stage3Users: number; // Booking Page
    stage4Users: number; // Form Start
    stage5Users: number; // Login
    stage6Users: number; // Confirmation
    overallConversionRate: number;
  }>;
  
  // Top pages
  topPages: Array<{
    path: string;
    title: string;
    pageViews: number;
    entrances: number;
    bounceRate: number;
    bookingConversions: number;
  }>;
  
  // Time series data for charts
  dailyTrends: Array<{
    date: string;
    sessions: number;
    users: number;
    bookingConversions: number;
    conversionRate: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const comparisonDays = parseInt(searchParams.get('comparisonDays') || '30');
    const referenceDateParam = searchParams.get('referenceDate');

    // Calculate date ranges
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const referenceDate = referenceDateParam ? new Date(referenceDateParam) : yesterday;
    const endDate = referenceDate;
    
    const currentPeriodStart = new Date(endDate);
    currentPeriodStart.setDate(endDate.getDate() - days + 1);
    
    const comparisonPeriodEnd = new Date(currentPeriodStart);
    comparisonPeriodEnd.setDate(currentPeriodStart.getDate() - 1);
    
    const comparisonPeriodStart = new Date(comparisonPeriodEnd);
    comparisonPeriodStart.setDate(comparisonPeriodEnd.getDate() - comparisonDays + 1);

    // Get traffic data for current period
    const { data: currentTrafficData } = await supabase
      .schema('marketing')
      .from('google_analytics_traffic')
      .select('*')
      .gte('date', currentPeriodStart.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // Get traffic data for comparison period
    const { data: comparisonTrafficData } = await supabase
      .schema('marketing')
      .from('google_analytics_traffic')
      .select('*')
      .gte('date', comparisonPeriodStart.toISOString().split('T')[0])
      .lte('date', comparisonPeriodEnd.toISOString().split('T')[0]);

    // Get funnel data for current period
    const { data: currentFunnelData } = await supabase
      .schema('marketing')
      .from('google_analytics_funnel')
      .select('*')
      .gte('date', currentPeriodStart.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    // Get funnel data for comparison period
    const { data: comparisonFunnelData } = await supabase
      .schema('marketing')
      .from('google_analytics_funnel')
      .select('*')
      .gte('date', comparisonPeriodStart.toISOString().split('T')[0])
      .lte('date', comparisonPeriodEnd.toISOString().split('T')[0]);

    // Get page data for current period
    const { data: currentPageData } = await supabase
      .schema('marketing')
      .from('google_analytics_pages')
      .select('*')
      .gte('date', currentPeriodStart.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('page_views', { ascending: false })
      .limit(10);

    // Calculate overall metrics
    const totalCurrentSessions = currentTrafficData?.reduce((sum, row) => sum + (row.sessions || 0), 0) || 0;
    const totalCurrentUsers = currentTrafficData?.reduce((sum, row) => sum + (row.users || 0), 0) || 0;
    const totalCurrentPageViews = currentTrafficData?.reduce((sum, row) => sum + (row.page_views || 0), 0) || 0;
    
    // Calculate weighted averages
    const weightedPagesPerSession = totalCurrentSessions > 0 ? 
      currentTrafficData?.reduce((sum, row) => sum + ((row.pages_per_session || 0) * (row.sessions || 0)), 0) / totalCurrentSessions || 0 : 0;
    const weightedSessionDuration = totalCurrentSessions > 0 ? 
      currentTrafficData?.reduce((sum, row) => sum + ((row.avg_session_duration || 0) * (row.sessions || 0)), 0) / totalCurrentSessions || 0 : 0;
    const weightedBounceRate = totalCurrentSessions > 0 ? 
      currentTrafficData?.reduce((sum, row) => sum + ((row.bounce_rate || 0) * (row.sessions || 0)), 0) / totalCurrentSessions || 0 : 0;

    // Process channel performance
    const channelMap = new Map<string, any>();
    const comparisonChannelMap = new Map<string, any>();

    // Aggregate current period by channel
    currentTrafficData?.forEach(row => {
      const channel = row.channel_grouping;
      if (!channelMap.has(channel)) {
        channelMap.set(channel, {
          sessions: 0, users: 0, bookingConversions: 0
        });
      }
      const current = channelMap.get(channel);
      current.sessions += row.sessions || 0;
      current.users += row.users || 0;
      current.bookingConversions += row.booking_conversions || 0;
    });

    // Aggregate comparison period by channel
    comparisonTrafficData?.forEach(row => {
      const channel = row.channel_grouping;
      if (!comparisonChannelMap.has(channel)) {
        comparisonChannelMap.set(channel, {
          sessions: 0, bookingConversions: 0
        });
      }
      const comparison = comparisonChannelMap.get(channel);
      comparison.sessions += row.sessions || 0;
      comparison.bookingConversions += row.booking_conversions || 0;
    });

    // Build channel performance array
    const channelPerformance = Array.from(channelMap.entries()).map(([channel, current]) => {
      const comparison = comparisonChannelMap.get(channel) || { sessions: 0, bookingConversions: 0 };
      const currentConversionRate = current.sessions > 0 ? (current.bookingConversions / current.sessions * 100) : 0;
      const comparisonConversionRate = comparison.sessions > 0 ? (comparison.bookingConversions / comparison.sessions * 100) : 0;
      
      return {
        channel,
        sessions: current.sessions,
        users: current.users,
        bookingConversions: current.bookingConversions,
        conversionRate: Number(currentConversionRate.toFixed(2)),
        sessionsChange: comparison.sessions > 0 ? ((current.sessions - comparison.sessions) / comparison.sessions * 100) : (current.sessions > 0 ? 100 : 0),
        conversionRateChange: comparisonConversionRate > 0 ? ((currentConversionRate - comparisonConversionRate) / comparisonConversionRate * 100) : (currentConversionRate > 0 ? 100 : 0)
      };
    }).sort((a, b) => b.sessions - a.sessions);

    // Device breakdown
    const deviceMap = new Map<string, any>();
    currentTrafficData?.forEach(row => {
      const device = row.device_category;
      if (!deviceMap.has(device)) {
        deviceMap.set(device, { sessions: 0, bookingConversions: 0 });
      }
      const current = deviceMap.get(device);
      current.sessions += row.sessions || 0;
      current.bookingConversions += row.booking_conversions || 0;
    });

    const deviceBreakdown = Array.from(deviceMap.entries()).map(([device, data]) => ({
      device,
      sessions: data.sessions,
      percentage: totalCurrentSessions > 0 ? Number((data.sessions / totalCurrentSessions * 100).toFixed(1)) : 0,
      conversionRate: data.sessions > 0 ? Number((data.bookingConversions / data.sessions * 100).toFixed(2)) : 0
    })).sort((a, b) => b.sessions - a.sessions);

    // Process funnel data
    const funnelChannelMap = new Map<string, any>();
    currentFunnelData?.forEach(row => {
      const channel = row.channel_grouping;
      if (!funnelChannelMap.has(channel)) {
        funnelChannelMap.set(channel, {
          stage1Users: 0, stage2Users: 0, stage3Users: 0, 
          stage4Users: 0, stage5Users: 0, stage6Users: 0
        });
      }
      const current = funnelChannelMap.get(channel);
      current.stage1Users += row.stage_1_users || 0;
      current.stage2Users += row.stage_2_users || 0;
      current.stage3Users += row.stage_3_users || 0;
      current.stage4Users += row.stage_4_users || 0;
      current.stage5Users += row.stage_5_users || 0;
      current.stage6Users += row.stage_6_users || 0;
    });

    const funnelData = Array.from(funnelChannelMap.entries()).map(([channel, data]) => ({
      channel,
      stage1Users: data.stage1Users,
      stage2Users: data.stage2Users,
      stage3Users: data.stage3Users,
      stage4Users: data.stage4Users,
      stage5Users: data.stage5Users,
      stage6Users: data.stage6Users,
      overallConversionRate: data.stage1Users > 0 ? Number((data.stage6Users / data.stage1Users * 100).toFixed(2)) : 0
    })).sort((a, b) => b.stage1Users - a.stage1Users);

    // Process page data
    const pageMap = new Map<string, any>();
    currentPageData?.forEach(row => {
      const path = row.page_path;
      if (!pageMap.has(path)) {
        pageMap.set(path, {
          title: row.page_title || 'Unknown',
          pageViews: 0, entrances: 0, bounceRate: 0, bookingConversions: 0,
          totalBounceRate: 0, bounceRateWeight: 0
        });
      }
      const current = pageMap.get(path);
      current.pageViews += row.page_views || 0;
      current.entrances += row.entrances || 0;
      current.bookingConversions += row.booking_conversions || 0;
      // Weighted bounce rate calculation
      current.totalBounceRate += (row.bounce_rate || 0) * (row.page_views || 0);
      current.bounceRateWeight += row.page_views || 0;
    });

    const topPages = Array.from(pageMap.entries()).map(([path, data]) => ({
      path,
      title: data.title,
      pageViews: data.pageViews,
      entrances: data.entrances,
      bounceRate: data.bounceRateWeight > 0 ? Number((data.totalBounceRate / data.bounceRateWeight).toFixed(2)) : 0,
      bookingConversions: data.bookingConversions
    })).sort((a, b) => b.pageViews - a.pageViews);

    // Daily trends (group by date)
    const dailyMap = new Map<string, any>();
    currentTrafficData?.forEach(row => {
      const date = row.date;
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { sessions: 0, users: 0, bookingConversions: 0 });
      }
      const current = dailyMap.get(date);
      current.sessions += row.sessions || 0;
      current.users += row.users || 0;
      current.bookingConversions += row.booking_conversions || 0;
    });

    const dailyTrends = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      sessions: data.sessions,
      users: data.users,
      bookingConversions: data.bookingConversions,
      conversionRate: data.sessions > 0 ? Number((data.bookingConversions / data.sessions * 100).toFixed(2)) : 0
    })).sort((a, b) => a.date.localeCompare(b.date));

    const analytics: TrafficAnalytics = {
      totalSessions: totalCurrentSessions,
      totalUsers: totalCurrentUsers,
      totalPageViews: totalCurrentPageViews,
      avgPagesPerSession: Number(weightedPagesPerSession.toFixed(2)),
      avgSessionDuration: Number(weightedSessionDuration.toFixed(2)),
      avgBounceRate: Number(weightedBounceRate.toFixed(2)),
      channelPerformance,
      deviceBreakdown,
      funnelData,
      topPages,
      dailyTrends
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Traffic analytics API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch traffic analytics data" },
      { status: 500 }
    );
  }
}