import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface MarketingKPIs {
  totalSpend: number;
  totalSpendChange: number;
  totalImpressions: number;
  totalImpressionsChange: number;
  totalClicks: number;
  totalClicksChange: number;
  averageCtr: number;
  averageCtrChange: number;
  totalNewCustomers: number;
  totalNewCustomersChange: number;
  cac: number;
  cacChange: number;
  roas: number;
  roasChange: number;
  customerLifetimeValue: number; // Actually gross profit
  customerLifetimeValueChange: number;
  googleSpend: number;
  metaSpend: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
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

    // Get current period data (exclude today unless specific reference date provided)
    const today = new Date();
    const referenceDate = referenceDateParam ? new Date(referenceDateParam) : new Date(today);
    const yesterday = referenceDateParam ? referenceDate : new Date(today.setDate(today.getDate() - 1));
    
    const currentPeriodStart = new Date(yesterday);
    currentPeriodStart.setDate(yesterday.getDate() - days + 1);
    
    // Get comparison period data
    const comparisonPeriodEnd = new Date(currentPeriodStart);
    comparisonPeriodEnd.setDate(currentPeriodStart.getDate() - 1);
    
    const comparisonPeriodStart = new Date(comparisonPeriodEnd);
    comparisonPeriodStart.setDate(comparisonPeriodEnd.getDate() - comparisonDays + 1);

    // Get Google Ads current period data
    const { data: googleCurrent } = await supabase
      .schema('marketing')
      .from('google_ads_campaign_performance')
      .select('impressions, clicks, cost_micros, conversions, ctr')
      .gte('date', currentPeriodStart.toISOString().split('T')[0])
      .lte('date', yesterday.toISOString().split('T')[0]);

    // Get Google Ads comparison period data
    const { data: googleComparison } = await supabase
      .schema('marketing')
      .from('google_ads_campaign_performance')
      .select('impressions, clicks, cost_micros, conversions, ctr')
      .gte('date', comparisonPeriodStart.toISOString().split('T')[0])
      .lte('date', comparisonPeriodEnd.toISOString().split('T')[0]);

    // Get Meta Ads current period data
    const { data: metaCurrent } = await supabase
      .schema('marketing')
      .from('meta_ads_campaign_performance')
      .select('impressions, clicks, spend_cents, conversions, ctr')
      .gte('date', currentPeriodStart.toISOString().split('T')[0])
      .lte('date', yesterday.toISOString().split('T')[0]);

    // Get Meta Ads comparison period data
    const { data: metaComparison } = await supabase
      .schema('marketing')
      .from('meta_ads_campaign_performance')
      .select('impressions, clicks, spend_cents, conversions, ctr')
      .gte('date', comparisonPeriodStart.toISOString().split('T')[0])
      .lte('date', comparisonPeriodEnd.toISOString().split('T')[0]);

    // Get referral analytics data for new customers (use updated referral_data view)
    const { data: currentPeriodNewCustomers } = await supabase
      .from('referral_data')
      .select('*')
      .in('referral_source', ['Google', 'Facebook', 'Instagram'])
      .gte('date', currentPeriodStart.toISOString().split('T')[0])
      .lte('date', yesterday.toISOString().split('T')[0]);

    const { data: comparisonPeriodNewCustomers } = await supabase
      .from('referral_data')
      .select('*')
      .in('referral_source', ['Google', 'Facebook', 'Instagram'])
      .gte('date', comparisonPeriodStart.toISOString().split('T')[0])
      .lte('date', comparisonPeriodEnd.toISOString().split('T')[0]);

    // Get new customer revenue data for ROAS calculations
    const { data: currentGoogleRevenue } = await supabase.rpc('get_new_customer_revenue', {
      start_date: currentPeriodStart.toISOString().split('T')[0],
      end_date: yesterday.toISOString().split('T')[0],
      referral_sources: ['Google']
    });

    const { data: currentMetaRevenue } = await supabase.rpc('get_new_customer_revenue', {
      start_date: currentPeriodStart.toISOString().split('T')[0],
      end_date: yesterday.toISOString().split('T')[0],
      referral_sources: ['Facebook', 'Instagram']
    });

    const { data: comparisonGoogleRevenue } = await supabase.rpc('get_new_customer_revenue', {
      start_date: comparisonPeriodStart.toISOString().split('T')[0],
      end_date: comparisonPeriodEnd.toISOString().split('T')[0],
      referral_sources: ['Google']
    });

    const { data: comparisonMetaRevenue } = await supabase.rpc('get_new_customer_revenue', {
      start_date: comparisonPeriodStart.toISOString().split('T')[0],
      end_date: comparisonPeriodEnd.toISOString().split('T')[0],
      referral_sources: ['Facebook', 'Instagram']
    });

    // Calculate current period totals
    const googleCurrentTotals = googleCurrent?.reduce((acc, curr) => ({
      impressions: acc.impressions + (curr.impressions || 0),
      clicks: acc.clicks + (curr.clicks || 0),
      spend: acc.spend + (Number(curr.cost_micros) / 1000000 || 0),
      conversions: acc.conversions + (Number(curr.conversions) || 0),
      ctr: [...acc.ctr, curr.ctr || 0]
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] as number[] }) || 
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] };

    const metaCurrentTotals = metaCurrent?.reduce((acc, curr) => ({
      impressions: acc.impressions + (curr.impressions || 0),
      clicks: acc.clicks + (curr.clicks || 0),
      spend: acc.spend + (Number(curr.spend_cents) / 100 || 0),
      conversions: acc.conversions + (Number(curr.conversions) || 0),
      ctr: [...acc.ctr, curr.ctr || 0]
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] as number[] }) || 
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] };

    // Calculate comparison period totals
    const googleComparisonTotals = googleComparison?.reduce((acc, curr) => ({
      impressions: acc.impressions + (curr.impressions || 0),
      clicks: acc.clicks + (curr.clicks || 0),
      spend: acc.spend + (Number(curr.cost_micros) / 1000000 || 0),
      conversions: acc.conversions + (Number(curr.conversions) || 0),
      ctr: [...acc.ctr, curr.ctr || 0]
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] as number[] }) || 
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] };

    const metaComparisonTotals = metaComparison?.reduce((acc, curr) => ({
      impressions: acc.impressions + (curr.impressions || 0),
      clicks: acc.clicks + (curr.clicks || 0),
      spend: acc.spend + (Number(curr.spend_cents) / 100 || 0),
      conversions: acc.conversions + (Number(curr.conversions) || 0),
      ctr: [...acc.ctr, curr.ctr || 0]
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] as number[] }) || 
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] };

    // Calculate new customers from referral_data view (current period)
    const googleNewCustomersCurrent = currentPeriodNewCustomers?.filter((r: any) => r.referral_source === 'Google').reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;
    const metaNewCustomersCurrent = currentPeriodNewCustomers?.filter((r: any) => ['Facebook', 'Instagram'].includes(r.referral_source)).reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;
    
    // Calculate new customers from referral_data view (comparison period)
    const googleNewCustomersComparison = comparisonPeriodNewCustomers?.filter((r: any) => r.referral_source === 'Google').reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;
    const metaNewCustomersComparison = comparisonPeriodNewCustomers?.filter((r: any) => ['Facebook', 'Instagram'].includes(r.referral_source)).reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;

    // Variables already defined above using daily referral data

    // Calculate combined totals
    const totalSpendCurrent = googleCurrentTotals.spend + metaCurrentTotals.spend;
    const totalSpendComparison = googleComparisonTotals.spend + metaComparisonTotals.spend;
    
    const totalImpressionsCurrent = googleCurrentTotals.impressions + metaCurrentTotals.impressions;
    const totalImpressionsComparison = googleComparisonTotals.impressions + metaComparisonTotals.impressions;
    
    const totalClicksCurrent = googleCurrentTotals.clicks + metaCurrentTotals.clicks;
    const totalClicksComparison = googleComparisonTotals.clicks + metaComparisonTotals.clicks;
    
    const totalNewCustomersCurrent = googleNewCustomersCurrent + metaNewCustomersCurrent;
    const totalNewCustomersComparison = googleNewCustomersComparison + metaNewCustomersComparison;

    // Calculate average CTR
    const allCurrentCtr = [...googleCurrentTotals.ctr, ...metaCurrentTotals.ctr].filter(ctr => ctr > 0);
    const allComparisonCtr = [...googleComparisonTotals.ctr, ...metaComparisonTotals.ctr].filter(ctr => ctr > 0);
    
    const averageCtrCurrent = allCurrentCtr.length > 0 ? allCurrentCtr.reduce((a, b) => a + b, 0) / allCurrentCtr.length : 0;
    const averageCtrComparison = allComparisonCtr.length > 0 ? allComparisonCtr.reduce((a, b) => a + b, 0) / allComparisonCtr.length : 0;

    // Calculate CAC based on new customers acquired
    const cacCurrent = totalNewCustomersCurrent > 0 ? totalSpendCurrent / totalNewCustomersCurrent : 0;
    const cacComparison = totalNewCustomersComparison > 0 ? totalSpendComparison / totalNewCustomersComparison : 0;
    
    // Calculate ROAS using new customer revenue only
    const currentRevenueTotal = Number(currentGoogleRevenue || 0) + Number(currentMetaRevenue || 0);
    const comparisonRevenueTotal = Number(comparisonGoogleRevenue || 0) + Number(comparisonMetaRevenue || 0);
    
    const roasCurrent = totalSpendCurrent > 0 ? currentRevenueTotal / totalSpendCurrent : 0;
    const roasComparison = totalSpendComparison > 0 ? comparisonRevenueTotal / totalSpendComparison : 0;
    
    // Use new customer revenue as gross profit (since our function returns gross_profit)
    const grossProfitCurrent = currentRevenueTotal;
    const grossProfitComparison = comparisonRevenueTotal;

    // Calculate percentage changes
    const calculateChange = (current: number, comparison: number) => {
      if (comparison === 0) return current > 0 ? 100 : 0;
      return ((current - comparison) / comparison) * 100;
    };

    const kpis: MarketingKPIs = {
      totalSpend: totalSpendCurrent,
      totalSpendChange: calculateChange(totalSpendCurrent, totalSpendComparison),
      totalImpressions: totalImpressionsCurrent,
      totalImpressionsChange: calculateChange(totalImpressionsCurrent, totalImpressionsComparison),
      totalClicks: totalClicksCurrent,
      totalClicksChange: calculateChange(totalClicksCurrent, totalClicksComparison),
      averageCtr: averageCtrCurrent,
      averageCtrChange: calculateChange(averageCtrCurrent, averageCtrComparison),
      totalNewCustomers: totalNewCustomersCurrent,
      totalNewCustomersChange: calculateChange(totalNewCustomersCurrent, totalNewCustomersComparison),
      cac: cacCurrent,
      cacChange: calculateChange(cacCurrent, cacComparison),
      roas: roasCurrent,
      roasChange: calculateChange(roasCurrent, roasComparison),
      customerLifetimeValue: Number(grossProfitCurrent),
      customerLifetimeValueChange: calculateChange(Number(grossProfitCurrent), Number(grossProfitComparison)),
      googleSpend: googleCurrentTotals.spend,
      metaSpend: metaCurrentTotals.spend,
      googleNewCustomers: googleNewCustomersCurrent,
      metaNewCustomers: metaNewCustomersCurrent
    };

    return NextResponse.json(kpis);

  } catch (error) {
    console.error('Marketing overview API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch marketing overview data" },
      { status: 500 }
    );
  }
}