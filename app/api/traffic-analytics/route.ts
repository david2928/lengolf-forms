import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

type PropertyFilter = 'all' | 'www' | 'booking' | 'liff';

function classifyPageSection(pagePath: string): string {
  const url = pagePath.toLowerCase();
  // Extract path portion
  let path = url;
  try {
    const parsed = new URL(url);
    path = parsed.pathname;
  } catch {
    // If URL parsing fails, use as-is
  }

  // Strip /th/ prefix for Thai pages — classify by content, not language
  const cleanPath = path.replace(/^\/th\/?/, '/');
  if (cleanPath === '/' || cleanPath === '') return 'Home';
  if (cleanPath.includes('/golf')) return 'Golf';
  if (cleanPath.includes('/lesson') || cleanPath.includes('/coaching')) return 'Lessons';
  if (cleanPath.includes('/event')) return 'Events';
  if (cleanPath.includes('/tournament')) return 'Tournaments';
  if (cleanPath.includes('/about')) return 'About';
  if (cleanPath.includes('/blog') || cleanPath.includes('/news')) return 'Blog';
  if (cleanPath.includes('/location') || cleanPath.includes('/contact')) return 'Location';
  if (cleanPath.includes('/booking') || cleanPath.includes('/book')) return 'Booking';
  if (cleanPath.includes('/liff')) return 'LIFF';
  return 'Other';
}

function classifyProperty(pagePath: string): 'www' | 'booking' | 'liff' | 'unknown' {
  const url = pagePath.toLowerCase();
  if (url.includes('booking.len.golf/liff/') || url.includes('/liff/')) return 'liff';
  if (url.includes('booking.len.golf')) return 'booking';
  if (url.includes('www.len.golf') || url.includes('len.golf')) return 'www';
  return 'unknown';
}

