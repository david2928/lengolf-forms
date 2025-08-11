'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronDown, ChevronRight, Filter, SortAsc, SortDesc, Lightbulb, 
  Play, Pause, Settings, AlertTriangle, TrendingUp, TrendingDown,
  Target, Search, Eye, MousePointer, DollarSign, RefreshCw
} from 'lucide-react';

interface CampaignData {
  campaignName: string;
  campaignType: string;
  campaignId?: string;
  current: {
    spend: number;
    clicks: number;
    impressions: number;
    ctr: number;
    cpc: number;
    bookingContribution: number;
  };
  previous: {
    spend: number;
    clicks: number;
    impressions: number;
    ctr: number;
    cpc: number;
    bookingContribution: number;
  };
  changes: {
    spend: { value: number; percent: number };
    clicks: { value: number; percent: number };
    impressions: { value: number; percent: number };
    ctr: { value: number; percent: number };
    cpc: { value: number; percent: number };
    bookingContribution: { value: number; percent: number };
  };
  opportunityScore: {
    score: number; // 0-100, higher = more urgent
    level: 'critical' | 'high' | 'medium' | 'low' | 'monitor';
    primaryIssue: string;
    potentialImpact: string;
  };
}

interface DrillDownData {
  keywords?: Array<{
    keyword: string;
    matchType: string;
    spend: number;
    clicks: number;
    ctr: number;
    cpc: number;
    qualityScore: number;
    previousSpend?: number;
    previousClicks?: number;
    spendChange?: { value: number; percent: number };
    clicksChange?: { value: number; percent: number };
    ctrChange?: { value: number; percent: number };
    cpcChange?: { value: number; percent: number };
    recommendedAction?: 'scale' | 'optimize' | 'review' | 'pause' | 'monitor';
    actionReason?: string;
  }>;
  assetGroups?: Array<{
    assetGroupName: string;
    spend: number;
    clicks: number;
    impressions: number;
    ctr: number;
  }>;
  placements?: Array<{
    placement: string;
    spend: number;
    clicks: number;
    ctr: number;
  }>;
}

interface ActionableInsight {
  priority: 'high' | 'medium' | 'low';
  type: 'optimization' | 'investigation' | 'opportunity';
  campaign: string;
  issue: string;
  action: string;
  impact: string;
  effort: 'quick' | 'medium' | 'complex';
}

interface GoogleAdsPivotDashboardProps {
  className?: string;
}

type SortField = 'spend' | 'clicks' | 'ctr' | 'cpc' | 'bookingContribution' | 'spendChange' | 'efficiencyChange' | 'opportunityScore';
type SortDirection = 'asc' | 'desc';


