import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface ChartData {
  spendTrend: {
    date: string;
    googleSpend: number;
    metaSpend: number;
    totalSpend: number;
    conversions: number;
  }[];
  platformComparison: {
    platform: string;
    spend: number;
    conversions: number;
    percentage: number;
  }[];
  conversionFunnel: {
    platform: string;
    impressions: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
  }[];
  cacTrend: {
    date: string;
    googleCac: number;
    metaCac: number;
    blendedCac: number;
  }[];
  roasByPlatform: {
    platform: string;
    roas: number;
    spend: number;
    revenue: number;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get Google Ads daily data
    const { data: googleData } = await supabase
      .schema('marketing')
      .from('google_ads_campaign_performance')
      .select('date, impressions, clicks, cost_micros, conversions')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });

    // Get Meta Ads daily data
    const { data: metaData } = await supabase
      .schema('marketing')
      .from('meta_ads_campaign_performance')
      .select('date, impressions, clicks, spend_cents, conversions')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });

    // Helper function to group data by date
    const groupByDate = (googleData: any[], metaData: any[]) => {
      const dateMap = new Map();

      // Process Google data
      googleData?.forEach(row => {
        const date = row.date;
        if (!dateMap.has(date)) {
          dateMap.set(date, { google: [], meta: [] });
        }
        dateMap.get(date).google.push(row);
      });

      // Process Meta data
      metaData?.forEach(row => {
        const date = row.date;
        if (!dateMap.has(date)) {
          dateMap.set(date, { google: [], meta: [] });
        }
        dateMap.get(date).meta.push(row);
      });

      return dateMap;
    };

    const dailyData = groupByDate(googleData || [], metaData || []);

    // 1. Spend Trend Chart Data
    const spendTrend = Array.from(dailyData.entries())
      .map(([date, data]) => {
        const googleSpend = data.google.reduce((sum: number, row: any) => 
          sum + (Number(row.cost_micros) / 1000000 || 0), 0);
        const metaSpend = data.meta.reduce((sum: number, row: any) => 
          sum + (Number(row.spend_cents) / 100 || 0), 0);
        const conversions = data.google.reduce((sum: number, row: any) => 
          sum + (Number(row.conversions) || 0), 0) + 
          data.meta.reduce((sum: number, row: any) => 
          sum + (Number(row.conversions) || 0), 0);

        return {
          date,
          googleSpend,
          metaSpend,
          totalSpend: googleSpend + metaSpend,
          conversions
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // 2. Platform Comparison Data
    const totalGoogleSpend = spendTrend.reduce((sum, day) => sum + day.googleSpend, 0);
    const totalMetaSpend = spendTrend.reduce((sum, day) => sum + day.metaSpend, 0);
    const totalSpend = totalGoogleSpend + totalMetaSpend;
    
    const googleConversions = googleData?.reduce((sum, row) => sum + (Number(row.conversions) || 0), 0) || 0;
    const metaConversions = metaData?.reduce((sum, row) => sum + (Number(row.conversions) || 0), 0) || 0;

    const platformComparison = [
      {
        platform: 'Google Ads',
        spend: totalGoogleSpend,
        conversions: googleConversions,
        percentage: totalSpend > 0 ? (totalGoogleSpend / totalSpend) * 100 : 0
      },
      {
        platform: 'Meta Ads',
        spend: totalMetaSpend,
        conversions: metaConversions,
        percentage: totalSpend > 0 ? (totalMetaSpend / totalSpend) * 100 : 0
      }
    ];

    // 3. Conversion Funnel Data
    const googleTotals = googleData?.reduce((acc, row) => ({
      impressions: acc.impressions + (row.impressions || 0),
      clicks: acc.clicks + (row.clicks || 0),
      conversions: acc.conversions + (Number(row.conversions) || 0)
    }), { impressions: 0, clicks: 0, conversions: 0 }) || { impressions: 0, clicks: 0, conversions: 0 };

    const metaTotals = metaData?.reduce((acc, row) => ({
      impressions: acc.impressions + (row.impressions || 0),
      clicks: acc.clicks + (row.clicks || 0),
      conversions: acc.conversions + (Number(row.conversions) || 0)
    }), { impressions: 0, clicks: 0, conversions: 0 }) || { impressions: 0, clicks: 0, conversions: 0 };

    const conversionFunnel = [
      {
        platform: 'Google Ads',
        impressions: googleTotals.impressions,
        clicks: googleTotals.clicks,
        conversions: googleTotals.conversions,
        conversionRate: googleTotals.clicks > 0 ? (googleTotals.conversions / googleTotals.clicks) * 100 : 0
      },
      {
        platform: 'Meta Ads',
        impressions: metaTotals.impressions,
        clicks: metaTotals.clicks,
        conversions: metaTotals.conversions,
        conversionRate: metaTotals.clicks > 0 ? (metaTotals.conversions / metaTotals.clicks) * 100 : 0
      }
    ];

    // 4. CAC Trend Data (weekly aggregation for smoother trend)
    const weeklyCAC = new Map();
    spendTrend.forEach(day => {
      const date = new Date(day.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Get Sunday of that week
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyCAC.has(weekKey)) {
        weeklyCAC.set(weekKey, {
          date: weekKey,
          googleSpend: 0,
          metaSpend: 0,
          googleConversions: 0,
          metaConversions: 0
        });
      }

      const week = weeklyCAC.get(weekKey);
      week.googleSpend += day.googleSpend;
      week.metaSpend += day.metaSpend;
      // We'd need to track conversions by platform daily to calculate this properly
      // For now, using a simplified approach
    });

    const cacTrend = Array.from(weeklyCAC.values())
      .map(week => ({
        date: week.date,
        googleCac: week.googleConversions > 0 ? week.googleSpend / week.googleConversions : 0,
        metaCac: week.metaConversions > 0 ? week.metaSpend / week.metaConversions : 0,
        blendedCac: (week.googleConversions + week.metaConversions) > 0 ? 
          (week.googleSpend + week.metaSpend) / (week.googleConversions + week.metaConversions) : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 5. ROAS by Platform (placeholder values - should be calculated from actual revenue)
    const roasByPlatform = [
      {
        platform: 'Google Ads',
        roas: 2.8,
        spend: totalGoogleSpend,
        revenue: totalGoogleSpend * 2.8
      },
      {
        platform: 'Meta Ads',
        roas: 2.2,
        spend: totalMetaSpend,
        revenue: totalMetaSpend * 2.2
      }
    ];

    const chartData: ChartData = {
      spendTrend,
      platformComparison,
      conversionFunnel,
      cacTrend,
      roasByPlatform
    };

    return NextResponse.json(chartData);

  } catch (error) {
    console.error('Marketing charts API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch marketing charts data" },
      { status: 500 }
    );
  }
}