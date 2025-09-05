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
    const sortBy = searchParams.get('sortBy') || 'spend_30d';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const referenceDate = new Date(referenceDateStr);
    
    // Calculate date ranges
    const endDate = referenceDate;
    const startDate90d = new Date(endDate);
    startDate90d.setDate(endDate.getDate() - 89);
    
    const startDate30d = new Date(endDate);
    startDate30d.setDate(endDate.getDate() - 29);
    
    const startDate7d = new Date(endDate);
    startDate7d.setDate(endDate.getDate() - 6);

    // Get campaign performance for all periods
    const [campaigns90d, campaigns30d, campaigns7d] = await Promise.all([
      supabase
        .schema('marketing')
        .rpc('get_meta_campaign_performance', {
          start_date: startDate90d.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        }),
      supabase
        .schema('marketing')
        .rpc('get_meta_campaign_performance', {
          start_date: startDate30d.toISOString().split('T')[0], 
          end_date: endDate.toISOString().split('T')[0]
        }),
      supabase
        .schema('marketing')
        .rpc('get_meta_campaign_performance', {
          start_date: startDate7d.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        })
    ]);

    if (campaigns90d.error) {
      console.error('90d campaign data error:', campaigns90d.error);
      throw new Error('Failed to fetch 90d campaign data');
    }
    if (campaigns30d.error) {
      console.error('30d campaign data error:', campaigns30d.error);
      throw new Error('Failed to fetch 30d campaign data');
    }
    if (campaigns7d.error) {
      console.error('7d campaign data error:', campaigns7d.error);
      throw new Error('Failed to fetch 7d campaign data');
    }

    // Get leads data for all periods
    const [leads90d, leads30d, leads7d] = await Promise.all([
      supabase
        .from('processed_leads')
        .select('form_type, meta_submitted_at, campaign_id')
        .gte('meta_submitted_at', startDate90d.toISOString())
        .lte('meta_submitted_at', endDate.toISOString())
        .eq('is_likely_spam', false),
      supabase
        .from('processed_leads')
        .select('form_type, meta_submitted_at, campaign_id')
        .gte('meta_submitted_at', startDate30d.toISOString())
        .lte('meta_submitted_at', endDate.toISOString())
        .eq('is_likely_spam', false),
      supabase
        .from('processed_leads')
        .select('form_type, meta_submitted_at, campaign_id')
        .gte('meta_submitted_at', startDate7d.toISOString())
        .lte('meta_submitted_at', endDate.toISOString())
        .eq('is_likely_spam', false)
    ]);

    // Get ads for each campaign (30d data for context)
    const { data: adsData, error: adsError } = await supabase
      .schema('marketing')
      .from('meta_ads_campaign_performance')
      .select('campaign_id, ad_id, ad_name, ad_status, spend')
      .gte('date_start', startDate30d.toISOString().split('T')[0])
      .lte('date_stop', endDate.toISOString().split('T')[0]);

    if (adsError) {
      console.error('Ads data error:', adsError);
    }

    // Group ads by campaign
    const adsByCampaign: Record<string, Array<{
      ad_id: string;
      ad_name: string;
      status: string;
      spend_30d: number;
    }>> = {};

    if (adsData) {
      adsData.forEach(ad => {
        if (!adsByCampaign[ad.campaign_id]) {
          adsByCampaign[ad.campaign_id] = [];
        }
        
        const existingAd = adsByCampaign[ad.campaign_id].find(a => a.ad_id === ad.ad_id);
        if (existingAd) {
          existingAd.spend_30d += ad.spend || 0;
        } else {
          adsByCampaign[ad.campaign_id].push({
            ad_id: ad.ad_id,
            ad_name: ad.ad_name,
            status: ad.ad_status,
            spend_30d: ad.spend || 0
          });
        }
      });
    }

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

    // Process campaigns from all periods
    [
      { data: campaigns90d.data, period: '90d' },
      { data: campaigns30d.data, period: '30d' },
      { data: campaigns7d.data, period: '7d' }
    ].forEach(({ data, period }) => {
      if (!data) return;
      
      data.forEach((campaign: any) => {
        if (!campaignMap.has(campaign.campaign_id)) {
          campaignMap.set(campaign.campaign_id, {
            campaign_id: campaign.campaign_id,
            campaign_name: campaign.campaign_name,
            campaign_status: campaign.campaign_status,
            objective: campaign.objective,
            spend_90d: 0,
            spend_30d: 0,
            spend_7d: 0,
            impressions_90d: 0,
            impressions_30d: 0,
            impressions_7d: 0,
            clicks_90d: 0,
            clicks_30d: 0,
            clicks_7d: 0,
            ctr_90d: 0,
            ctr_30d: 0,
            ctr_7d: 0,
            cpc_90d: 0,
            cpc_30d: 0,
            cpc_7d: 0,
            cpm_90d: 0,
            cpm_30d: 0,
            cpm_7d: 0,
            frequency_90d: 0,
            frequency_30d: 0,
            frequency_7d: 0,
            leads_90d: 0,
            leads_30d: 0,
            leads_7d: 0,
            cost_per_lead_90d: 0,
            cost_per_lead_30d: 0,
            cost_per_lead_7d: 0,
            ads: adsByCampaign[campaign.campaign_id] || []
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
        if (period === '90d') {
          campaignData.leads_90d = countLeadsForType(leads90d.data, campaignType);
        } else if (period === '30d') {
          campaignData.leads_30d = countLeadsForType(leads30d.data, campaignType);
        } else if (period === '7d') {
          campaignData.leads_7d = countLeadsForType(leads7d.data, campaignType);
        }
      });
    });

    // Calculate cost per lead for all periods
    campaignMap.forEach((campaign) => {
      if (campaign.leads_90d > 0) {
        campaign.cost_per_lead_90d = campaign.spend_90d / campaign.leads_90d;
      }
      if (campaign.leads_30d > 0) {
        campaign.cost_per_lead_30d = campaign.spend_30d / campaign.leads_30d;
      }
      if (campaign.leads_7d > 0) {
        campaign.cost_per_lead_7d = campaign.spend_7d / campaign.leads_7d;
      }
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
          '90d': `${startDate90d.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
          '30d': `${startDate30d.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
          '7d': `${startDate7d.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        }
      }
    });

  } catch (error) {
    console.error('Detailed campaigns API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch detailed campaign data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}