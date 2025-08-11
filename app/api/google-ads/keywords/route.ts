import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface KeywordPerformance {
  keyword: string;
  matchType: string;
  campaignName: string;
  adGroupName: string;
  spend: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  qualityScore: number;
  searchImpressionShare?: number;
  topImpressionShare?: number;
  position: number;
  // Period comparison
  previousSpend: number;
  previousClicks: number;
  spendChange: { value: number; percent: number };
  clicksChange: { value: number; percent: number };
  ctrChange: { value: number; percent: number };
  cpcChange: { value: number; percent: number };
  // Recommendations
  recommendedAction: 'scale' | 'optimize' | 'review' | 'pause' | 'monitor';
  actionReason: string;
}

interface KeywordDrillDownResponse {
  campaignName: string;
  campaignType: string;
  periodDays: number;
  keywords: KeywordPerformance[];
  summary: {
    totalKeywords: number;
    totalSpend: number;
    avgQualityScore: number;
    keywordsNeedingAttention: number;
    topPerformers: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignName = searchParams.get('campaignName');
    const analysisType = searchParams.get('analysisType') || '14-day';
    
    if (!campaignName) {
      return NextResponse.json({ error: "campaignName parameter required" }, { status: 400 });
    }

    // Determine period length in days
    const periodDays = analysisType === '30-day' ? 30 : analysisType === '90-day' ? 90 : 14;
    
    // Calculate current period
    const currentEndDate = new Date().toISOString().split('T')[0];
    const currentStartDate = new Date(new Date(currentEndDate).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Calculate previous period (same length)
    const previousEndDate = new Date(new Date(currentStartDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const previousStartDate = new Date(new Date(previousEndDate).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const keywords = await getKeywordPerformance(
      campaignName,
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate
    );

    const summary = generateKeywordSummary(keywords);

    const response: KeywordDrillDownResponse = {
      campaignName,
      campaignType: 'Search', // Would be determined from campaign data
      periodDays,
      keywords,
      summary
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Keyword drill-down error:', error);
    return NextResponse.json(
      { error: "Failed to fetch keyword performance data" },
      { status: 500 }
    );
  }
}

async function getKeywordPerformance(
  campaignName: string,
  currentStartDate: string,
  currentEndDate: string,
  previousStartDate: string,
  previousEndDate: string
): Promise<KeywordPerformance[]> {

  // Get campaign ID from campaign name
  const { data: campaignInfo } = await supabase
    .schema('marketing')
    .from('google_ads_campaigns')
    .select('campaign_id')
    .eq('campaign_name', campaignName)
    .single();

  if (!campaignInfo) {
    throw new Error(`Campaign not found: ${campaignName}`);
  }

  // Get current period keyword performance data
  const { data: currentKeywordData } = await supabase
    .schema('marketing')
    .from('google_ads_keyword_performance')
    .select(`
      *,
      keyword:google_ads_keywords(keyword_text, keyword_match_type)
    `)
    .eq('campaign_id', campaignInfo.campaign_id)
    .gte('date', currentStartDate)
    .lte('date', currentEndDate);

  // Get previous period keyword performance data
  const { data: previousKeywordData } = await supabase
    .schema('marketing')
    .from('google_ads_keyword_performance')
    .select(`
      *,
      keyword:google_ads_keywords(keyword_text, keyword_match_type)
    `)
    .eq('campaign_id', campaignInfo.campaign_id)
    .gte('date', previousStartDate)
    .lte('date', previousEndDate);

  // Aggregate current period by keyword + match type
  const currentKeywordMap = new Map<string, any>();
  currentKeywordData?.forEach(row => {
    const keywordText = row.keyword?.keyword_text || 'Unknown Keyword';
    const matchType = row.keyword?.keyword_match_type || 'UNKNOWN';
    const key = `${keywordText}_${matchType}`;
    
    if (!currentKeywordMap.has(key)) {
      currentKeywordMap.set(key, {
        keyword: keywordText,
        matchType: getMatchTypeLabel(matchType),
        adGroupName: 'Unknown', // Would need ad group data join
        spend: 0,
        clicks: 0,
        impressions: 0,
        qualityScore: null,
        searchImpressionShare: null,
        topImpressionShare: null,
        position: 0
      });
    }
    const keyword = currentKeywordMap.get(key);
    // Convert micros to THB (micros = value * 1,000,000)
    keyword.spend += (row.cost_micros || 0) / 1000000;
    keyword.clicks += row.clicks || 0;
    keyword.impressions += row.impressions || 0;
    // Quality score and other metrics - handle null values properly
    if (row.quality_score !== null && row.quality_score !== undefined) {
      keyword.qualityScore = keyword.qualityScore === null ? row.quality_score : Math.max(keyword.qualityScore, row.quality_score);
    }
  });

  // Aggregate previous period by keyword + match type
  const previousKeywordMap = new Map<string, any>();
  previousKeywordData?.forEach(row => {
    const keywordText = row.keyword?.keyword_text || 'Unknown Keyword';
    const matchType = row.keyword?.keyword_match_type || 'UNKNOWN';
    const key = `${keywordText}_${matchType}`;
    
    if (!previousKeywordMap.has(key)) {
      previousKeywordMap.set(key, {
        spend: 0,
        clicks: 0,
        impressions: 0
      });
    }
    const keyword = previousKeywordMap.get(key);
    // Convert micros to THB
    keyword.spend += (row.cost_micros || 0) / 1000000;
    keyword.clicks += row.clicks || 0;
    keyword.impressions += row.impressions || 0;
  });

  // Build comparison for each keyword
  const keywordPerformance: KeywordPerformance[] = [];
  
  for (const [key, currentData] of Array.from(currentKeywordMap.entries())) {
    const previousData = previousKeywordMap.get(key) || { spend: 0, clicks: 0, impressions: 0 };
    
    // Calculate metrics
    const ctr = currentData.impressions > 0 ? (currentData.clicks / currentData.impressions) * 100 : 0;
    const cpc = currentData.clicks > 0 ? currentData.spend / currentData.clicks : 0;
    const previousCtr = previousData.impressions > 0 ? (previousData.clicks / previousData.impressions) * 100 : 0;
    const previousCpc = previousData.clicks > 0 ? previousData.spend / previousData.clicks : 0;
    
    // Calculate changes
    const spendChange = {
      value: currentData.spend - previousData.spend,
      percent: previousData.spend > 0 ? ((currentData.spend - previousData.spend) / previousData.spend) * 100 : 0
    };
    
    const clicksChange = {
      value: currentData.clicks - previousData.clicks,
      percent: previousData.clicks > 0 ? ((currentData.clicks - previousData.clicks) / previousData.clicks) * 100 : 0
    };
    
    const ctrChange = {
      value: ctr - previousCtr,
      percent: previousCtr > 0 ? ((ctr - previousCtr) / previousCtr) * 100 : 0
    };
    
    const cpcChange = {
      value: cpc - previousCpc,
      percent: previousCpc > 0 ? ((cpc - previousCpc) / previousCpc) * 100 : 0
    };

    // Generate recommendations
    const { recommendedAction, actionReason } = generateKeywordRecommendation(
      currentData, 
      { ctr, cpc }, 
      { spendChange, clicksChange, ctrChange, cpcChange }
    );

    keywordPerformance.push({
      keyword: currentData.keyword,
      matchType: currentData.matchType,
      campaignName,
      adGroupName: currentData.adGroupName,
      spend: Math.round(currentData.spend),
      clicks: currentData.clicks,
      impressions: currentData.impressions,
      ctr: Math.round(ctr * 100) / 100,
      cpc: Math.round(cpc * 100) / 100,
      qualityScore: currentData.qualityScore,
      searchImpressionShare: currentData.searchImpressionShare,
      topImpressionShare: currentData.topImpressionShare,
      position: Math.round(currentData.position * 100) / 100,
      previousSpend: Math.round(previousData.spend),
      previousClicks: previousData.clicks,
      spendChange,
      clicksChange,
      ctrChange,
      cpcChange,
      recommendedAction,
      actionReason
    });
  }

  // Sort by current spend descending
  return keywordPerformance.sort((a, b) => b.spend - a.spend);
}

function generateKeywordRecommendation(
  keywordData: any, 
  metrics: { ctr: number; cpc: number },
  changes: any
): { recommendedAction: 'scale' | 'optimize' | 'review' | 'pause' | 'monitor'; actionReason: string } {
  
  // High performance - scale opportunity
  if (metrics.ctr > 8 && keywordData.qualityScore >= 7 && changes.clicksChange.percent > 10) {
    return {
      recommendedAction: 'scale',
      actionReason: 'High CTR and quality score with growing clicks - increase bids'
    };
  }
  
  // Poor quality score or missing quality score with significant spend - needs optimization
  if ((keywordData.qualityScore !== null && keywordData.qualityScore < 5) || 
      (keywordData.qualityScore === null && keywordData.spend > 500)) {
    return {
      recommendedAction: 'optimize',
      actionReason: keywordData.qualityScore === null ? 
        'Missing quality score with significant spend - review keyword relevance' :
        'Low quality score with significant spend - improve ad relevance'
    };
  }
  
  // High spend, poor performance - review
  if (keywordData.spend > 2000 && metrics.ctr < 3) {
    return {
      recommendedAction: 'review',
      actionReason: 'High spend with low CTR - consider pausing or restructuring'
    };
  }
  
  // Very poor performance - pause
  if (metrics.ctr < 1.5 && keywordData.qualityScore < 4 && keywordData.spend > 1000) {
    return {
      recommendedAction: 'pause',
      actionReason: 'Very low CTR and quality score - consider pausing'
    };
  }
  
  // Declining performance
  if (changes.ctrChange.percent < -25 && changes.cpcChange.percent > 25) {
    return {
      recommendedAction: 'review',
      actionReason: 'CTR declining and CPC increasing - review competition and ad copy'
    };
  }
  
  // Default
  return {
    recommendedAction: 'monitor',
    actionReason: 'Performance within normal ranges - continue monitoring'
  };
}

function generateKeywordSummary(keywords: KeywordPerformance[]) {
  const totalKeywords = keywords.length;
  const totalSpend = keywords.reduce((sum, kw) => sum + kw.spend, 0);
  const avgQualityScore = keywords.reduce((sum, kw) => sum + kw.qualityScore, 0) / totalKeywords;
  const keywordsNeedingAttention = keywords.filter(kw => 
    kw.recommendedAction === 'review' || kw.recommendedAction === 'pause' || kw.recommendedAction === 'optimize'
  ).length;
  const topPerformers = keywords.filter(kw => kw.recommendedAction === 'scale').length;

  return {
    totalKeywords,
    totalSpend: Math.round(totalSpend),
    avgQualityScore: Math.round(avgQualityScore * 100) / 100,
    keywordsNeedingAttention,
    topPerformers
  };
}

function getMatchTypeLabel(type: string): string {
  const typeMap: { [key: string]: string } = {
    'EXACT': 'Exact',
    'PHRASE': 'Phrase', 
    'BROAD': 'Broad',
    'BROAD_MATCH_MODIFIER': 'Broad Modified',
    '1': 'Exact',
    '2': 'Phrase',
    '3': 'Broad',
    '4': 'Broad Modified'
  };
  return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}