function matchesPropertyFilter(pagePath: string, property: PropertyFilter): boolean {
  if (property === 'all') return true;
  const classified = classifyProperty(pagePath);
  return classified === property;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const referenceDateParam = searchParams.get('referenceDate');
    const property = (searchParams.get('property') || 'all') as PropertyFilter;

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
    comparisonPeriodStart.setDate(comparisonPeriodEnd.getDate() - days + 1);

    const startStr = currentPeriodStart.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const compStartStr = comparisonPeriodStart.toISOString().split('T')[0];
    const compEndStr = comparisonPeriodEnd.toISOString().split('T')[0];

    // Fetch all data in parallel
    const [
      { data: currentTrafficData },
      { data: comparisonTrafficData },
      { data: currentFunnelData },
      { data: currentPageData },
      { data: comparisonPageData },
    ] = await Promise.all([
      supabase.schema('marketing').from('google_analytics_traffic').select('*')
        .gte('date', startStr).lte('date', endStr).order('date', { ascending: true }),
      supabase.schema('marketing').from('google_analytics_traffic').select('*')
        .gte('date', compStartStr).lte('date', compEndStr),
      supabase.schema('marketing').from('google_analytics_funnel').select('*')
        .gte('date', startStr).lte('date', endStr),
      supabase.schema('marketing').from('google_analytics_pages').select('*')
        .gte('date', startStr).lte('date', endStr),
      supabase.schema('marketing').from('google_analytics_pages').select('*')
        .gte('date', compStartStr).lte('date', compEndStr),
    ]);

    // === KPIs (traffic table - always all properties) ===
    const totalSessions = currentTrafficData?.reduce((sum, row) => sum + (row.sessions || 0), 0) || 0;
    const totalUsers = currentTrafficData?.reduce((sum, row) => sum + (row.users || 0), 0) || 0;
    const totalNewUsers = currentTrafficData?.reduce((sum, row) => sum + (row.new_users || 0), 0) || 0;
    const totalPageViews = currentTrafficData?.reduce((sum, row) => sum + (row.page_views || 0), 0) || 0;
    const totalConversions = currentTrafficData?.reduce((sum, row) => sum + (row.booking_conversions || 0), 0) || 0;

    const weightedBounceRate = totalSessions > 0 ?
      (currentTrafficData?.reduce((sum, row) => sum + ((row.bounce_rate || 0) * (row.sessions || 0)), 0) || 0) / totalSessions : 0;
    const weightedSessionDuration = totalSessions > 0 ?
      (currentTrafficData?.reduce((sum, row) => sum + ((row.avg_session_duration || 0) * (row.sessions || 0)), 0) || 0) / totalSessions : 0;

    // Comparison KPIs
    const compSessions = comparisonTrafficData?.reduce((sum, row) => sum + (row.sessions || 0), 0) || 0;
    const compUsers = comparisonTrafficData?.reduce((sum, row) => sum + (row.users || 0), 0) || 0;
    const compNewUsers = comparisonTrafficData?.reduce((sum, row) => sum + (row.new_users || 0), 0) || 0;
    const compPageViews = comparisonTrafficData?.reduce((sum, row) => sum + (row.page_views || 0), 0) || 0;
    const compConversions = comparisonTrafficData?.reduce((sum, row) => sum + (row.booking_conversions || 0), 0) || 0;
    const compWeightedBounce = compSessions > 0 ?
      (comparisonTrafficData?.reduce((sum, row) => sum + ((row.bounce_rate || 0) * (row.sessions || 0)), 0) || 0) / compSessions : 0;
    const compWeightedDuration = compSessions > 0 ?
      (comparisonTrafficData?.reduce((sum, row) => sum + ((row.avg_session_duration || 0) * (row.sessions || 0)), 0) || 0) / compSessions : 0;

    const calcChange = (current: number, previous: number) =>
      previous > 0 ? ((current - previous) / previous * 100) : (current > 0 ? 100 : 0);

    const conversionRate = totalSessions > 0 ? (totalConversions / totalSessions * 100) : 0;
    const compConversionRate = compSessions > 0 ? (compConversions / compSessions * 100) : 0;

    const kpis = {
      sessions: totalSessions,
      sessionsChange: calcChange(totalSessions, compSessions),
      users: totalUsers,
      usersChange: calcChange(totalUsers, compUsers),
      newUsers: totalNewUsers,
      newUsersChange: calcChange(totalNewUsers, compNewUsers),
      pageViews: totalPageViews,
      pageViewsChange: calcChange(totalPageViews, compPageViews),
      bounceRate: Number(weightedBounceRate.toFixed(2)),
      bounceRateChange: compWeightedBounce > 0 ? ((weightedBounceRate - compWeightedBounce) / compWeightedBounce * 100) : 0,
      avgDuration: Number(weightedSessionDuration.toFixed(2)),
      avgDurationChange: calcChange(weightedSessionDuration, compWeightedDuration),
      conversions: totalConversions,
      conversionsChange: calcChange(totalConversions, compConversions),
      conversionRate: Number(conversionRate.toFixed(2)),
      conversionRateChange: compConversionRate > 0 ? ((conversionRate - compConversionRate) / compConversionRate * 100) : 0,
    };

    // === Top Pages (filtered by property) ===
    const pageMap = new Map<string, {
      title: string; pageViews: number; uniquePageViews: number; entrances: number;
      bounceRate: number; bounceRateWeight: number; avgTimeOnPage: number; timeWeight: number;
      exitRate: number; exitWeight: number; bookingConversions: number; property: string; section: string;
    }>();

    currentPageData?.forEach(row => {
      const path = row.page_path;
      if (!matchesPropertyFilter(path, property)) return;

      if (!pageMap.has(path)) {
        pageMap.set(path, {
          title: row.page_title || 'Unknown',
          pageViews: 0, uniquePageViews: 0, entrances: 0,
          bounceRate: 0, bounceRateWeight: 0,
          avgTimeOnPage: 0, timeWeight: 0,
          exitRate: 0, exitWeight: 0,
          bookingConversions: 0,
          property: classifyProperty(path),
          section: classifyPageSection(path),
        });
      }
      const current = pageMap.get(path)!;
      current.pageViews += row.page_views || 0;
      current.uniquePageViews += row.unique_page_views || 0;
      current.entrances += row.entrances || 0;
      current.bookingConversions += row.booking_conversions || 0;
      current.bounceRate += (row.bounce_rate || 0) * (row.page_views || 0);
      current.bounceRateWeight += row.page_views || 0;
      current.avgTimeOnPage += (row.avg_time_on_page || 0) * (row.page_views || 0);
      current.timeWeight += row.page_views || 0;
      current.exitRate += (row.exit_rate || 0) * (row.page_views || 0);
      current.exitWeight += row.page_views || 0;
    });

    const topPages = Array.from(pageMap.entries()).map(([path, data]) => ({
      path,
      title: data.title,
      pageViews: data.pageViews,
      uniquePageViews: data.uniquePageViews,
      entrances: data.entrances,
      bounceRate: data.bounceRateWeight > 0 ? Number((data.bounceRate / data.bounceRateWeight).toFixed(2)) : 0,
      avgTimeOnPage: data.timeWeight > 0 ? Number((data.avgTimeOnPage / data.timeWeight).toFixed(2)) : 0,
      exitRate: data.exitWeight > 0 ? Number((data.exitRate / data.exitWeight).toFixed(2)) : 0,
      bookingConversions: data.bookingConversions,
      property: data.property,
      section: data.section,
    })).sort((a, b) => b.pageViews - a.pageViews).slice(0, 50);

    // === Page Daily Trends (for top pages) ===
    const topPagePaths = new Set(topPages.map(p => p.path));
    const pageDailyMap = new Map<string, Map<string, { pageViews: number; uniquePageViews: number; entrances: number; bookingConversions: number }>>();

    currentPageData?.forEach(row => {
      const path = row.page_path;
      if (!topPagePaths.has(path)) return;
      if (!matchesPropertyFilter(path, property)) return;

      if (!pageDailyMap.has(path)) {
        pageDailyMap.set(path, new Map());
      }
      const dateMap = pageDailyMap.get(path)!;
      const date = row.date;
      const existing = dateMap.get(date) || { pageViews: 0, uniquePageViews: 0, entrances: 0, bookingConversions: 0 };
      existing.pageViews += row.page_views || 0;
      existing.uniquePageViews += row.unique_page_views || 0;
      existing.entrances += row.entrances || 0;
      existing.bookingConversions += row.booking_conversions || 0;
      dateMap.set(date, existing);
    });

    const pageDailyTrends: Record<string, Array<{ date: string; pageViews: number; uniquePageViews: number; entrances: number; conversions: number }>> = {};
    pageDailyMap.forEach((dateMap, path) => {
      pageDailyTrends[path] = Array.from(dateMap.entries())
        .map(([date, d]) => ({ date, pageViews: d.pageViews, uniquePageViews: d.uniquePageViews, entrances: d.entrances, conversions: d.bookingConversions }))
        .sort((a, b) => a.date.localeCompare(b.date));
    });

    // === Funnel Data (always all properties) ===
    const funnelChannelMap = new Map<string, {
      stage1Users: number; stage2Users: number; stage3Users: number;
      stage4Users: number; stage5Users: number; stage6Users: number;
    }>();

    currentFunnelData?.forEach(row => {
      const channel = row.channel_grouping;
      if (!funnelChannelMap.has(channel)) {
        funnelChannelMap.set(channel, {
          stage1Users: 0, stage2Users: 0, stage3Users: 0,
          stage4Users: 0, stage5Users: 0, stage6Users: 0,
        });
      }
      const current = funnelChannelMap.get(channel)!;
      current.stage1Users += row.stage_1_users || 0;
      current.stage2Users += row.stage_2_users || 0;
      current.stage3Users += row.stage_3_users || 0;
      current.stage4Users += row.stage_4_users || 0;
      current.stage5Users += row.stage_5_users || 0;
      current.stage6Users += row.stage_6_users || 0;
    });

    const funnelData = Array.from(funnelChannelMap.entries()).map(([channel, data]) => ({
      channel,
      ...data,
      overallConversionRate: data.stage1Users > 0 ? Number((data.stage6Users / data.stage1Users * 100).toFixed(2)) : 0,
    })).sort((a, b) => b.stage1Users - a.stage1Users);

    // === Channel Breakdown (always all properties) ===
    const channelMap = new Map<string, { sessions: number; users: number; conversions: number }>();
    const compChannelMap = new Map<string, { sessions: number; conversions: number }>();

    currentTrafficData?.forEach(row => {
      const channel = row.channel_grouping;
      if (!channelMap.has(channel)) {
        channelMap.set(channel, { sessions: 0, users: 0, conversions: 0 });
      }
      const c = channelMap.get(channel)!;
      c.sessions += row.sessions || 0;
      c.users += row.users || 0;
      c.conversions += row.booking_conversions || 0;
    });

    comparisonTrafficData?.forEach(row => {
      const channel = row.channel_grouping;
      if (!compChannelMap.has(channel)) {
        compChannelMap.set(channel, { sessions: 0, conversions: 0 });
      }
      const c = compChannelMap.get(channel)!;
      c.sessions += row.sessions || 0;
      c.conversions += row.booking_conversions || 0;
    });

    const channelBreakdown = Array.from(channelMap.entries()).map(([channel, current]) => {
      const comp = compChannelMap.get(channel) || { sessions: 0, conversions: 0 };
      const currentCR = current.sessions > 0 ? (current.conversions / current.sessions * 100) : 0;
      const compCR = comp.sessions > 0 ? (comp.conversions / comp.sessions * 100) : 0;
      return {
        channel,
        sessions: current.sessions,
        users: current.users,
        conversions: current.conversions,
        conversionRate: Number(currentCR.toFixed(2)),
        sessionsChange: calcChange(current.sessions, comp.sessions),
        conversionRateChange: compCR > 0 ? ((currentCR - compCR) / compCR * 100) : (currentCR > 0 ? 100 : 0),
      };
    }).sort((a, b) => b.sessions - a.sessions);

    // === Device Breakdown ===
    const deviceMap = new Map<string, { sessions: number; conversions: number }>();
    currentTrafficData?.forEach(row => {
      const device = row.device_category;
      if (!deviceMap.has(device)) {
        deviceMap.set(device, { sessions: 0, conversions: 0 });
      }
      const c = deviceMap.get(device)!;
      c.sessions += row.sessions || 0;
      c.conversions += row.booking_conversions || 0;
    });

    const deviceBreakdown = Array.from(deviceMap.entries()).map(([device, data]) => ({
      device,
      sessions: data.sessions,
      percentage: totalSessions > 0 ? Number((data.sessions / totalSessions * 100).toFixed(1)) : 0,
      conversionRate: data.sessions > 0 ? Number((data.conversions / data.sessions * 100).toFixed(2)) : 0,
    })).sort((a, b) => b.sessions - a.sessions);

    // === Daily Trends ===
    const dailyMap = new Map<string, { sessions: number; users: number; conversions: number }>();
    currentTrafficData?.forEach(row => {
      const date = row.date;
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { sessions: 0, users: 0, conversions: 0 });
      }
      const c = dailyMap.get(date)!;
      c.sessions += row.sessions || 0;
      c.users += row.users || 0;
      c.conversions += row.booking_conversions || 0;
    });

    const dailyTrends = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      sessions: data.sessions,
      users: data.users,
      conversions: data.conversions,
      conversionRate: data.sessions > 0 ? Number((data.conversions / data.sessions * 100).toFixed(2)) : 0,
    })).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      kpis,
      topPages,
      pageDailyTrends,
      funnelData,
      channelBreakdown,
      deviceBreakdown,
      dailyTrends,
      propertyFilter: property,
    });

  } catch (error) {
    console.error('Traffic analytics API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch traffic analytics data" },
      { status: 500 }
    );
  }
}
