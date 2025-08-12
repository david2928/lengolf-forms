import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

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
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const adsetId = searchParams.get('adsetId'); // Optional filter by adset
    const campaignId = searchParams.get('campaignId'); // Optional filter by campaign

    try {
      // First fetch ads with creative information
      const adsUrl = `${META_BASE_URL}/act_${META_AD_ACCOUNT_ID}/ads`;
      const adsParams = new URLSearchParams({
        access_token: META_ACCESS_TOKEN,
        fields: `id,name,status,adset_id,campaign_id,creative{id,title,body,image_url,thumbnail_url,call_to_action_type,object_story_spec}`,
        limit: '100'
      });

      // Add filters if specified
      if (adsetId) {
        adsParams.append('filtering', `[{"field":"adset.id","operator":"EQUAL","value":"${adsetId}"}]`);
      } else if (campaignId) {
        adsParams.append('filtering', `[{"field":"campaign.id","operator":"EQUAL","value":"${campaignId}"}]`);
      }

      const adsResponse = await fetch(`${adsUrl}?${adsParams}`);
      const adsData = await adsResponse.json();

      if (adsData.error) {
        return NextResponse.json({
          error: "Meta API Error",
          details: adsData.error.message
        }, { status: 400 });
      }

      const ads = adsData.data || [];

      // Now fetch insights for each ad
      const processedAds = await Promise.all(ads.map(async (ad: any) => {
        const creative = ad.creative || {};
        
        // Fetch insights for this specific ad
        let insights: any = {};
        try {
          const insightsUrl = `${META_BASE_URL}/${ad.id}/insights`;
          const insightsParams = new URLSearchParams({
            access_token: META_ACCESS_TOKEN,
            fields: 'impressions,clicks,spend,actions,action_values,ctr,cpc,cpm,reach,frequency,unique_clicks,cost_per_unique_click',
            time_range: JSON.stringify({ since: startDate, until: endDate })
          });
          
          const insightsResponse = await fetch(`${insightsUrl}?${insightsParams}`);
          const insightsData = await insightsResponse.json();
          
          if (insightsData.data && insightsData.data.length > 0) {
            insights = insightsData.data[0];
          }
        } catch (error) {
          console.warn(`Failed to fetch insights for ad ${ad.id}:`, error);
        }
        
        // Extract conversions from actions array
        let conversions = 0;
        let conversionValue = 0;
        
        if (insights.actions && Array.isArray(insights.actions)) {
          insights.actions.forEach((action: any) => {
            if (action.action_type && (
              action.action_type.includes('conversion') ||
              action.action_type.includes('purchase') ||
              action.action_type.includes('lead') ||
              action.action_type === 'offsite_conversion'
            )) {
              conversions += parseFloat(action.value || '0');
            }
          });
        }

        if (insights.action_values && Array.isArray(insights.action_values)) {
          insights.action_values.forEach((actionValue: any) => {
            if (actionValue.action_type && actionValue.action_type.includes('conversion')) {
              conversionValue += parseFloat(actionValue.value || '0');
            }
          });
        }

        // Extract image info from object_story_spec
        let imageUrl = creative.thumbnail_url || creative.image_url;
        let videoUrl = null;
        let carouselImages = [];

        if (creative.object_story_spec) {
          const story = creative.object_story_spec;
          
          // Video ads
          if (story.video_data) {
            imageUrl = story.video_data.image_url || imageUrl;
            videoUrl = `https://facebook.com/video.php?id=${story.video_data.video_id}`;
          }
          
          // Carousel/multi-image ads
          if (story.link_data?.child_attachments) {
            carouselImages = story.link_data.child_attachments.map((attachment: any) => ({
              image_hash: attachment.image_hash,
              name: attachment.name
            }));
          }
          
          // Single image ads
          if (story.link_data?.image_hash) {
            imageUrl = `https://www.facebook.com/ads/image/?d=${story.link_data.image_hash}`;
          }
        }

        const spend = parseFloat(insights.spend || '0');
        const clicks = parseInt(insights.clicks || '0');
        const impressions = parseInt(insights.impressions || '0');

        return {
          ad_id: ad.id,
          ad_name: ad.name,
          ad_status: ad.status,
          adset_id: ad.adset_id,
          campaign_id: ad.campaign_id,
          
          // Creative information
          creative_id: creative.id,
          title: creative.title,
          body: creative.body,
          call_to_action: creative.call_to_action_type,
          image_url: imageUrl,
          video_url: videoUrl,
          carousel_images: carouselImages,
          
          // Performance metrics
          impressions,
          clicks,
          spend_thb: parseFloat(spend.toFixed(2)),
          conversions,
          conversion_value_thb: parseFloat((conversionValue).toFixed(2)),
          ctr: parseFloat(insights.ctr || '0').toFixed(2),
          cpc: parseFloat(insights.cpc || '0').toFixed(2),
          cpm: parseFloat(insights.cpm || '0').toFixed(2),
          reach: parseInt(insights.reach || '0'),
          frequency: parseFloat(insights.frequency || '0').toFixed(2),
          unique_clicks: parseInt(insights.unique_clicks || '0'),
          cost_per_unique_click: parseFloat(insights.cost_per_unique_click || '0').toFixed(2),
          conversion_rate: clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : '0.00',
          cost_per_conversion: conversions > 0 ? (spend / conversions).toFixed(2) : '0.00'
        };
      }));

      // Sort by spend descending
      processedAds.sort((a: any, b: any) => b.spend_thb - a.spend_thb);

      // Calculate summary statistics
      const summary = {
        total_ads: processedAds.length,
        total_impressions: processedAds.reduce((sum: number, a: any) => sum + a.impressions, 0),
        total_clicks: processedAds.reduce((sum: number, a: any) => sum + a.clicks, 0),
        total_spend: parseFloat(processedAds.reduce((sum: number, a: any) => sum + a.spend_thb, 0).toFixed(2)),
        total_conversions: processedAds.reduce((sum: number, a: any) => sum + a.conversions, 0),
        average_ctr: processedAds.length > 0 ? 
          (processedAds.reduce((sum: number, a: any) => sum + parseFloat(a.ctr), 0) / processedAds.length).toFixed(2) : '0.00',
        average_conversion_rate: processedAds.length > 0 ? 
          (processedAds.reduce((sum: number, a: any) => sum + parseFloat(a.conversion_rate), 0) / processedAds.length).toFixed(2) : '0.00'
      };

      return NextResponse.json({
        success: true,
        type: "ad_creatives_performance",
        period: { startDate, endDate },
        data: processedAds,
        summary,
        filters: { adsetId, campaignId }
      });

    } catch (error) {
      console.error('Meta Ads ad creatives error:', error);
      return NextResponse.json({
        error: "Failed to fetch Meta Ads creative data",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Meta Ads ad creatives error:', error);
    return NextResponse.json({
      error: "Failed to fetch Meta Ads creative data",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}