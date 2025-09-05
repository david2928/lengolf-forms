import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referenceDateStr = searchParams.get('referenceDate') || new Date().toISOString().split('T')[0];
    const sortBy = searchParams.get('sortBy') || 'spend_current';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const referenceDate = new Date(referenceDateStr);
    
    // Calculate weekly date ranges
    // Current week: ends at reference date
    const currentWeekEnd = referenceDate;
    const currentWeekStart = new Date(currentWeekEnd);
    currentWeekStart.setDate(currentWeekEnd.getDate() - 6); // 7 days total
    
    // Previous week: week before current
    const previousWeekEnd = new Date(currentWeekStart);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);
    const previousWeekStart = new Date(previousWeekEnd);
    previousWeekStart.setDate(previousWeekEnd.getDate() - 6);
    
    // 3 weeks ago
    const threeWeeksAgoEnd = new Date(previousWeekStart);
    threeWeeksAgoEnd.setDate(threeWeeksAgoEnd.getDate() - 1);
    const threeWeeksAgoStart = new Date(threeWeeksAgoEnd);
    threeWeeksAgoStart.setDate(threeWeeksAgoEnd.getDate() - 6);
    
    // 4 weeks ago
    const fourWeeksAgoEnd = new Date(threeWeeksAgoStart);
    fourWeeksAgoEnd.setDate(fourWeeksAgoEnd.getDate() - 1);
    const fourWeeksAgoStart = new Date(fourWeeksAgoEnd);
    fourWeeksAgoStart.setDate(fourWeeksAgoEnd.getDate() - 6);
    
    // 5 weeks ago
    const fiveWeeksAgoEnd = new Date(fourWeeksAgoStart);
    fiveWeeksAgoEnd.setDate(fiveWeeksAgoEnd.getDate() - 1);
    const fiveWeeksAgoStart = new Date(fiveWeeksAgoEnd);
    fiveWeeksAgoStart.setDate(fiveWeeksAgoEnd.getDate() - 6);

    // Calculate monthly date ranges
    // Month to date: from start of current month to reference date
    const mtdStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const mtdEnd = referenceDate;
    
    // Last month: full previous month
    const lastMonthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const lastMonthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0); // Last day of previous month
    
    // 2 months ago: full month before last month
    const twoMonthsAgoStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 2, 1);
    const twoMonthsAgoEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 0); // Last day of 2 months ago

    // Get campaign performance for all weekly periods
    const [campaignsCurrent, campaignsPrevious, campaigns3w, campaigns4w, campaigns5w] = await Promise.all([
      supabase
        .schema('marketing')
        .rpc('get_meta_campaign_performance', {
          start_date: currentWeekStart.toISOString().split('T')[0],
          end_date: currentWeekEnd.toISOString().split('T')[0]
        }),
      supabase
        .schema('marketing')
        .rpc('get_meta_campaign_performance', {
          start_date: previousWeekStart.toISOString().split('T')[0], 
          end_date: previousWeekEnd.toISOString().split('T')[0]
        }),
      supabase
        .schema('marketing')
        .rpc('get_meta_campaign_performance', {
          start_date: threeWeeksAgoStart.toISOString().split('T')[0],
          end_date: threeWeeksAgoEnd.toISOString().split('T')[0]
        }),
      supabase
        .schema('marketing')
        .rpc('get_meta_campaign_performance', {
          start_date: fourWeeksAgoStart.toISOString().split('T')[0],
          end_date: fourWeeksAgoEnd.toISOString().split('T')[0]
        }),
      supabase
        .schema('marketing')
        .rpc('get_meta_campaign_performance', {
          start_date: fiveWeeksAgoStart.toISOString().split('T')[0],
          end_date: fiveWeeksAgoEnd.toISOString().split('T')[0]
        })
    ]);

    // Get campaign performance for all monthly periods
    const [campaignsMTD, campaignsLastMonth, campaigns2MonthsAgo] = await Promise.all([
      supabase
        .schema('marketing')
        .rpc('get_meta_campaign_performance', {
          start_date: mtdStart.toISOString().split('T')[0],
          end_date: mtdEnd.toISOString().split('T')[0]
        }),
      supabase
        .schema('marketing')
        .rpc('get_meta_campaign_performance', {
          start_date: lastMonthStart.toISOString().split('T')[0],
          end_date: lastMonthEnd.toISOString().split('T')[0]
        }),
      supabase
        .schema('marketing')
        .rpc('get_meta_campaign_performance', {
          start_date: twoMonthsAgoStart.toISOString().split('T')[0],
          end_date: twoMonthsAgoEnd.toISOString().split('T')[0]
        })
    ]);

    // Check for errors (weekly and monthly)
    const weeklyErrors = [campaignsCurrent, campaignsPrevious, campaigns3w, campaigns4w, campaigns5w];
    weeklyErrors.forEach((result, index) => {
      if (result.error) {
        console.error(`Week ${index} campaign data error:`, result.error);
        throw new Error(`Failed to fetch week ${index} campaign data`);
      }
    });
    
    const monthlyErrors = [campaignsMTD, campaignsLastMonth, campaigns2MonthsAgo];
    monthlyErrors.forEach((result, index) => {
      if (result.error) {
        console.error(`Month ${index} campaign data error:`, result.error);
        throw new Error(`Failed to fetch month ${index} campaign data`);
      }
    });

    // Get leads data for all weekly periods
    const [leadsCurrent, leadsPrevious, leads3w, leads4w, leads5w] = await Promise.all([
      supabase
        .from('processed_leads')
        .select('form_type, meta_submitted_at, campaign_id')
        .gte('meta_submitted_at', currentWeekStart.toISOString())
        .lte('meta_submitted_at', currentWeekEnd.toISOString())
        .eq('is_likely_spam', false),
      supabase
        .from('processed_leads')
        .select('form_type, meta_submitted_at, campaign_id')
        .gte('meta_submitted_at', previousWeekStart.toISOString())
        .lte('meta_submitted_at', previousWeekEnd.toISOString())
        .eq('is_likely_spam', false),
      supabase
        .from('processed_leads')
        .select('form_type, meta_submitted_at, campaign_id')
        .gte('meta_submitted_at', threeWeeksAgoStart.toISOString())
        .lte('meta_submitted_at', threeWeeksAgoEnd.toISOString())
        .eq('is_likely_spam', false),
      supabase
        .from('processed_leads')
        .select('form_type, meta_submitted_at, campaign_id')
        .gte('meta_submitted_at', fourWeeksAgoStart.toISOString())
        .lte('meta_submitted_at', fourWeeksAgoEnd.toISOString())
        .eq('is_likely_spam', false),
      supabase
        .from('processed_leads')
        .select('form_type, meta_submitted_at, campaign_id')
        .gte('meta_submitted_at', fiveWeeksAgoStart.toISOString())
        .lte('meta_submitted_at', fiveWeeksAgoEnd.toISOString())
        .eq('is_likely_spam', false)
    ]);

    // Get leads data for all monthly periods
    const [leadsMTD, leadsLastMonth, leads2MonthsAgo] = await Promise.all([
      supabase
        .from('processed_leads')
        .select('form_type, meta_submitted_at, campaign_id')
        .gte('meta_submitted_at', mtdStart.toISOString())
        .lte('meta_submitted_at', mtdEnd.toISOString())
        .eq('is_likely_spam', false),
      supabase
        .from('processed_leads')
        .select('form_type, meta_submitted_at, campaign_id')
        .gte('meta_submitted_at', lastMonthStart.toISOString())
        .lte('meta_submitted_at', lastMonthEnd.toISOString())
        .eq('is_likely_spam', false),
      supabase
        .from('processed_leads')
        .select('form_type, meta_submitted_at, campaign_id')
        .gte('meta_submitted_at', twoMonthsAgoStart.toISOString())
        .lte('meta_submitted_at', twoMonthsAgoEnd.toISOString())
        .eq('is_likely_spam', false)
    ]);

    // Helper function to get campaign type for lead assignment
    const getCampaignType = (campaignName: string, objective: string): 'B2C' | 'B2B' | 'Other' => {
      const name = campaignName.toLowerCase();
      if (objective === 'OUTCOME_LEADS' || name.includes('lead')) {
        if (name.includes('b2b')) return 'B2B';
        if (name.includes('b2c') || name.includes('gl:lead')) return 'B2C';
      }
      return 'Other';
    };

    // Helper function to count leads for a campaign type in a period
    const countLeadsForType = (leadsData: any[] | null, campaignType: 'B2C' | 'B2B' | 'Other') => {
      if (campaignType === 'Other' || !leadsData) return 0;
      
      return leadsData?.filter(lead => {
        if (campaignType === 'B2C') {
          return lead.form_type?.includes('B2C') || lead.form_type === 'Instagram Ad' || !lead.form_type;
        } else if (campaignType === 'B2B') {
          return lead.form_type?.includes('B2B');
        }
        return false;
      }).length || 0;
    };

    // Create combined campaign data by merging all periods
    const campaignMap = new Map();

    // Process campaigns from all periods (weekly and monthly)
    [
      { data: campaignsCurrent.data, period: 'current', leads: leadsCurrent.data },
      { data: campaignsPrevious.data, period: 'previous', leads: leadsPrevious.data },
      { data: campaigns3w.data, period: '3w_ago', leads: leads3w.data },
      { data: campaigns4w.data, period: '4w_ago', leads: leads4w.data },
      { data: campaigns5w.data, period: '5w_ago', leads: leads5w.data },
      { data: campaignsMTD.data, period: 'mtd', leads: leadsMTD.data },
      { data: campaignsLastMonth.data, period: 'last_month', leads: leadsLastMonth.data },
      { data: campaigns2MonthsAgo.data, period: '2_months_ago', leads: leads2MonthsAgo.data }
    ].forEach(({ data, period, leads }) => {
      if (!data) return;
      
      data.forEach((campaign: any) => {
        if (!campaignMap.has(campaign.campaign_id)) {
          campaignMap.set(campaign.campaign_id, {
            campaign_id: campaign.campaign_id,
            campaign_name: campaign.campaign_name,
            campaign_status: campaign.campaign_status,
            objective: campaign.objective,
            spend_current: 0,
            spend_previous: 0,
            spend_3w_ago: 0,
            spend_4w_ago: 0,
            spend_5w_ago: 0,
            spend_mtd: 0,
            spend_last_month: 0,
            spend_2_months_ago: 0,
            impressions_current: 0,
            impressions_previous: 0,
            impressions_3w_ago: 0,
            impressions_4w_ago: 0,
            impressions_5w_ago: 0,
            impressions_mtd: 0,
            impressions_last_month: 0,
            impressions_2_months_ago: 0,
            clicks_current: 0,
            clicks_previous: 0,
            clicks_3w_ago: 0,
            clicks_4w_ago: 0,
            clicks_5w_ago: 0,
            clicks_mtd: 0,
            clicks_last_month: 0,
            clicks_2_months_ago: 0,
            ctr_current: 0,
            ctr_previous: 0,
            ctr_3w_ago: 0,
            ctr_4w_ago: 0,
            ctr_5w_ago: 0,
            ctr_mtd: 0,
            ctr_last_month: 0,
            ctr_2_months_ago: 0,
            cpc_current: 0,
            cpc_previous: 0,
            cpc_3w_ago: 0,
            cpc_4w_ago: 0,
            cpc_5w_ago: 0,
            cpc_mtd: 0,
            cpc_last_month: 0,
            cpc_2_months_ago: 0,
            cpm_current: 0,
            cpm_previous: 0,
            cpm_3w_ago: 0,
            cpm_4w_ago: 0,
            cpm_5w_ago: 0,
            cpm_mtd: 0,
            cpm_last_month: 0,
            cpm_2_months_ago: 0,
            frequency_current: 0,
            frequency_previous: 0,
            frequency_3w_ago: 0,
            frequency_4w_ago: 0,
            frequency_5w_ago: 0,
            frequency_mtd: 0,
            frequency_last_month: 0,
            frequency_2_months_ago: 0,
            leads_current: 0,
            leads_previous: 0,
            leads_3w_ago: 0,
            leads_4w_ago: 0,
            leads_5w_ago: 0,
            leads_mtd: 0,
            leads_last_month: 0,
            leads_2_months_ago: 0,
            cost_per_lead_current: 0,
            cost_per_lead_previous: 0,
            cost_per_lead_3w_ago: 0,
            cost_per_lead_4w_ago: 0,
            cost_per_lead_5w_ago: 0,
            cost_per_lead_mtd: 0,
            cost_per_lead_last_month: 0,
            cost_per_lead_2_months_ago: 0
          });
        }
        
        const campaignData = campaignMap.get(campaign.campaign_id);
        const campaignType = getCampaignType(campaign.campaign_name, campaign.objective);
        
        // Update metrics for this period
        campaignData[`spend_${period}`] = campaign.total_spend_cents ? campaign.total_spend_cents / 100 : 0;
        campaignData[`impressions_${period}`] = campaign.total_impressions || 0;
        campaignData[`clicks_${period}`] = campaign.total_clicks || 0;
        campaignData[`ctr_${period}`] = Number(campaign.avg_ctr) || 0;
        
        // Convert cents to currency
        campaignData[`cpc_${period}`] = campaign.avg_cpc_cents ? campaign.avg_cpc_cents / 100 : 0;
        campaignData[`cpm_${period}`] = campaign.avg_cpm_cents ? campaign.avg_cpm_cents / 100 : 0;
        campaignData[`frequency_${period}`] = Number(campaign.avg_frequency) || 0;
        
        // Calculate leads for this campaign type and period
        campaignData[`leads_${period}`] = countLeadsForType(leads, campaignType);
      });
    });

    // Calculate cost per lead for all periods
    campaignMap.forEach((campaign) => {
      ['current', 'previous', '3w_ago', '4w_ago', '5w_ago', 'mtd', 'last_month', '2_months_ago'].forEach(period => {
        const leads = campaign[`leads_${period}`];
        const spend = campaign[`spend_${period}`];
        if (leads > 0) {
          campaign[`cost_per_lead_${period}`] = spend / leads;
        }
      });
    });

    // Convert to array and sort
    let campaigns = Array.from(campaignMap.values());
    
    // Apply sorting
    campaigns.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a] || 0;
      const bVal = b[sortBy as keyof typeof b] || 0;
      
      if (sortOrder === 'desc') {
        return Number(bVal) - Number(aVal);
      } else {
        return Number(aVal) - Number(bVal);
      }
    });

    return NextResponse.json({
      campaigns,
      meta: {
        total: campaigns.length,
        periods: {
          current: `${currentWeekStart.toISOString().split('T')[0]} to ${currentWeekEnd.toISOString().split('T')[0]}`,
          previous: `${previousWeekStart.toISOString().split('T')[0]} to ${previousWeekEnd.toISOString().split('T')[0]}`,
          '3w_ago': `${threeWeeksAgoStart.toISOString().split('T')[0]} to ${threeWeeksAgoEnd.toISOString().split('T')[0]}`,
          '4w_ago': `${fourWeeksAgoStart.toISOString().split('T')[0]} to ${fourWeeksAgoEnd.toISOString().split('T')[0]}`,
          '5w_ago': `${fiveWeeksAgoStart.toISOString().split('T')[0]} to ${fiveWeeksAgoEnd.toISOString().split('T')[0]}`,
          mtd: `${mtdStart.toISOString().split('T')[0]} to ${mtdEnd.toISOString().split('T')[0]}`,
          last_month: `${lastMonthStart.toISOString().split('T')[0]} to ${lastMonthEnd.toISOString().split('T')[0]}`,
          '2_months_ago': `${twoMonthsAgoStart.toISOString().split('T')[0]} to ${twoMonthsAgoEnd.toISOString().split('T')[0]}`
        }
      }
    });

  } catch (error) {
    console.error('Detailed weekly campaigns API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch detailed weekly campaign data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}