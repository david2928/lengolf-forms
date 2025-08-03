import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    
    // Define periods based on "days ago"
    const periods = [
      { name: 'latest', days: 0, label: 'Latest' },
      { name: 'l7days', days: 7, label: 'Last 7 Days' },
      { name: 'l14days', days: 14, label: 'Last 14 Days' },
      { name: 'l21days', days: 21, label: 'Last 21 Days' },
      { name: 'l28days', days: 28, label: 'Last 28 Days' }
    ];

    // Get all active competitors with their social accounts
    const { data: competitors, error: competitorsError } = await supabaseAdmin
      .schema('marketing')
      .from('competitors')
      .select(`
        id,
        name,
        social_accounts:competitor_social_accounts(
          id,
          platform
        )
      `)
      .eq('is_active', true);

    if (competitorsError) {
      throw competitorsError;
    }

    const trendData = [];

    // Process each competitor and platform
    for (const competitor of competitors || []) {
      for (const account of competitor.social_accounts || []) {
        try {
          const competitorTrend: any = {
            competitor_id: competitor.id,
            competitor_name: competitor.name,
            platform: account.platform,
            periods: {}
          };

          // Get data for each period
          for (const period of periods) {
            let startDate: Date;
            let endDate: Date;

            if (period.days === 0) {
              // Latest - get most recent record
              const { data: latestMetrics } = await supabaseAdmin
                .schema('marketing')
                .from('competitor_metrics')
                .select('*')
                .eq('competitor_id', competitor.id)
                .eq('platform', account.platform)
                .order('recorded_at', { ascending: false })
                .limit(1);

              competitorTrend.periods[period.name] = latestMetrics?.[0] || null;
            } else {
              // For historical periods, get the closest record to that date
              const targetDate = new Date(now);
              targetDate.setDate(now.getDate() - period.days);
              
              // Look for records within a 3-day window around the target date
              const windowStart = new Date(targetDate);
              windowStart.setDate(targetDate.getDate() - 1);
              
              const windowEnd = new Date(targetDate);
              windowEnd.setDate(targetDate.getDate() + 1);

              const { data: periodMetrics } = await supabaseAdmin
                .schema('marketing')
                .from('competitor_metrics')
                .select('*')
                .eq('competitor_id', competitor.id)
                .eq('platform', account.platform)
                .gte('recorded_at', windowStart.toISOString())
                .lte('recorded_at', windowEnd.toISOString())
                .order('recorded_at', { ascending: false })
                .limit(1);

              competitorTrend.periods[period.name] = periodMetrics?.[0] || null;
            }
          }

          // Only include if we have at least latest data
          if (competitorTrend.periods.latest) {
            trendData.push(competitorTrend);
          }
        } catch (error) {
          console.error(`Error processing ${competitor.name} - ${account.platform}:`, error);
          continue;
        }
      }
    }

    // Sort by competitor name and platform for consistent ordering
    trendData.sort((a, b) => {
      const nameCompare = a.competitor_name.localeCompare(b.competitor_name);
      if (nameCompare !== 0) return nameCompare;
      return a.platform.localeCompare(b.platform);
    });

    return NextResponse.json({
      success: true,
      trends: trendData,
      periods: periods.map(p => ({ name: p.name, label: p.label, days: p.days })),
      generated_at: now.toISOString()
    });

  } catch (error: any) {
    console.error('Trend analysis error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch trend analysis data',
      message: error.message
    }, { status: 500 });
  }
}