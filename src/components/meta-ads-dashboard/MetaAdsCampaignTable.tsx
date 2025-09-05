import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  BarChart3,
  Eye,
  Target,
  Calendar,
  Play,
  Pause,
  TrendingUp,
  Copy,
  Edit3,
  Settings
} from 'lucide-react';

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
  parsed_info?: {
    course_type?: string;
    target_audience?: string;
    promotion_type?: string;
  };
}

interface CampaignTableData {
  campaigns: CampaignPerformance[];
  total: number;
  has_more: boolean;
  summary: {
    total_campaigns: number;
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    average_performance_score: number;
    excellent_campaigns: number;
    good_campaigns: number;
    needs_review_campaigns: number;
    budget_recommendations: {
      scale_up: number;
      maintain: number;
      scale_down: number;
      pause: number;
    };
    date_range: {
      start: string;
      end: string;
      days: number;
    };
  };
}

interface MetaAdsCampaignTableProps {
  timeRange: string;
  referenceDate: string;
  isLoading: boolean;
}

const MetaAdsCampaignTable: React.FC<MetaAdsCampaignTableProps> = ({
  timeRange,
  referenceDate,
  isLoading
}) => {
  const [campaignData, setCampaignData] = useState<CampaignTableData | null>(null);
  const [sortBy, setSortBy] = useState<string>('total_spend');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoadingTable, setIsLoadingTable] = useState(false);

  const fetchCampaignData = useCallback(async () => {
    try {
      setIsLoadingTable(true);
      const response = await fetch(`/api/meta-ads/campaigns?days=${timeRange}&referenceDate=${referenceDate}&sortBy=${sortBy}&sortOrder=${sortOrder}&limit=20`);
      
      if (!response.ok) {
        throw new Error(`Campaign data fetch failed: ${response.status}`);
      }
      
      const data = await response.json();
      setCampaignData(data);
    } catch (error) {
      console.error('Failed to fetch campaign data:', error);
    } finally {
      setIsLoadingTable(false);
    }
  }, [timeRange, referenceDate, sortBy, sortOrder]);

  useEffect(() => {
    if (!isLoading) {
      fetchCampaignData();
    }
  }, [timeRange, referenceDate, sortBy, sortOrder, isLoading]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (amount: number): string => {
    return `฿${Math.round(amount).toLocaleString('th-TH')}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCTR = (ctr: number): string => {
    // CTR from database is already in percentage format (2.65 = 2.65%)
    return `${ctr.toFixed(2)}%`;
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'PAUSED': 'bg-yellow-100 text-yellow-800',
      'ARCHIVED': 'bg-gray-100 text-gray-800',
      'UNKNOWN': 'bg-gray-100 text-gray-500'
    };
    
    return (
      <Badge className={`text-xs ${statusColors[status as keyof typeof statusColors] || statusColors.UNKNOWN}`}>
        {status}
      </Badge>
    );
  };

  const getObjectiveIcon = (objective: string) => {
    const objectiveIcons = {
      'OUTCOME_TRAFFIC': BarChart3,
      'OUTCOME_ENGAGEMENT': Target,
      'OUTCOME_AWARENESS': Eye,
      'REACH': Eye,
      'CONVERSIONS': Target,
      'TRAFFIC': BarChart3,
      'AWARENESS': Calendar,
      'UNKNOWN': BarChart3
    };
    
    const Icon = objectiveIcons[objective as keyof typeof objectiveIcons] || objectiveIcons.UNKNOWN;
    return <Icon className="h-4 w-4" />;
  };
  
  const getObjectiveColor = (objective: string) => {
    const colors = {
      'OUTCOME_TRAFFIC': 'bg-blue-100 text-blue-800',
      'OUTCOME_ENGAGEMENT': 'bg-purple-100 text-purple-800',
      'OUTCOME_AWARENESS': 'bg-green-100 text-green-800',
      'REACH': 'bg-green-100 text-green-800',
      'CONVERSIONS': 'bg-orange-100 text-orange-800',
      'TRAFFIC': 'bg-blue-100 text-blue-800',
      'AWARENESS': 'bg-green-100 text-green-800',
      'UNKNOWN': 'bg-gray-100 text-gray-800'
    };
    return colors[objective as keyof typeof colors] || colors.UNKNOWN;
  };
  
  const getBudgetRecommendationColor = (recommendation: string) => {
    const colors = {
      'Scale Up': 'bg-green-100 text-green-800 border-green-200',
      'Maintain': 'bg-blue-100 text-blue-800 border-blue-200',
      'Scale Down': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Pause': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[recommendation as keyof typeof colors] || colors.Maintain;
  };
  
  const getTrendIcon = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    if (change > 5) return <ArrowUp className="h-3 w-3 text-green-600" />;
    if (change < -5) return <ArrowDown className="h-3 w-3 text-red-600" />;
    return <span className="text-gray-400 text-xs">→</span>;
  };
  
  const getPerformanceScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getFrequencyStatus = (frequency: number) => {
    if (frequency <= 3) return { label: 'Optimal', color: 'bg-green-100 text-green-800' };
    if (frequency <= 5) return { label: 'Watch', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Fatigue Risk', color: 'bg-red-100 text-red-800' };
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />;
  };

  if (isLoading || isLoadingTable) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Campaign Performance Analysis
          </CardTitle>
          
          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total_spend">Total Spend</SelectItem>
                <SelectItem value="performance_score">Performance Score</SelectItem>
                <SelectItem value="total_impressions">Impressions</SelectItem>
                <SelectItem value="total_clicks">Clicks</SelectItem>
                <SelectItem value="average_ctr">CTR</SelectItem>
                <SelectItem value="average_frequency">Frequency</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              {getSortIcon(sortBy)}
              {sortOrder === 'desc' ? 'Desc' : 'Asc'}
            </Button>
          </div>
        </div>
        
        {campaignData && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>{campaignData.total} campaigns</span>
            <span>•</span>
            <span>{formatCurrency(campaignData.summary.total_spend)} total spend</span>
            <span>•</span>
            <span>Avg Score: {campaignData.summary.average_performance_score}/100 • {campaignData.summary.excellent_campaigns} Excellent • {campaignData.summary.needs_review_campaigns} Need Review</span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {campaignData?.campaigns.length ? (
          <div className="space-y-3">
            {campaignData.campaigns.map((campaign) => (
              <div
                key={campaign.campaign_id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  
                  {/* Lead Count Badge for LEADS campaigns */}
                  {campaign.objective === 'LEADS' && campaign.actual_leads > 0 && (
                    <div className="md:col-span-12 mb-2">
                      <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">
                        📋 {campaign.actual_leads} Leads Generated • {formatCurrency(campaign.cost_per_lead)}/lead
                      </Badge>
                    </div>
                  )}
                  {/* Campaign Name & Status */}
                  <div className="md:col-span-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getObjectiveIcon(campaign.objective)}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                            {campaign.campaign_name}
                          </h4>
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(campaign.campaign_status)}
                            <Badge variant="outline" className={`text-xs ${getObjectiveColor(campaign.objective)}`}>
                              {campaign.objective.replace('OUTCOME_', '')}
                            </Badge>
                          </div>
                          
                          {/* Performance Score Bar */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-24">
                              <div 
                                className={`h-2 rounded-full ${getPerformanceScoreColor(campaign.performance_score)}`}
                                style={{ width: `${campaign.performance_score}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-700">
                              {campaign.performance_score}/100
                            </span>
                            <Badge className={`text-xs px-2 py-1 ${getBudgetRecommendationColor(campaign.budget_recommendation)}`}>
                              {campaign.budget_recommendation}
                            </Badge>
                          </div>
                          
                          {/* Efficiency Rating & Frequency */}
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${
                              campaign.efficiency_rating === 'Excellent' ? 'bg-green-100 text-green-800' :
                              campaign.efficiency_rating === 'Good' ? 'bg-blue-100 text-blue-800' :
                              campaign.efficiency_rating === 'Average' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {campaign.efficiency_rating}
                            </Badge>
                            {campaign.average_frequency > 0 && (
                              <Badge className={`text-xs ${getFrequencyStatus(campaign.average_frequency).color}`}>
                                Freq: {campaign.average_frequency.toFixed(1)} ({getFrequencyStatus(campaign.average_frequency).label})
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <div className="text-xs text-gray-500 mr-2">Quick Actions:</div>
                      
                      {/* Scale Up/Down based on recommendation */}
                      {campaign.budget_recommendation === 'Scale Up' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-6 px-2 text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => console.log('Scale up campaign:', campaign.campaign_id)}
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Scale +20%
                        </Button>
                      )}
                      
                      {campaign.budget_recommendation === 'Pause' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-6 px-2 text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => console.log('Pause campaign:', campaign.campaign_id)}
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </Button>
                      )}
                      
                      {(campaign.budget_recommendation === 'Scale Down' || campaign.budget_recommendation === 'Maintain') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-6 px-2 text-blue-700 border-blue-200 hover:bg-blue-50"
                          onClick={() => console.log('Optimize campaign:', campaign.campaign_id)}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Optimize
                        </Button>
                      )}
                      
                      {/* Duplicate for high performers */}
                      {campaign.efficiency_rating === 'Excellent' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-6 px-2 text-purple-700 border-purple-200 hover:bg-purple-50"
                          onClick={() => console.log('Duplicate campaign:', campaign.campaign_id)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Duplicate
                        </Button>
                      )}
                      
                      {/* Edit Audience for frequency issues */}
                      {campaign.average_frequency > 5 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-6 px-2 text-orange-700 border-orange-200 hover:bg-orange-50"
                          onClick={() => console.log('Edit audience for campaign:', campaign.campaign_id)}
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Expand Audience
                        </Button>
                      )}
                    </div>
                    
                    {/* Campaign Tags */}
                    {campaign.parsed_info && (
                      <div className="flex flex-wrap gap-1">
                        {campaign.parsed_info.course_type && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            {campaign.parsed_info.course_type}
                          </Badge>
                        )}
                        {campaign.parsed_info.target_audience && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                            {campaign.parsed_info.target_audience}
                          </Badge>
                        )}
                        {campaign.parsed_info.promotion_type && (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                            {campaign.parsed_info.promotion_type}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Spend & Primary KPI */}
                  <div className="md:col-span-2">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(campaign.total_spend)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {campaign.objective.includes('TRAFFIC') && `CPC: ${formatCurrency(campaign.average_cpc)}`}
                      {campaign.objective.includes('ENGAGEMENT') && (
                        campaign.average_cpm > 0 ? `CPM: ${formatCurrency(campaign.average_cpm)}` : 'CPM: Calculating...'
                      )}
                      {campaign.objective.includes('AWARENESS') && (
                        campaign.average_cpm > 0 ? `CPM: ${formatCurrency(campaign.average_cpm)}` : 'CPM: Calculating...'
                      )}
                      {campaign.objective.includes('REACH') && (
                        campaign.average_cpm > 0 ? `CPM: ${formatCurrency(campaign.average_cpm)}` : 'CPM: Calculating...'
                      )}
                      {campaign.objective === 'LEADS' && (
                        campaign.actual_leads > 0 ? `${campaign.actual_leads} leads @ ${formatCurrency(campaign.cost_per_lead)}/lead` : 'No leads attributed'
                      )}
                      {(!campaign.objective.includes('TRAFFIC') && !campaign.objective.includes('ENGAGEMENT') && 
                        !campaign.objective.includes('AWARENESS') && !campaign.objective.includes('REACH') && 
                        campaign.objective !== 'LEADS') && 
                        `CTR: ${formatCTR(campaign.average_ctr)}`}
                    </div>
                  </div>

                  {/* Trend Analysis */}
                  <div className="md:col-span-3">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-700 mb-1">7D/30D/90D Trends</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">CTR:</span>
                          <span className="font-medium">{formatCTR(campaign.trends.ctr_7d)}</span>
                          {getTrendIcon(campaign.trends.ctr_7d, campaign.trends.ctr_30d)}
                          <span className="font-medium">{formatCTR(campaign.trends.ctr_30d)}</span>
                          {getTrendIcon(campaign.trends.ctr_30d, campaign.trends.ctr_90d)}
                          <span className="font-medium">{formatCTR(campaign.trends.ctr_90d)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">CPC:</span>
                          <span className="font-medium">฿{campaign.trends.cpc_7d.toFixed(0)}</span>
                          {getTrendIcon(campaign.trends.cpc_30d, campaign.trends.cpc_7d)} {/* Inverted for cost */}
                          <span className="font-medium">฿{campaign.trends.cpc_30d.toFixed(0)}</span>
                          {getTrendIcon(campaign.trends.cpc_90d, campaign.trends.cpc_30d)}
                          <span className="font-medium">฿{campaign.trends.cpc_90d.toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Frequency Trend:</span>
                        <Badge className={`text-xs ${
                          campaign.trends.frequency_trend === 'Rising' ? 'bg-red-100 text-red-700' :
                          campaign.trends.frequency_trend === 'Declining' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {campaign.trends.frequency_trend}
                        </Badge>
                        {campaign.average_frequency > 0 && (
                          <span className="font-medium">Current: {campaign.average_frequency.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Core Metrics */}
                  <div className="md:col-span-2">
                    <div className="text-right space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        {formatNumber(campaign.total_impressions)} impressions
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatNumber(campaign.total_clicks)} clicks
                      </div>
                      {campaign.objective === 'LEADS' ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {campaign.actual_leads} leads
                          </div>
                          <div className="text-xs text-gray-500">
                            {campaign.cost_per_lead > 0 ? formatCurrency(campaign.cost_per_lead) + '/lead' : 'No cost data'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-gray-900">
                          {formatCTR(campaign.average_ctr)} CTR
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {campaignData.has_more && (
              <div className="text-center py-4">
                <Button variant="outline" size="sm">
                  Load More Campaigns
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No campaign data available for the selected period</p>
            <p className="text-sm">Try adjusting the date range or check back later</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetaAdsCampaignTable;