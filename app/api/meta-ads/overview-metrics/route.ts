import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface MetaAdsKPIs {
  // Core metrics from simple plan
  totalSpend: number;
  metaBookings: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  conversions: number;
  costPerBooking: number;
  costPerConversion: number;
  
  // Platform breakdown
  facebookSpend: number;
  instagramSpend: number;
  facebookBookings: number;
  instagramBookings: number;
  facebookImpressions: number;
  instagramImpressions: number;
  facebookClicks: number;
  instagramClicks: number;
  
  // Trend indicators (30d comparison)
  spendChange: number;
  bookingsChange: number;
  impressionsChange: number;
  clicksChange: number;
  ctrChange: number;
  conversionsChange: number;
  costPerBookingChange: number;
  costPerConversionChange: number;
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
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const referenceDate = referenceDateParam ? new Date(referenceDateParam) : yesterday;
    const endDate = referenceDate;
    
    const currentPeriodStart = new Date(endDate);
    currentPeriodStart.setDate(endDate.getDate() - days + 1);
    
    // Get comparison period data
    const comparisonPeriodEnd = new Date(currentPeriodStart);
    comparisonPeriodEnd.setDate(currentPeriodStart.getDate() - 1);
    
    const comparisonPeriodStart = new Date(comparisonPeriodEnd);
    comparisonPeriodStart.setDate(comparisonPeriodEnd.getDate() - comparisonDays + 1);

    console.log('Meta Ads API - Date ranges:', {
      currentPeriodStart: currentPeriodStart.toISOString().split('T')[0],
      currentPeriodEnd: endDate.toISOString().split('T')[0],
      comparisonPeriodStart: comparisonPeriodStart.toISOString().split('T')[0],
      comparisonPeriodEnd: comparisonPeriodEnd.toISOString().split('T')[0]
    });

    // Get Meta Ads current period data using RPC
    const { data: metaCurrent, error: metaCurrentError } = await supabase
      .schema('marketing')
      .rpc('get_meta_ads_performance', {
        start_date: currentPeriodStart.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

    if (metaCurrentError) {
      console.error('Meta Ads current period RPC error:', metaCurrentError);
    }

    // Get Meta Ads comparison period data using RPC
    const { data: metaComparison, error: metaComparisonError } = await supabase
      .schema('marketing')
      .rpc('get_meta_ads_performance', {
        start_date: comparisonPeriodStart.toISOString().split('T')[0],
        end_date: comparisonPeriodEnd.toISOString().split('T')[0]
      });

    if (metaComparisonError) {
      console.error('Meta Ads comparison period RPC error:', metaComparisonError);
    }

    // Get Meta bookings from referral_source (current period)
    const { data: currentPeriodBookings, error: currentBookingsError } = await supabase
      .from('bookings')
      .select('referral_source')
      .in('referral_source', ['Facebook', 'Instagram'])
      .gte('date', currentPeriodStart.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .eq('status', 'confirmed');

    if (currentBookingsError) {
      console.error('Current period bookings query error:', currentBookingsError);
    }

    // Get Meta bookings from referral_source (comparison period)
    const { data: comparisonPeriodBookings, error: comparisonBookingsError } = await supabase
      .from('bookings')
      .select('referral_source')
      .in('referral_source', ['Facebook', 'Instagram'])
      .gte('date', comparisonPeriodStart.toISOString().split('T')[0])
      .lte('date', comparisonPeriodEnd.toISOString().split('T')[0])
      .eq('status', 'confirmed');

    if (comparisonBookingsError) {
      console.error('Comparison period bookings query error:', comparisonBookingsError);
    }

    // Calculate current period totals with platform breakdown using RPC data
    const metaCurrentTotals = metaCurrent?.reduce((acc: any, curr: any) => {
      const impressions = Number(curr.impressions) || 0;
      const clicks = Number(curr.clicks) || 0;
      const spend = Number(curr.spend_cents) / 100 || 0;
      const ctr = Number(curr.ctr) || 0;
      const platform = curr.platform;
      const platformSplit = Number(curr.platform_split) || 1;
      
      const result = {
        impressions: acc.impressions + impressions,
        clicks: acc.clicks + clicks,
        spend: acc.spend + spend,
        ctr: [...acc.ctr, ctr],
        
        facebookImpressions: acc.facebookImpressions,
        facebookClicks: acc.facebookClicks,
        facebookSpend: acc.facebookSpend,
        instagramImpressions: acc.instagramImpressions,
        instagramClicks: acc.instagramClicks,
        instagramSpend: acc.instagramSpend
      };
      
      // Distribute metrics based on platform and split
      if (platform === 'facebook') {
        // Facebook only
        result.facebookImpressions += impressions;
        result.facebookClicks += clicks;
        result.facebookSpend += spend;
      } else if (platform === 'instagram') {
        // Instagram only (rare)
        result.instagramImpressions += impressions;
        result.instagramClicks += clicks;
        result.instagramSpend += spend;
      } else if (platform === 'both') {
        // Both platforms - split according to platformSplit (should be 0.5)
        result.facebookImpressions += impressions * platformSplit;
        result.facebookClicks += clicks * platformSplit;
        result.facebookSpend += spend * platformSplit;
        
        result.instagramImpressions += impressions * platformSplit;
        result.instagramClicks += clicks * platformSplit;
        result.instagramSpend += spend * platformSplit;
      }
      
      return result;
    }, { 
      impressions: 0, clicks: 0, spend: 0, ctr: [] as number[],
      facebookImpressions: 0, facebookClicks: 0, facebookSpend: 0,
      instagramImpressions: 0, instagramClicks: 0, instagramSpend: 0
    }) || { 
      impressions: 0, clicks: 0, spend: 0, ctr: [],
      facebookImpressions: 0, facebookClicks: 0, facebookSpend: 0,
      instagramImpressions: 0, instagramClicks: 0, instagramSpend: 0
    };

    // Calculate comparison period totals with platform breakdown using RPC data
    const metaComparisonTotals = metaComparison?.reduce((acc: any, curr: any) => {
      const impressions = Number(curr.impressions) || 0;
      const clicks = Number(curr.clicks) || 0;
      const spend = Number(curr.spend_cents) / 100 || 0;
      const ctr = Number(curr.ctr) || 0;
      const platform = curr.platform;
      const platformSplit = Number(curr.platform_split) || 1;
      
      const result = {
        impressions: acc.impressions + impressions,
        clicks: acc.clicks + clicks,
        spend: acc.spend + spend,
        ctr: [...acc.ctr, ctr],
        
        facebookImpressions: acc.facebookImpressions,
        facebookClicks: acc.facebookClicks,
        facebookSpend: acc.facebookSpend,
        instagramImpressions: acc.instagramImpressions,
        instagramClicks: acc.instagramClicks,
        instagramSpend: acc.instagramSpend
      };
      
      // Distribute metrics based on platform and split
      if (platform === 'facebook') {
        result.facebookImpressions += impressions;
        result.facebookClicks += clicks;
        result.facebookSpend += spend;
      } else if (platform === 'instagram') {
        result.instagramImpressions += impressions;
        result.instagramClicks += clicks;
        result.instagramSpend += spend;
      } else if (platform === 'both') {
        result.facebookImpressions += impressions * platformSplit;
        result.facebookClicks += clicks * platformSplit;
        result.facebookSpend += spend * platformSplit;
        
        result.instagramImpressions += impressions * platformSplit;
        result.instagramClicks += clicks * platformSplit;
        result.instagramSpend += spend * platformSplit;
      }
      
      return result;
    }, { 
      impressions: 0, clicks: 0, spend: 0, ctr: [] as number[],
      facebookImpressions: 0, facebookClicks: 0, facebookSpend: 0,
      instagramImpressions: 0, instagramClicks: 0, instagramSpend: 0
    }) || { 
      impressions: 0, clicks: 0, spend: 0, ctr: [],
      facebookImpressions: 0, facebookClicks: 0, facebookSpend: 0,
      instagramImpressions: 0, instagramClicks: 0, instagramSpend: 0
    };

    // Calculate Meta bookings with platform breakdown
    const facebookBookingsCurrent = currentPeriodBookings?.filter(b => b.referral_source === 'Facebook').length || 0;
    const instagramBookingsCurrent = currentPeriodBookings?.filter(b => b.referral_source === 'Instagram').length || 0;
    const metaBookingsCurrent = facebookBookingsCurrent + instagramBookingsCurrent;
    
    const facebookBookingsComparison = comparisonPeriodBookings?.filter(b => b.referral_source === 'Facebook').length || 0;
    const instagramBookingsComparison = comparisonPeriodBookings?.filter(b => b.referral_source === 'Instagram').length || 0;
    const metaBookingsComparison = facebookBookingsComparison + instagramBookingsComparison;

    // Calculate average CTR (weighted by impressions would be better, but simple average for now)
    const averageCtrCurrent = metaCurrentTotals.ctr.length > 0 
      ? metaCurrentTotals.ctr.reduce((a: number, b: number) => a + b, 0) / metaCurrentTotals.ctr.length 
      : 0;
    const averageCtrComparison = metaComparisonTotals.ctr.length > 0 
      ? metaComparisonTotals.ctr.reduce((a: number, b: number) => a + b, 0) / metaComparisonTotals.ctr.length 
      : 0;

    // Calculate cost per booking and conversion
    const costPerBookingCurrent = metaBookingsCurrent > 0 ? metaCurrentTotals.spend / metaBookingsCurrent : 0;
    const costPerBookingComparison = metaBookingsComparison > 0 ? metaComparisonTotals.spend / metaBookingsComparison : 0;
    
    // Use Meta bookings as conversions (new customers are our conversions)
    const costPerConversionCurrent = metaBookingsCurrent > 0 ? metaCurrentTotals.spend / metaBookingsCurrent : 0;
    const costPerConversionComparison = metaBookingsComparison > 0 ? metaComparisonTotals.spend / metaBookingsComparison : 0;

    // Calculate percentage changes
    const calculateChange = (current: number, comparison: number) => {
      if (comparison === 0) return current > 0 ? 100 : 0;
      return ((current - comparison) / comparison) * 100;
    };

    const kpis: MetaAdsKPIs = {
      totalSpend: metaCurrentTotals.spend,
      metaBookings: metaBookingsCurrent,
      totalImpressions: metaCurrentTotals.impressions,
      totalClicks: metaCurrentTotals.clicks,
      averageCtr: averageCtrCurrent,
      conversions: metaBookingsCurrent, // Use Meta bookings as conversions
      costPerBooking: costPerBookingCurrent,
      costPerConversion: costPerConversionCurrent,
      
      // Platform breakdown
      facebookSpend: metaCurrentTotals.facebookSpend,
      instagramSpend: metaCurrentTotals.instagramSpend,
      facebookBookings: facebookBookingsCurrent,
      instagramBookings: instagramBookingsCurrent,
      facebookImpressions: metaCurrentTotals.facebookImpressions,
      instagramImpressions: metaCurrentTotals.instagramImpressions,
      facebookClicks: metaCurrentTotals.facebookClicks,
      instagramClicks: metaCurrentTotals.instagramClicks,

      spendChange: calculateChange(metaCurrentTotals.spend, metaComparisonTotals.spend),
      bookingsChange: calculateChange(metaBookingsCurrent, metaBookingsComparison),
      impressionsChange: calculateChange(metaCurrentTotals.impressions, metaComparisonTotals.impressions),
      clicksChange: calculateChange(metaCurrentTotals.clicks, metaComparisonTotals.clicks),
      ctrChange: calculateChange(averageCtrCurrent, averageCtrComparison),
      conversionsChange: calculateChange(metaBookingsCurrent, metaBookingsComparison),
      costPerBookingChange: calculateChange(costPerBookingCurrent, costPerBookingComparison),
      costPerConversionChange: calculateChange(costPerConversionCurrent, costPerConversionComparison)
    };

    console.log('Meta Ads KPIs calculated:', {
      spend: kpis.totalSpend,
      bookings: kpis.metaBookings,
      impressions: kpis.totalImpressions,
      clicks: kpis.totalClicks,
      facebookSpend: kpis.facebookSpend,
      instagramSpend: kpis.instagramSpend,
      facebookBookings: kpis.facebookBookings,
      instagramBookings: kpis.instagramBookings,
      totalRecords: metaCurrent?.length || 0
    });

    return NextResponse.json(kpis);

  } catch (error) {
    console.error('Meta Ads overview API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch Meta Ads overview data" },
      { status: 500 }
    );
  }
}