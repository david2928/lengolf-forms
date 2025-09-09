import React, { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown,
  ChevronRight,
  Target,
  Calendar,
  Play,
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingUp,
  Eye,
  BarChart3
} from 'lucide-react';

import { CreativePerformanceDisplay, CampaignGroup, AdsetGroup, TableViewSummary } from '@/types/meta-ads';

interface MetaAdsCreativeTableViewProps {
  campaigns: CampaignGroup[];
  isLoading: boolean;
  summary: TableViewSummary;
  onCreativeClick?: (creative: CreativePerformanceDisplay) => void;
}

const MetaAdsCreativeTableView: React.FC<MetaAdsCreativeTableViewProps> = ({
  campaigns,
  isLoading,
  summary,
  onCreativeClick
}) => {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number): string => {
    return `฿${Math.round(amount).toLocaleString('th-TH')}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return Math.round(num).toString();
  };

  const formatCTR = (ctr: number): string => {
    return `${(ctr * 100).toFixed(2)}%`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-3 w-3 text-green-600" />;
      case 'down': return <ArrowDown className="h-3 w-3 text-red-600" />;
      default: return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  const getObjectiveIcon = (objective: string) => {
    switch (objective) {
      case 'OUTCOME_TRAFFIC': return '🚶';
      case 'OUTCOME_LEADS': return '🎯';
      case 'OUTCOME_SALES': return '🎯';
      case 'OUTCOME_ENGAGEMENT': return '💬';
      default: return '📊';
    }
  };

  const getActionStatusColor = (status: string) => {
    switch (status) {
      case 'scale': return 'bg-green-100 text-green-700 border-green-200';
      case 'keep': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'monitor': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'refresh': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'pause': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const toggleCampaignExpanded = (campaignId: string) => {
    const newExpanded = new Set(expandedCampaigns);
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId);
    } else {
      newExpanded.add(campaignId);
    }
    setExpandedCampaigns(newExpanded);
  };

  const toggleAdsetExpanded = (adsetId: string) => {
    const newExpanded = new Set(expandedAdsets);
    if (newExpanded.has(adsetId)) {
      newExpanded.delete(adsetId);
    } else {
      newExpanded.add(adsetId);
    }
    setExpandedAdsets(newExpanded);
  };

  const getPrimaryMetricValue = (creative: CreativePerformanceDisplay) => {
    if (creative.campaign_objective === 'OUTCOME_LEADS' || creative.campaign_objective === 'OUTCOME_SALES') {
      return creative.total_leads > 0 ? formatCurrency(creative.cost_per_result) : formatCTR(creative.average_ctr);
    } else if (creative.campaign_objective === 'OUTCOME_TRAFFIC') {
      return formatCurrency(creative.cost_per_result);
    } else {
      return formatCTR(creative.average_ctr);
    }
  };

  const getPrimaryMetricLabel = (creative: CreativePerformanceDisplay) => {
    if (creative.campaign_objective === 'OUTCOME_LEADS' || creative.campaign_objective === 'OUTCOME_SALES') {
      return creative.total_leads > 0 ? 'Cost/Lead' : 'CTR';
    } else if (creative.campaign_objective === 'OUTCOME_TRAFFIC') {
      return 'Cost/Click';
    } else {
      return 'CTR';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                <div className="pl-6 space-y-2">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <div key={j} className="h-8 bg-gray-100 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Campaign Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {summary.total_active_ads}
              </div>
              <div className="text-sm text-gray-600">Active Ads</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {summary.total_campaigns}
              </div>
              <div className="text-sm text-gray-600">Campaigns</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.last_7d_spend)}
              </div>
              <div className="text-sm text-gray-600">7D Spend</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {summary.last_7d_results}
              </div>
              <div className="text-sm text-gray-600">7D Results</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campaigns & Creative Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-700">Campaign / Creative</th>
                  <th className="text-center p-4 font-medium text-gray-700">Objective</th>
                  <th className="text-center p-4 font-medium text-gray-700">Status</th>
                  <th className="text-center p-4 font-medium text-gray-700">Launched</th>
                  <th className="text-right p-4 font-medium text-gray-700">Total Spend</th>
                  <th className="text-right p-4 font-medium text-gray-700">30D Results</th>
                  <th className="text-right p-4 font-medium text-gray-700">7D Results</th>
                  <th className="text-right p-4 font-medium text-gray-700">Key Metric</th>
                  <th className="text-center p-4 font-medium text-gray-700">Trend</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const isCampaignExpanded = expandedCampaigns.has(campaign.campaign_id);
                  
                  return (
                    <React.Fragment key={campaign.campaign_id}>
                      {/* Campaign Header Row */}
                      <tr 
                        className="border-b bg-blue-50/30 hover:bg-blue-50/50 cursor-pointer"
                        onClick={() => toggleCampaignExpanded(campaign.campaign_id)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 hover:bg-blue-100"
                            >
                              {isCampaignExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {campaign.campaign_name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {campaign.active_ads} ads • {campaign.adsets?.length || 0} adsets
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center p-4">
                          <div className="flex items-center justify-center gap-1">
                            <span>{getObjectiveIcon(campaign.campaign_objective)}</span>
                            <Badge variant="outline" className="text-xs">
                              {campaign.campaign_objective.replace('OUTCOME_', '')}
                            </Badge>
                          </div>
                        </td>
                        <td className="text-center p-4">
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                            Campaign
                          </Badge>
                        </td>
                        <td className="text-center p-4">
                          <div className="text-sm text-gray-600">-</div>
                        </td>
                        <td className="text-right p-4">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(campaign.total_spend)}
                          </div>
                        </td>
                        <td className="text-right p-4">
                          <div className="text-sm text-gray-600">-</div>
                        </td>
                        <td className="text-right p-4">
                          <div className="text-sm text-gray-600">-</div>
                        </td>
                        <td className="text-right p-4">
                          <div className="text-sm text-gray-600">-</div>
                        </td>
                        <td className="text-center p-4">
                          <div className="text-sm text-gray-600">-</div>
                        </td>
                      </tr>

                      {/* Adset Rows (when campaign expanded) */}
                      {isCampaignExpanded && campaign.adsets?.map((adset) => {
                        const isAdsetExpanded = expandedAdsets.has(adset.adset_id);
                        
                        return (
                          <React.Fragment key={adset.adset_id}>
                            {/* Adset Header Row */}
                            <tr 
                              className="border-b bg-green-50/30 hover:bg-green-50/50 cursor-pointer"
                              onClick={() => toggleAdsetExpanded(adset.adset_id)}
                            >
                              <td className="p-4 pl-8">
                                <div className="flex items-center gap-3">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0 hover:bg-green-100"
                                  >
                                    {isAdsetExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <div>
                                    <div className="font-medium text-gray-800">
                                      {adset.adset_name.split('_').pop() || adset.adset_name}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {adset.active_ads} ads • {adset.adset_status}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="text-center p-4">
                                <Badge variant="outline" className="text-xs text-green-700">
                                  Adset
                                </Badge>
                              </td>
                              <td className="text-center p-4">
                                <Badge className={`text-xs ${adset.adset_status === 'ENABLED' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'} border`}>
                                  {adset.adset_status}
                                </Badge>
                              </td>
                              <td className="text-center p-4">
                                <div className="text-sm text-gray-600">-</div>
                              </td>
                              <td className="text-right p-4">
                                <div className="font-medium text-gray-800">
                                  {formatCurrency(adset.total_spend)}
                                </div>
                              </td>
                              <td className="text-right p-4">
                                <div className="text-sm text-gray-600">-</div>
                              </td>
                              <td className="text-right p-4">
                                <div className="text-sm text-gray-600">-</div>
                              </td>
                              <td className="text-right p-4">
                                <div className="text-sm text-gray-600">-</div>
                              </td>
                              <td className="text-center p-4">
                                <div className="text-sm text-gray-600">-</div>
                              </td>
                            </tr>

                            {/* Creative Rows (when adset expanded) */}
                            {isAdsetExpanded && adset.creatives.map((creative) => (
                              <tr 
                                key={creative.creative_id}
                                className="border-b hover:bg-gray-50/50 cursor-pointer"
                                onClick={() => onCreativeClick?.(creative)}
                              >
                                <td className="p-4 pl-16">
                                  <div className="flex items-center gap-3">
                                    {/* Creative Thumbnail */}
                                    <div className="flex-shrink-0">
                                      {creative.thumbnail_url || creative.image_url ? (
                                        <div className="relative w-8 h-8 bg-gray-100 rounded overflow-hidden">
                                          <Image
                                            src={creative.thumbnail_url || creative.image_url || ''}
                                            alt=""
                                            fill
                                            className="object-cover"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                            }}
                                          />
                                          {creative.creative_type === 'VIDEO' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                                              <Play className="h-2 w-2 text-white" />
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded flex items-center justify-center">
                                          <Target className="h-3 w-3 text-blue-600" />
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Creative Info */}
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-sm text-gray-900 truncate">
                                        {creative.creative_name}
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">
                                          {creative.creative_type}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="text-center p-4">
                                  <div className="text-xs text-gray-600 space-y-1">
                                    <div>{getObjectiveIcon(creative.campaign_objective)}</div>
                                    <Badge variant="outline" className="text-xs">
                                      Creative
                                    </Badge>
                                  </div>
                                </td>
                                <td className="text-center p-4">
                                  <Badge className={`text-xs ${getActionStatusColor(creative.action_status)} border`}>
                                    {creative.action_status}
                                  </Badge>
                                </td>
                                <td className="text-center p-4">
                                  <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {creative.days_active}d
                                  </div>
                                </td>
                                <td className="text-right p-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {formatCurrency(creative.total_spend)}
                                  </div>
                                </td>
                                <td className="text-right p-4">
                                  <div className="text-sm text-gray-900">
                                    {creative.last_30d_leads > 0 
                                      ? creative.last_30d_leads.toFixed(0)
                                      : formatNumber(creative.last_30d_clicks)
                                    }
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {creative.last_30d_leads > 0 ? 'leads' : 'clicks'}
                                  </div>
                                </td>
                                <td className="text-right p-4">
                                  <div className="text-sm text-gray-900">
                                    {creative.last_7d_leads > 0 
                                      ? creative.last_7d_leads.toFixed(0)
                                      : formatNumber(creative.last_7d_clicks)
                                    }
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {creative.last_7d_leads > 0 ? 'leads' : 'clicks'}
                                  </div>
                                </td>
                                <td className="text-right p-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {getPrimaryMetricValue(creative)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {getPrimaryMetricLabel(creative)}
                                  </div>
                                </td>
                                <td className="text-center p-4">
                                  <div className="flex items-center justify-center gap-1">
                                    {getTrendIcon(creative.spend_trend_7d)}
                                    {getTrendIcon(creative.lead_trend_7d)}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {campaigns.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Target className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No campaign data available</p>
              <p className="text-sm">Try adjusting the date range or filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MetaAdsCreativeTableView;