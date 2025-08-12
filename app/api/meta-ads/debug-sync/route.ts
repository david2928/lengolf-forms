import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
const META_API_VERSION = process.env.META_API_VERSION || 'v23.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
      return NextResponse.json({ 
        error: "Meta Ads API credentials not configured" 
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '2025-08-04';
    const endDate = searchParams.get('endDate') || '2025-08-11';
    const campaignId = searchParams.get('campaignId'); // Test specific campaign

    const debugInfo: any = {
      api_version: META_API_VERSION,
      date_range: { startDate, endDate },
      test_results: []
    };

    // Get campaigns to test
    let campaigns;
    if (campaignId) {
      const { data: singleCampaign } = await supabase
        .schema('marketing')
        .from('meta_ads_campaigns')
        .select('campaign_id, campaign_name, campaign_status')
        .eq('campaign_id', campaignId);
      campaigns = singleCampaign || [];
    } else {
      // Test just active campaigns
      const { data: activeCampaigns } = await supabase
        .schema('marketing')
        .from('meta_ads_campaigns')
        .select('campaign_id, campaign_name, campaign_status')
        .eq('campaign_status', 'active')
        .limit(2); // Test first 2 active campaigns
      campaigns = activeCampaigns || [];
    }

    debugInfo.campaigns_to_test = campaigns.length;

    for (const campaign of campaigns) {
      const campaignDebug: any = {
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        status: campaign.campaign_status
      };

      try {
        // Try to fetch insights for this campaign
        const insightsUrl = `${META_BASE_URL}/${campaign.campaign_id}/insights`;
        const insightsParams = new URLSearchParams({
          access_token: META_ACCESS_TOKEN!,
          fields: 'impressions,clicks,spend,actions,action_values,ctr,cpc,cpm,reach,frequency,unique_clicks,cost_per_unique_click,date_start,date_stop',
          time_range: JSON.stringify({
            since: startDate,
            until: endDate
          }),
          time_increment: '1', // Daily breakdown
          level: 'campaign'
        });

        const fullUrl = `${insightsUrl}?${insightsParams}`;
        campaignDebug.insights_url = fullUrl.replace(META_ACCESS_TOKEN!, '[ACCESS_TOKEN]');

        const insightsResponse = await fetch(fullUrl);
        const insightsData = await insightsResponse.json();

        campaignDebug.response_status = insightsResponse.status;
        campaignDebug.response_ok = insightsResponse.ok;

        if (insightsData.error) {
          campaignDebug.error = insightsData.error;
        } else {
          campaignDebug.insights_count = insightsData.data?.length || 0;
          campaignDebug.sample_insight = insightsData.data?.[0] || null;
          
          if (insightsData.data && insightsData.data.length > 0) {
            const insight = insightsData.data[0];
            campaignDebug.sample_parsed = {
              date: insight.date_start,
              impressions: insight.impressions,
              clicks: insight.clicks,
              spend: insight.spend,
              actions: insight.actions?.length || 0,
              action_values: insight.action_values?.length || 0,
              ctr: insight.ctr,
              cpc: insight.cpc
            };
          }
        }

        debugInfo.test_results.push(campaignDebug);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        campaignDebug.fetch_error = error instanceof Error ? error.message : 'Unknown error';
        debugInfo.test_results.push(campaignDebug);
      }
    }

    return NextResponse.json({
      success: true,
      debug_info: debugInfo
    });

  } catch (error) {
    console.error('Meta Ads debug sync error:', error);
    return NextResponse.json({
      error: "Failed to debug Meta Ads sync",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}