export default function GoogleAdsPivotDashboard({ className }: GoogleAdsPivotDashboardProps) {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [drillDownData, setDrillDownData] = useState<Record<string, DrillDownData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodLength, setPeriodLength] = useState<'14-day' | '30-day' | '90-day'>('14-day');
  const [sortField, setSortField] = useState<SortField>('opportunityScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterProblems, setFilterProblems] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [insights, setInsights] = useState<ActionableInsight[]>([]);

  const fetchCampaignData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/google-ads/campaign-comparison?analysisType=${periodLength}`);
      if (!response.ok) {
        throw new Error('Failed to fetch campaign data');
      }
      
      const data = await response.json();
      const campaignsWithScores = data.campaigns.map((campaign: any) => ({
        ...campaign,
        opportunityScore: calculateOpportunityScore(campaign)
      }));
      setCampaigns(campaignsWithScores);
      generateInsights(campaignsWithScores);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateOpportunityScore = (campaign: any) => {
    let score = 0;
    let issues = [];
    let impacts = [];

    // Critical issues (high weight)
    // 1. High CPC increase with significant spend (40 points max)
    if (campaign.changes.cpc.percent > 50 && campaign.current.spend > 3000) {
      score += 40;
      issues.push(`CPC up ${campaign.changes.cpc.percent.toFixed(1)}%`);
      impacts.push(`Save ฿${(campaign.changes.cpc.value * campaign.current.clicks * 0.3).toFixed(0)}/period`);
    } else if (campaign.changes.cpc.percent > 25 && campaign.current.spend > 1000) {
      score += 25;
      issues.push(`CPC increased ${campaign.changes.cpc.percent.toFixed(1)}%`);
    }

    // 2. CTR decline with high impressions (30 points max)
    if (campaign.changes.ctr.percent < -20 && campaign.current.impressions > 5000) {
      score += 30;
      issues.push(`CTR down ${Math.abs(campaign.changes.ctr.percent).toFixed(1)}%`);
      impacts.push('Improve ad relevance');
    } else if (campaign.changes.ctr.percent < -15 && campaign.current.impressions > 1000) {
      score += 20;
      issues.push(`CTR declining`);
    }

    // 3. Spend increase with booking decrease (35 points max)
    if (campaign.changes.spend.percent > 25 && campaign.changes.bookingContribution.percent < -10) {
      score += 35;
      issues.push(`Spend up but bookings down`);
      impacts.push('Investigate attribution');
    }

    // Medium priority issues
    // 4. High spend with poor efficiency (20 points max)
    if (campaign.current.spend > 5000 && campaign.current.ctr < 2.0) {
      score += 20;
      issues.push(`High spend, low CTR`);
      impacts.push(`Optimize targeting`);
    }

    // 5. Budget allocation opportunity (15 points max)
    if (campaign.changes.bookingContribution.percent > 20 && campaign.current.spend < 3000) {
      score += 15;
      issues.push(`Underbudgeted winner`);
      impacts.push(`Scale successful campaign`);
    }

    // Determine level based on score
    let level: 'critical' | 'high' | 'medium' | 'low' | 'monitor';
    if (score >= 70) level = 'critical';
    else if (score >= 50) level = 'high';
    else if (score >= 25) level = 'medium';
    else if (score >= 10) level = 'low';
    else level = 'monitor';

    return {
      score: Math.min(score, 100), // Cap at 100
      level,
      primaryIssue: issues[0] || 'No major issues',
      potentialImpact: impacts[0] || 'Continue monitoring'
    };
  };

  const generateInsights = (campaignData: CampaignData[]) => {
    const insights: ActionableInsight[] = [];

    campaignData.forEach(campaign => {
      // High CPC increase
      if (campaign.changes.cpc.percent > 50) {
        insights.push({
          priority: 'high',
          type: 'optimization',
          campaign: campaign.campaignName,
          issue: `CPC increased ${campaign.changes.cpc.percent.toFixed(1)}%`,
          action: campaign.campaignType === 'Search' ? 
            'Review keyword bid adjustments and add negative keywords' :
            campaign.campaignType === 'Performance Max' ?
            'Review audience signals and landing page quality' :
            'Review targeting and creative performance',
          impact: `Reduce cost by ฿${Math.abs(campaign.changes.cpc.value * campaign.current.clicks).toFixed(0)}/period`,
          effort: 'quick'
        });
      }

      // Declining CTR
      if (campaign.changes.ctr.percent < -20 && campaign.current.impressions > 1000) {
        insights.push({
          priority: 'medium',
          type: 'optimization',
          campaign: campaign.campaignName,
          issue: `CTR declined ${Math.abs(campaign.changes.ctr.percent).toFixed(1)}%`,
          action: campaign.campaignType === 'Search' ? 
            'Refresh ad copy and test responsive search ads' :
            campaign.campaignType === 'Performance Max' ?
            'Update assets and test new creative variations' :
            'Refresh banner creatives and test new formats',
          impact: 'Improve relevance and reduce CPC',
          effort: 'medium'
        });
      }

      // Significant spend increase with poor booking performance
      if (campaign.changes.spend.percent > 25 && campaign.changes.bookingContribution.percent < -10) {
        insights.push({
          priority: 'high',
          type: 'investigation',
          campaign: campaign.campaignName,
          issue: `Spend up ${campaign.changes.spend.percent.toFixed(1)}% but bookings down ${Math.abs(campaign.changes.bookingContribution.percent).toFixed(1)}%`,
          action: 'Investigate conversion tracking and attribution setup',
          impact: 'Restore proper performance measurement',
          effort: 'complex'
        });
      }

      // Low-performing campaigns with high spend
      if (campaign.current.spend > 5000 && campaign.current.ctr < 2.0) {
        insights.push({
          priority: 'medium',
          type: 'opportunity',
          campaign: campaign.campaignName,
          issue: `High spend (฿${campaign.current.spend}) with low CTR (${campaign.current.ctr.toFixed(2)}%)`,
          action: campaign.campaignType === 'Search' ? 
            'Pause low-quality keywords and focus budget on top performers' :
            'Review targeting settings and adjust bid strategy',
          impact: `Potential ฿${(campaign.current.spend * 0.3).toFixed(0)} monthly savings`,
          effort: 'quick'
        });
      }

      // High performing campaigns - scaling opportunity
      if (campaign.changes.bookingContribution.percent > 20 && campaign.current.spend < 10000) {
        insights.push({
          priority: 'low',
          type: 'opportunity',
          campaign: campaign.campaignName,
          issue: `High performance (+${campaign.changes.bookingContribution.percent.toFixed(1)}% bookings) with low spend`,
          action: 'Consider increasing budget to scale successful performance',
          impact: `Potential ${(campaign.current.bookingContribution * 1.5).toFixed(1)} additional bookings`,
          effort: 'quick'
        });
      }
    });

    // Sort insights by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    setInsights(insights);
  };

  const toggleCampaignExpansion = async (campaignName: string, campaignType: string) => {
    const newExpanded = new Set(expandedCampaigns);
    
    if (expandedCampaigns.has(campaignName)) {
      newExpanded.delete(campaignName);
    } else {
      newExpanded.add(campaignName);
      
      // Fetch drill-down data if not already loaded
      if (!drillDownData[campaignName]) {
        await fetchDrillDownData(campaignName, campaignType);
      }
    }
    
    setExpandedCampaigns(newExpanded);
  };

  const fetchDrillDownData = async (campaignName: string, campaignType: string) => {
    try {
      const drillData: DrillDownData = {};

      if (campaignType === 'Search') {
        // Fetch real keyword data from our Google Ads database
        const response = await fetch(`/api/google-ads/keywords?campaignName=${encodeURIComponent(campaignName)}&analysisType=${periodLength}`);
        if (response.ok) {
          const keywordData = await response.json();
          drillData.keywords = keywordData.keywords.slice(0, 15).map((kw: any) => ({
            keyword: kw.keyword,
            matchType: kw.matchType,
            spend: kw.spend,
            clicks: kw.clicks,
            ctr: kw.ctr,
            cpc: kw.cpc,
            qualityScore: kw.qualityScore,
            previousSpend: kw.previousSpend,
            previousClicks: kw.previousClicks,
            spendChange: kw.spendChange,
            clicksChange: kw.clicksChange,
            ctrChange: kw.ctrChange,
            cpcChange: kw.cpcChange,
            recommendedAction: kw.recommendedAction,
            actionReason: kw.actionReason
          }));
        } else {
          console.error('Failed to fetch keyword data:', response.status, response.statusText);
        }
      } else if (campaignType === 'Performance Max') {
        // Mock data for Performance Max - would implement real API later
        drillData.assetGroups = [
          { assetGroupName: 'Golf Lessons - Premium', spend: 3200, clicks: 180, impressions: 15000, ctr: 1.2 },
          { assetGroupName: 'Simulator Experience', spend: 2100, clicks: 95, impressions: 12000, ctr: 0.8 },
        ];
      } else if (campaignType === 'Display') {
        // Mock data for Display - would implement real API later
        drillData.placements = [
          { placement: 'golfdigest.com', spend: 800, clicks: 40, ctr: 2.1 },
          { placement: 'youtube.com', spend: 600, clicks: 25, ctr: 1.8 },
        ];
      }

      setDrillDownData(prev => ({
        ...prev,
        [campaignName]: drillData
      }));
    } catch (err) {
      console.error('Failed to fetch drill-down data:', err);
      // Set empty data on error
      const errorData: DrillDownData = {};
      setDrillDownData(prev => ({ ...prev, [campaignName]: errorData }));
    }
  };

  const sortCampaigns = (campaigns: CampaignData[]) => {
    return [...campaigns].sort((a, b) => {
      let aValue: number, bValue: number;

      switch (sortField) {
        case 'spend':
          aValue = a.current.spend;
          bValue = b.current.spend;
          break;
        case 'clicks':
          aValue = a.current.clicks;
          bValue = b.current.clicks;
          break;
        case 'ctr':
          aValue = a.current.ctr;
          bValue = b.current.ctr;
          break;
        case 'cpc':
          aValue = a.current.cpc;
          bValue = b.current.cpc;
          break;
        case 'bookingContribution':
          aValue = a.current.bookingContribution;
          bValue = b.current.bookingContribution;
          break;
        case 'spendChange':
          aValue = a.changes.spend.percent;
          bValue = b.changes.spend.percent;
          break;
        case 'efficiencyChange':
          aValue = a.changes.cpc.percent;
          bValue = b.changes.cpc.percent;
          break;
        case 'opportunityScore':
          aValue = a.opportunityScore.score;
          bValue = b.opportunityScore.score;
          break;
        default:
          aValue = a.current.spend;
          bValue = b.current.spend;
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  };

  const filterCampaigns = (campaigns: CampaignData[]) => {
    let filtered = campaigns;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(campaign =>
        campaign.campaignName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.campaignType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Problem filter - now uses opportunity score
    if (filterProblems) {
      filtered = filtered.filter(campaign =>
        campaign.opportunityScore.level === 'critical' || 
        campaign.opportunityScore.level === 'high' ||
        campaign.opportunityScore.score >= 25
      );
    }

    return filtered;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  useEffect(() => {
    fetchCampaignData();
  }, [periodLength]);

  const displayCampaigns = sortCampaigns(filterCampaigns(campaigns));
  const problemCampaigns = campaigns.filter(c => 
    c.opportunityScore?.level === 'critical' || 
    c.opportunityScore?.level === 'high' ||
    (c.opportunityScore?.score || 0) >= 25
  ).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Summary Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Target className="h-7 w-7 text-blue-600" />
            Campaign Performance Pivot
          </h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <span>{campaigns.length} campaigns</span>
            <span className={`font-medium ${
              campaigns.filter(c => c.opportunityScore?.level === 'critical').length > 0 ? 'text-red-600' :
              problemCampaigns > 0 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {campaigns.filter(c => c.opportunityScore?.level === 'critical').length} critical, {campaigns.filter(c => c.opportunityScore?.level === 'high').length} high priority
            </span>
            <span className="text-blue-600">
              {campaigns.filter(c => c.opportunityScore?.level === 'low' && c.changes.bookingContribution.percent > 15).length} scaling opportunities
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={periodLength} onValueChange={(value: '14-day' | '30-day' | '90-day') => setPeriodLength(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="14-day">14 Days</SelectItem>
              <SelectItem value="30-day">30 Days</SelectItem>
              <SelectItem value="90-day">90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={fetchCampaignData}
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Actions Panel */}
      {insights.filter(i => i.priority === 'high').length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Immediate Actions Required
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {insights.filter(i => i.priority === 'high').slice(0, 3).map((insight, index) => (
                <div key={index} className="flex items-start justify-between p-3 bg-white rounded border border-red-200">
                  <div className="flex-1">
                    <div className="font-semibold text-red-900 text-sm">{insight.campaign}</div>
                    <div className="text-red-800 text-sm">{insight.issue}</div>
                    <div className="text-red-700 text-sm mt-1">{insight.action}</div>
                  </div>
                  <div className="text-right text-xs text-red-600">
                    <div>{insight.impact}</div>
                    <Badge variant="outline" className="mt-1 bg-red-100 text-red-700 border-red-300">
                      {insight.effort} fix
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            
            <Button
              variant={filterProblems ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterProblems(!filterProblems)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Problem Campaigns ({problemCampaigns})
            </Button>

            <div className="text-sm text-gray-600">
              Showing {displayCampaigns.length} of {campaigns.length} campaigns
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Campaign Pivot Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Campaign</th>
                  <th className="text-right p-4 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('spend')}>
                    <div className="flex items-center justify-end gap-1">
                      <div className="text-center">
                        <div>Spend</div>
                        <div className="text-xs text-gray-500 font-normal">Current vs Previous</div>
                      </div>
                      {sortField === 'spend' && (sortDirection === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />)}
                    </div>
                  </th>
                  <th className="text-right p-4 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('ctr')}>
                    <div className="flex items-center justify-end gap-1">
                      <div className="text-center">
                        <div>CTR</div>
                        <div className="text-xs text-gray-500 font-normal">Current vs Previous</div>
                      </div>
                      {sortField === 'ctr' && (sortDirection === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />)}
                    </div>
                  </th>
                  <th className="text-right p-4 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('cpc')}>
                    <div className="flex items-center justify-end gap-1">
                      <div className="text-center">
                        <div>CPC</div>
                        <div className="text-xs text-gray-500 font-normal">Current vs Previous</div>
                      </div>
                      {sortField === 'cpc' && (sortDirection === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />)}
                    </div>
                  </th>
                  <th className="text-right p-4 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('clicks')}>
                    <div className="flex items-center justify-end gap-1">
                      <div className="text-center">
                        <div>Clicks</div>
                        <div className="text-xs text-gray-500 font-normal">Current vs Previous</div>
                      </div>
                      {sortField === 'clicks' && (sortDirection === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />)}
                    </div>
                  </th>
                  <th className="text-center p-4 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('opportunityScore')}>
                    <div className="flex items-center justify-center gap-1">
                      <div className="text-center">
                        <div>Priority Score</div>
                        <div className="text-xs text-gray-500 font-normal">Impact Level</div>
                      </div>
                      {sortField === 'opportunityScore' && (sortDirection === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayCampaigns.map((campaign, index) => (
                  <React.Fragment key={index}>
                    {/* Main Campaign Row */}
                    <tr className={`border-b hover:bg-gray-50 ${
                      campaign.opportunityScore.level === 'critical' ? 'bg-red-50' :
                      campaign.opportunityScore.level === 'high' ? 'bg-orange-50' :
                      campaign.opportunityScore.level === 'medium' ? 'bg-yellow-50' : ''
                    }`}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto"
                            onClick={() => toggleCampaignExpansion(campaign.campaignName, campaign.campaignType)}
                          >
                            {expandedCampaigns.has(campaign.campaignName) ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </Button>
                          <div>
                            <div className="font-medium text-sm max-w-xs truncate">{campaign.campaignName}</div>
                            <div className="text-xs text-gray-600">{campaign.campaignType}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="space-y-1">
                          <div className="font-semibold">฿{campaign.current.spend.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">vs ฿{campaign.previous.spend.toLocaleString()}</div>
                          <div className={`text-xs font-medium ${
                            campaign.changes.spend.percent < -10 ? 'text-green-600' : 
                            campaign.changes.spend.percent > 25 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {campaign.changes.spend.percent > 0 ? '+' : ''}{campaign.changes.spend.percent.toFixed(1)}%
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="space-y-1">
                          <div className="font-semibold">{campaign.current.ctr.toFixed(2)}%</div>
                          <div className="text-xs text-gray-500">vs {campaign.previous.ctr.toFixed(2)}%</div>
                          <div className={`text-xs font-medium ${
                            campaign.changes.ctr.percent > 10 ? 'text-green-600' : 
                            campaign.changes.ctr.percent < -15 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {campaign.changes.ctr.percent > 0 ? '+' : ''}{campaign.changes.ctr.percent.toFixed(1)}%
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="space-y-1">
                          <div className="font-semibold">฿{campaign.current.cpc.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">vs ฿{campaign.previous.cpc.toFixed(2)}</div>
                          <div className={`text-xs font-medium ${
                            campaign.changes.cpc.percent < -15 ? 'text-green-600' : 
                            campaign.changes.cpc.percent > 25 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {campaign.changes.cpc.percent > 0 ? '+' : ''}{campaign.changes.cpc.percent.toFixed(1)}%
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="space-y-1">
                          <div className="font-semibold">{campaign.current.clicks.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">vs {campaign.previous.clicks.toLocaleString()}</div>
                          <div className={`text-xs font-medium ${
                            campaign.changes.clicks.percent > 15 ? 'text-green-600' : 
                            campaign.changes.clicks.percent < -20 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {campaign.changes.clicks.percent > 0 ? '+' : ''}{campaign.changes.clicks.percent.toFixed(1)}%
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="space-y-1">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            campaign.opportunityScore.level === 'critical' ? 'bg-red-100 text-red-800' :
                            campaign.opportunityScore.level === 'high' ? 'bg-orange-100 text-orange-800' :
                            campaign.opportunityScore.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            campaign.opportunityScore.level === 'low' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {campaign.opportunityScore.score}/100
                          </div>
                          <div className="text-xs text-gray-600 max-w-24 truncate" title={campaign.opportunityScore.primaryIssue}>
                            {campaign.opportunityScore.primaryIssue}
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              {campaign.campaignType === 'Search' && <Search className="h-3 w-3 text-blue-600" />}
                              {campaign.opportunityScore.level === 'critical' && <AlertTriangle className="h-3 w-3 text-red-600" />}
                              {campaign.changes.bookingContribution.percent > 20 && <TrendingUp className="h-3 w-3 text-green-600" />}
                            </div>
                            {(campaign.opportunityScore.level === 'critical' || campaign.opportunityScore.level === 'high') && (
                              <button 
                                className={`text-xs px-1 py-0.5 rounded font-medium border ${
                                  campaign.opportunityScore.level === 'critical' 
                                    ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' 
                                    : 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200'
                                }`}
                                title={campaign.opportunityScore.potentialImpact}
                              >
                                Act Now
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Drill-down Row */}
                    {expandedCampaigns.has(campaign.campaignName) && (
                      <tr className="bg-gray-100">
                        <td colSpan={9} className="p-0">
                          <div className="p-4 border-l-4 border-blue-500">
                            {renderDrillDown(campaign.campaignName, campaign.campaignType)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Panel */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              All Recommendations ({insights.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className={`p-3 rounded border ${
                  insight.priority === 'high' ? 'border-red-300 bg-red-50' :
                  insight.priority === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                  'border-green-300 bg-green-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          insight.priority === 'high' ? 'destructive' :
                          insight.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {insight.priority} priority
                        </Badge>
                        <Badge variant="outline">{insight.type}</Badge>
                        <span className="text-sm font-medium">{insight.campaign}</span>
                      </div>
                      <div className="text-sm text-gray-700 mb-1">{insight.issue}</div>
                      <div className="text-sm font-medium text-gray-900">{insight.action}</div>
                    </div>
                    <div className="text-right text-xs text-gray-600 ml-4">
                      <div className="mb-1">{insight.impact}</div>
                      <Badge variant="outline">{insight.effort}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  function renderDrillDown(campaignName: string, campaignType: string) {
    const data = drillDownData[campaignName];
    
    if (!data) {
      return (
        <div className="text-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Loading {campaignType.toLowerCase()} details...</div>
        </div>
      );
    }

    if (campaignType === 'Search' && data.keywords) {
      return (
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Search className="h-4 w-4" />
            Top Keywords Performance
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Keyword</th>
                  <th className="text-left py-2">Match Type</th>
                  <th className="text-right py-2">
                    <div>Spend</div>
                    <div className="text-xs text-gray-500 font-normal">vs Previous</div>
                  </th>
                  <th className="text-right py-2">
                    <div>Clicks</div>
                    <div className="text-xs text-gray-500 font-normal">vs Previous</div>
                  </th>
                  <th className="text-right py-2">
                    <div>CTR</div>
                    <div className="text-xs text-gray-500 font-normal">vs Previous</div>
                  </th>
                  <th className="text-right py-2">
                    <div>CPC</div>
                    <div className="text-xs text-gray-500 font-normal">vs Previous</div>
                  </th>
                  <th className="text-right py-2">Quality Score</th>
                  <th className="text-center py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.keywords.map((keyword, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 font-medium">{keyword.keyword}</td>
                    <td className="py-2">
                      <Badge variant="outline">{keyword.matchType}</Badge>
                    </td>
                    <td className="py-2 text-right">
                      <div className="space-y-0.5">
                        <div className="font-semibold">฿{keyword.spend.toLocaleString()}</div>
                        {keyword.previousSpend !== undefined ? (
                          <>
                            <div className="text-xs text-gray-500">vs ฿{keyword.previousSpend.toLocaleString()}</div>
                            <div className={`text-xs font-medium ${
                              (keyword.spendChange?.percent || 0) < -10 ? 'text-green-600' : 
                              (keyword.spendChange?.percent || 0) > 25 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {(keyword.spendChange?.percent || 0) > 0 ? '+' : ''}{(keyword.spendChange?.percent || 0).toFixed(1)}%
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-500">No comparison</div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <div className="space-y-0.5">
                        <div className="font-semibold">{keyword.clicks}</div>
                        {keyword.previousClicks !== undefined ? (
                          <>
                            <div className="text-xs text-gray-500">vs {keyword.previousClicks}</div>
                            <div className={`text-xs font-medium ${
                              (keyword.clicksChange?.percent || 0) > 15 ? 'text-green-600' : 
                              (keyword.clicksChange?.percent || 0) < -20 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {(keyword.clicksChange?.percent || 0) > 0 ? '+' : ''}{(keyword.clicksChange?.percent || 0).toFixed(1)}%
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-500">No comparison</div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <div className="space-y-0.5">
                        <div className="font-semibold">{keyword.ctr.toFixed(1)}%</div>
                        {keyword.ctrChange?.percent !== undefined ? (
                          <>
                            <div className="text-xs text-gray-500">
                              vs {(keyword.ctr / (1 + (keyword.ctrChange.percent || 0) / 100)).toFixed(1)}%
                            </div>
                            <div className={`text-xs font-medium ${
                              keyword.ctrChange.percent > 10 ? 'text-green-600' : 
                              keyword.ctrChange.percent < -15 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {keyword.ctrChange.percent > 0 ? '+' : ''}{keyword.ctrChange.percent.toFixed(1)}%
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-500">No comparison</div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <div className="space-y-0.5">
                        <div className="font-semibold">฿{keyword.cpc.toFixed(2)}</div>
                        {keyword.cpcChange?.percent !== undefined ? (
                          <>
                            <div className="text-xs text-gray-500">
                              vs ฿{(keyword.cpc / (1 + (keyword.cpcChange.percent || 0) / 100)).toFixed(2)}
                            </div>
                            <div className={`text-xs font-medium ${
                              keyword.cpcChange.percent < -15 ? 'text-green-600' : 
                              keyword.cpcChange.percent > 25 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {keyword.cpcChange.percent > 0 ? '+' : ''}{keyword.cpcChange.percent.toFixed(1)}%
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-500">No comparison</div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      {keyword.qualityScore > 0 ? (
                        <Badge variant={keyword.qualityScore >= 7 ? "default" : keyword.qualityScore >= 5 ? "secondary" : "destructive"}>
                          {keyword.qualityScore}/10
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          N/A
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      <div className="space-y-1">
                        <Badge variant={
                          keyword.recommendedAction === 'scale' ? 'default' :
                          keyword.recommendedAction === 'optimize' ? 'secondary' :
                          keyword.recommendedAction === 'review' || keyword.recommendedAction === 'pause' ? 'destructive' :
                          'outline'
                        }>
                          {keyword.recommendedAction || (
                            keyword.qualityScore < 5 ? 'Review' : 
                            keyword.ctr > 8 ? 'Scale' : 'Monitor'
                          )}
                        </Badge>
                        {keyword.actionReason && (
                          <div className="text-xs text-gray-600 max-w-32 truncate" title={keyword.actionReason}>
                            {keyword.actionReason}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (campaignType === 'Performance Max' && data.assetGroups) {
      return (
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Asset Group Performance
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.assetGroups.map((group, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="font-medium text-sm mb-2">{group.assetGroupName}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Spend: ฿{group.spend.toLocaleString()}</div>
                  <div>Clicks: {group.clicks}</div>
                  <div>Impressions: {group.impressions.toLocaleString()}</div>
                  <div>CTR: {group.ctr.toFixed(2)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (campaignType === 'Display' && data.placements) {
      return (
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Top Placements
          </h4>
          <div className="space-y-2">
            {data.placements.map((placement, index) => (
              <div key={index} className="flex justify-between items-center p-2 border rounded">
                <div className="font-medium text-sm">{placement.placement}</div>
                <div className="text-right text-sm">
                  <div>฿{placement.spend} | {placement.clicks} clicks</div>
                  <div className="text-xs text-gray-600">{placement.ctr.toFixed(2)}% CTR</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return <div className="text-sm text-gray-600">No drill-down data available for {campaignType} campaigns yet.</div>;
  }
}