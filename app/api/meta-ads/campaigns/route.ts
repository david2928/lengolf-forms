import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  objective: string;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  average_ctr: number;
  average_cpc: number;
  average_cpm: number;
  average_frequency: number;
  reach: number;
  performance_score: number; // 0-100 objective-based score
  efficiency_rating: 'Excellent' | 'Good' | 'Average' | 'Needs Review';
  budget_recommendation: 'Scale Up' | 'Maintain' | 'Scale Down' | 'Pause';
  // Lead tracking for LEADS campaigns
  actual_leads: number;
  cost_per_lead: number;
  date_range: {
    start: string;
    end: string;
  };
  trends: {
    ctr_7d: number;
    ctr_30d: number;
    ctr_90d: number;
    cpc_7d: number;
    cpc_30d: number;
    cpc_90d: number;
    frequency_trend: 'Rising' | 'Stable' | 'Declining';
  };
  // Parsed campaign details
  parsed_info?: {
    course_type?: string;
    target_audience?: string;
    promotion_type?: string;
  };
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
    const sortBy = searchParams.get('sortBy') || 'total_spend';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get reference date (exclude today unless specific date provided)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const referenceDate = referenceDateParam ? new Date(referenceDateParam) : yesterday;
    const endDate = referenceDate;
    
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - days + 1);

    console.log('Meta Ads Campaigns API - Date ranges:', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      days,
      sortBy,
      sortOrder,
      limit
    });

    // Get campaign performance data with RPC function
    const { data: campaignData, error: campaignError } = await supabase
      .schema('marketing')
      .rpc('get_meta_campaign_performance', {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

    if (campaignError) {
      console.error('Campaign performance RPC error:', campaignError);
    }

    // Get trend data for 7, 30, and 90 day periods
    const get7DayData = async () => {
      const sevenDaysAgo = new Date(endDate);
      sevenDaysAgo.setDate(endDate.getDate() - 6);
      return await supabase.schema('marketing').rpc('get_meta_campaign_performance', {
        start_date: sevenDaysAgo.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
    };

    const get30DayData = async () => {
      const thirtyDaysAgo = new Date(endDate);
      thirtyDaysAgo.setDate(endDate.getDate() - 29);
      return await supabase.schema('marketing').rpc('get_meta_campaign_performance', {
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
    };

    const get90DayData = async () => {
      const ninetyDaysAgo = new Date(endDate);
      ninetyDaysAgo.setDate(endDate.getDate() - 89);
      return await supabase.schema('marketing').rpc('get_meta_campaign_performance', {
        start_date: ninetyDaysAgo.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
    };

    // Get actual leads from processed_leads table (B2C and B2B forms)
    const { data: leadsData, error: leadsError } = await supabase
      .from('processed_leads')
      .select('form_type, meta_submitted_at, campaign_id')
      .gte('meta_submitted_at', startDate.toISOString())
      .lte('meta_submitted_at', endDate.toISOString())
      .eq('is_likely_spam', false); // Exclude spam leads
    
    if (leadsError) {
      console.error('Leads data query error:', leadsError);
    }
    
    // Count B2C and B2B leads separately
    const b2cLeads = leadsData?.filter(lead => lead.form_type?.includes('B2C')).length || 0;
    const b2bLeads = leadsData?.filter(lead => lead.form_type?.includes('B2B')).length || 0;
    const totalLeads = leadsData?.length || 0;
    
    console.log('Meta Ads Leads data:', { 
      totalLeads, 
      b2cLeads, 
      b2bLeads, 
      dateRange: { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] } 
    });

    // Fetch trend data in parallel
    const [{ data: trend7d }, { data: trend30d }, { data: trend90d }] = await Promise.all([
      get7DayData(),
      get30DayData(),
      get90DayData()
    ]);

    // Helper function to calculate objective-specific performance score
    const calculatePerformanceScore = (campaign: any, objective: string) => {
      const ctr = Number(campaign.avg_ctr) || 0;
      const cpc = Number(campaign.avg_cpc_cents) / 100 || 0;
      const cpm = Number(campaign.avg_cpm_cents) / 100 || 0;
      const frequency = Number(campaign.avg_frequency) || 0;
      
      let score = 0;
      
      switch (objective) {
        case 'OUTCOME_TRAFFIC':
          // CTR component (0-70 points): Excellent CTR > 1.5%
          score += Math.min(70, Math.max(0, ctr * 4667));
          // CPC component (0-30 points): Excellent CPC < ฿40
          if (cpc > 0 && cpc < 80) {
            score += 30 - (cpc / 2.67);
          }
          break;
          
        case 'OUTCOME_ENGAGEMENT':
          // CTR component (0-60 points): Engagement focuses on CTR
          score += Math.min(60, Math.max(0, ctr * 4000));
          // CPM component (0-40 points): Excellent CPM < ฿100
          if (cpm > 0 && cpm < 200) {
            score += 40 - (cpm / 5);
          }
          break;
          
        case 'OUTCOME_AWARENESS':
        case 'REACH':
          // Frequency component (0-50 points): Optimal frequency 2-4
          if (frequency >= 2 && frequency <= 4) {
            score += 50;
          } else if (frequency > 0) {
            score += Math.max(0, 50 - Math.abs(frequency - 3) * 10);
          }
          // CPM component (0-50 points): Excellent CPM < ฿80
          if (cpm > 0 && cpm < 160) {
            score += 50 - (cpm / 3.2);
          }
          break;
          
        default: // SALES, LEADS, or unknown
          // CTR component (0-70 points): Higher CTR indicates intent
          score += Math.min(70, Math.max(0, ctr * 3500));
          // CPC component (0-30 points): Cost efficiency matters
          if (cpc > 0 && cpc < 60) {
            score += 30 - (cpc / 2);
          }
          break;
      }
      
      return Math.min(100, Math.max(0, Math.round(score)));
    };
    
    // Helper function to get efficiency rating
    const getEfficiencyRating = (score: number): 'Excellent' | 'Good' | 'Average' | 'Needs Review' => {
      if (score >= 80) return 'Excellent';
      if (score >= 60) return 'Good';
      if (score >= 40) return 'Average';
      return 'Needs Review';
    };
    
    // Helper function to get budget recommendation - adjusted thresholds
    const getBudgetRecommendation = (score: number, frequency: number, objective: string): 'Scale Up' | 'Maintain' | 'Scale Down' | 'Pause' => {
      // High frequency = audience fatigue, recommend pause
      if (frequency > 5) return 'Pause';
      
      // Based on performance score - lowered thresholds for more actionable insights
      if (score >= 70) return 'Scale Up';
      if (score >= 45) return 'Maintain';
      if (score >= 25) return 'Scale Down';
      return 'Pause';
    };
    
    // Helper function to find trend data for a campaign
    const findTrendData = (campaignId: string, trendData: any[]) => {
      return trendData?.find(c => c.campaign_id === campaignId);
    };
    
    // Process campaign data
    const campaigns: CampaignPerformance[] = campaignData?.map((campaign: any) => {
      const totalSpend = Number(campaign.total_spend_cents) / 100 || 0;
      const totalImpressions = Number(campaign.total_impressions) || 0;
      const totalClicks = Number(campaign.total_clicks) || 0;
      // Fix CTR calculation - database stores as decimal (0.02 = 2% already)
      // Do NOT multiply by 100 - it's already in percentage form
      const averageCtr = Number(campaign.avg_ctr) || 0;
      const averageCpc = Number(campaign.avg_cpc_cents) / 100 || 0;
      const averageCpm = Number(campaign.avg_cpm_cents) / 100 || 0;
      
      console.log('Campaign CTR debug:', {
        campaign_name: campaign.campaign_name,
        raw_ctr: campaign.avg_ctr,
        calculated_ctr: averageCtr,
        raw_cpc_cents: campaign.avg_cpc_cents,
        calculated_cpc: averageCpc,
        raw_cpm_cents: campaign.avg_cpm_cents,
        calculated_cpm: averageCpm
      });
      const averageFrequency = Number(campaign.avg_frequency) || 0;
      const reach = Number(campaign.total_reach) || 0;
      const objective = campaign.objective || 'UNKNOWN';
      
      // Calculate leads attribution for LEADS campaigns based on form type
      let actualLeads = 0;
      let costPerLead = 0;
      
      if (objective === 'LEADS' || campaign.campaign_name.toLowerCase().includes('lead')) {
        // Map leads by campaign name pattern (B2C vs B2B)
        if (campaign.campaign_name.toLowerCase().includes('b2c') || campaign.campaign_name.toLowerCase().includes('gl:lead')) {
          actualLeads = b2cLeads;
        } else if (campaign.campaign_name.toLowerCase().includes('b2b')) {
          actualLeads = b2bLeads;
        } else {
          // Fallback: distribute proportionally by spend
          const totalSpendFromLeadCampaigns = campaignData
            .filter((c: any) => c.objective === 'LEADS' || c.campaign_name.toLowerCase().includes('lead'))
            .reduce((sum: number, c: any) => sum + (Number(c.total_spend_cents) / 100), 0);
          const spendProportion = totalSpendFromLeadCampaigns > 0 ? totalSpend / totalSpendFromLeadCampaigns : 0;
          actualLeads = Math.round(totalLeads * spendProportion);
        }
        
        costPerLead = actualLeads > 0 ? totalSpend / actualLeads : 0;
        
        console.log('LEADS Campaign attribution:', {
          campaign_name: campaign.campaign_name,
          totalSpend,
          actualLeads,
          costPerLead,
          leadType: campaign.campaign_name.toLowerCase().includes('b2c') ? 'B2C' : 
                   campaign.campaign_name.toLowerCase().includes('b2b') ? 'B2B' : 'Mixed'
        });
      }
      
      // Calculate performance score based on objective
      const performanceScore = calculatePerformanceScore(campaign, objective);
      const efficiencyRating = getEfficiencyRating(performanceScore);
      const budgetRecommendation = getBudgetRecommendation(performanceScore, averageFrequency, objective);
      
      // Get trend data
      const trend7dData = findTrendData(campaign.campaign_id, trend7d);
      const trend30dData = findTrendData(campaign.campaign_id, trend30d);
      const trend90dData = findTrendData(campaign.campaign_id, trend90d);
      
      // Calculate frequency trend
      let frequencyTrend: 'Rising' | 'Stable' | 'Declining' = 'Stable';
      if (trend7dData && trend30dData) {
        const freq7d = Number(trend7dData.avg_frequency) || 0;
        const freq30d = Number(trend30dData.avg_frequency) || 0;
        const change = freq7d - freq30d;
        if (change > 0.5) frequencyTrend = 'Rising';
        else if (change < -0.5) frequencyTrend = 'Declining';
      }
      
      // Parse campaign name for insights
      const parsedInfo = parseCampaignName(campaign.campaign_name);

      return {
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        campaign_status: campaign.campaign_status || 'UNKNOWN',
        objective: objective,
        total_spend: totalSpend,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        average_ctr: averageCtr,
        average_cpc: averageCpc,
        average_cpm: averageCpm,
        average_frequency: averageFrequency,
        reach: reach,
        performance_score: performanceScore,
        efficiency_rating: efficiencyRating,
        budget_recommendation: budgetRecommendation,
        actual_leads: actualLeads,
        cost_per_lead: costPerLead,
        date_range: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        trends: {
          ctr_7d: Number(trend7dData?.avg_ctr) || 0,
          ctr_30d: Number(trend30dData?.avg_ctr) || 0,
          ctr_90d: Number(trend90dData?.avg_ctr) || 0,
          cpc_7d: Number(trend7dData?.avg_cpc_cents) / 100 || 0,
          cpc_30d: Number(trend30dData?.avg_cpc_cents) / 100 || 0,
          cpc_90d: Number(trend90dData?.avg_cpc_cents) / 100 || 0,
          frequency_trend: frequencyTrend
        },
        parsed_info: parsedInfo
      };
    }) || [];

    // Sort campaigns with proper type handling
    campaigns.sort((a, b) => {
      let aVal: number;
      let bVal: number;
      
      // Handle different sort column types
      switch (sortBy) {
        case 'performance_score':
        case 'average_ctr':
        case 'average_cpc':
        case 'average_cpm':
        case 'average_frequency':
        case 'total_spend':
        case 'total_impressions':
        case 'total_clicks':
        case 'reach':
          aVal = Number(a[sortBy as keyof CampaignPerformance]) || 0;
          bVal = Number(b[sortBy as keyof CampaignPerformance]) || 0;
          break;
        default:
          aVal = a.total_spend;
          bVal = b.total_spend;
      }
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // Limit results
    const limitedCampaigns = campaigns.slice(0, limit);

    console.log('Meta Ads Campaigns processed:', {
      totalCampaigns: campaigns.length,
      returnedCampaigns: limitedCampaigns.length,
      totalSpend: campaigns.reduce((sum, c) => sum + c.total_spend, 0),
      averagePerformanceScore: campaigns.reduce((sum, c) => sum + c.performance_score, 0) / campaigns.length,
      excellentCampaigns: campaigns.filter(c => c.efficiency_rating === 'Excellent').length,
      needsReviewCampaigns: campaigns.filter(c => c.efficiency_rating === 'Needs Review').length
    });

    return NextResponse.json({
      campaigns: limitedCampaigns,
      total: campaigns.length,
      has_more: campaigns.length > limit,
      summary: {
        total_campaigns: campaigns.length,
        total_spend: campaigns.reduce((sum, c) => sum + c.total_spend, 0),
        total_impressions: campaigns.reduce((sum, c) => sum + c.total_impressions, 0),
        total_clicks: campaigns.reduce((sum, c) => sum + c.total_clicks, 0),
        average_performance_score: Math.round(campaigns.reduce((sum, c) => sum + c.performance_score, 0) / campaigns.length) || 0,
        excellent_campaigns: campaigns.filter(c => c.efficiency_rating === 'Excellent').length,
        good_campaigns: campaigns.filter(c => c.efficiency_rating === 'Good').length,
        needs_review_campaigns: campaigns.filter(c => c.efficiency_rating === 'Needs Review').length,
        budget_recommendations: {
          scale_up: campaigns.filter(c => c.budget_recommendation === 'Scale Up').length,
          maintain: campaigns.filter(c => c.budget_recommendation === 'Maintain').length,
          scale_down: campaigns.filter(c => c.budget_recommendation === 'Scale Down').length,
          pause: campaigns.filter(c => c.budget_recommendation === 'Pause').length
        },
        date_range: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          days
        }
      }
    });

  } catch (error) {
    console.error('Meta Ads campaigns API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch Meta Ads campaigns data" },
      { status: 500 }
    );
  }
}

// Helper function to parse campaign names for insights
function parseCampaignName(campaignName: string) {
  const parsed: any = {};
  const name = campaignName.toLowerCase();

  // Detect course types
  if (name.includes('beginner') || name.includes('starter')) {
    parsed.course_type = 'Beginner';
  } else if (name.includes('intermediate') || name.includes('improve')) {
    parsed.course_type = 'Intermediate';
  } else if (name.includes('advanced') || name.includes('expert')) {
    parsed.course_type = 'Advanced';
  } else if (name.includes('group') || name.includes('class')) {
    parsed.course_type = 'Group Lesson';
  } else if (name.includes('private') || name.includes('1on1')) {
    parsed.course_type = 'Private Lesson';
  }

  // Detect target audience
  if (name.includes('junior') || name.includes('kid') || name.includes('child')) {
    parsed.target_audience = 'Junior';
  } else if (name.includes('lady') || name.includes('women')) {
    parsed.target_audience = 'Ladies';
  } else if (name.includes('senior') || name.includes('mature')) {
    parsed.target_audience = 'Senior';
  } else if (name.includes('corporate') || name.includes('business')) {
    parsed.target_audience = 'Corporate';
  }

  // Detect promotion types
  if (name.includes('free') || name.includes('trial')) {
    parsed.promotion_type = 'Free Trial';
  } else if (name.includes('discount') || name.includes('sale') || name.includes('%')) {
    parsed.promotion_type = 'Discount';
  } else if (name.includes('package') || name.includes('bundle')) {
    parsed.promotion_type = 'Package Deal';
  } else if (name.includes('new') || name.includes('first')) {
    parsed.promotion_type = 'New Customer';
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}