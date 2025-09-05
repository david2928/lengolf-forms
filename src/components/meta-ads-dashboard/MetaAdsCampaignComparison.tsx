import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowUp, 
  ArrowDown, 
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Users,
  DollarSign
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
  performance_score: number;
  efficiency_rating: 'Excellent' | 'Good' | 'Average' | 'Needs Review';
  budget_recommendation: 'Scale Up' | 'Maintain' | 'Scale Down' | 'Pause';
  actual_leads: number;
  cost_per_lead: number;
  trends: {
    ctr_7d: number;
    ctr_30d: number;
    ctr_90d: number;
    cpc_7d: number;
    cpc_30d: number;
    cpc_90d: number;
    frequency_trend: 'Rising' | 'Stable' | 'Declining';
  };
}

interface MetaAdsCampaignComparisonProps {
  campaigns: CampaignPerformance[];
  timeRange: string;
}

const MetaAdsCampaignComparison: React.FC<MetaAdsCampaignComparisonProps> = ({
  campaigns,
  timeRange
}) => {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState<'performance' | 'trends' | 'leads'>('performance');

  const formatCurrency = (amount: number): string => {
    return `฿${Math.round(amount).toLocaleString('th-TH')}`;
  };

  const formatCTR = (ctr: number): string => {
    return `${ctr.toFixed(2)}%`;
  };

  const getTrendIcon = (current: number, previous: number, isReversed = false) => {
    const change = ((current - previous) / previous) * 100;
    const threshold = 10;
    
    if (Math.abs(change) < 5) return <Minus className="h-4 w-4 text-gray-400" />;
    
    if (isReversed) {
      return change < -threshold ? <ArrowUp className="h-4 w-4 text-green-600" /> : <ArrowDown className="h-4 w-4 text-red-600" />;
    }
    return change > threshold ? <ArrowUp className="h-4 w-4 text-green-600" /> : <ArrowDown className="h-4 w-4 text-red-600" />;
  };

  const getTrendInsight = (campaign: CampaignPerformance) => {
    const ctrTrend = ((campaign.trends.ctr_7d - campaign.trends.ctr_30d) / campaign.trends.ctr_30d) * 100;
    const cpcTrend = ((campaign.trends.cpc_7d - campaign.trends.cpc_30d) / campaign.trends.cpc_30d) * 100;
    
    if (ctrTrend > 15 && cpcTrend < -10) return { text: "Strong momentum - Scale Up", color: "text-green-600", icon: TrendingUp };
    if (ctrTrend < -15) return { text: "Declining performance - Review", color: "text-red-600", icon: TrendingDown };
    if (campaign.average_frequency > 4) return { text: "Audience fatigue - Refresh", color: "text-orange-600", icon: Target };
    return { text: "Stable performance", color: "text-gray-600", icon: Minus };
  };

  const toggleCampaignSelection = (campaignId: string) => {
    setSelectedCampaigns(prev => {
      if (prev.includes(campaignId)) {
        return prev.filter(id => id !== campaignId);
      }
      if (prev.length < 3) {
        return [...prev, campaignId];
      }
      return prev;
    });
  };

  const getSelectedCampaigns = () => {
    return campaigns.filter(c => selectedCampaigns.includes(c.campaign_id));
  };

  const generateBudgetRecommendations = () => {
    const leadCampaigns = campaigns.filter(c => c.objective === 'LEADS' && c.actual_leads > 0);
    if (leadCampaigns.length < 2) return [];

    const bestPerformer = leadCampaigns.reduce((best, current) => 
      current.cost_per_lead < best.cost_per_lead ? current : best
    );
    
    const worstPerformer = leadCampaigns.reduce((worst, current) => 
      current.cost_per_lead > worst.cost_per_lead ? current : worst
    );

    if (bestPerformer.campaign_id === worstPerformer.campaign_id) return [];

    const potentialSavings = (worstPerformer.cost_per_lead - bestPerformer.cost_per_lead) * worstPerformer.actual_leads;
    const recommendedReallocation = Math.min(worstPerformer.total_spend * 0.3, potentialSavings);

    return [{
      from: worstPerformer.campaign_name,
      to: bestPerformer.campaign_name,
      amount: recommendedReallocation,
      reasoning: `${formatCurrency(worstPerformer.cost_per_lead)}/lead vs ${formatCurrency(bestPerformer.cost_per_lead)}/lead`,
      impact: `Save ~${formatCurrency(potentialSavings)} on lead acquisition`
    }];
  };

  return (
    <div className="space-y-6">
      {/* Campaign Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campaign Performance Analysis ({campaigns.length} campaigns)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(campaigns.reduce((sum, c) => sum + c.total_spend, 0))}
                </div>
                <div className="text-sm text-gray-600">Total Spend</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {campaigns.reduce((sum, c) => sum + c.actual_leads, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {campaigns.reduce((sum, c) => sum + c.total_clicks, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Clicks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(campaigns.reduce((sum, c) => sum + c.performance_score, 0) / campaigns.length)}/100
                </div>
                <div className="text-sm text-gray-600">Avg Score</div>
              </div>
            </div>

            {/* Campaign Cards */}
            <div className="grid gap-4">
              {campaigns.map((campaign) => {
                const isSelected = selectedCampaigns.includes(campaign.campaign_id);
                const insight = getTrendInsight(campaign);
                const Icon = insight.icon;

                return (
                  <div
                    key={campaign.campaign_id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleCampaignSelection(campaign.campaign_id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Campaign Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm mb-1">
                              {campaign.campaign_name.split('_')[0]} {/* Simplified name */}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${
                                campaign.objective === 'LEADS' ? 'bg-purple-100 text-purple-800' :
                                campaign.objective === 'SALES' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {campaign.objective.replace('OUTCOME_', '')}
                              </Badge>
                              <Badge className={`text-xs ${
                                campaign.efficiency_rating === 'Excellent' ? 'bg-green-100 text-green-800' :
                                campaign.efficiency_rating === 'Good' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {campaign.performance_score}/100
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Main Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-lg font-bold text-gray-900">
                              {formatCurrency(campaign.total_spend)}
                            </div>
                            <div className="text-xs text-gray-500">Spend</div>
                          </div>
                          
                          {campaign.objective === 'LEADS' ? (
                            <div>
                              <div className="text-lg font-bold text-purple-600">
                                {campaign.actual_leads}
                              </div>
                              <div className="text-xs text-gray-500">Leads</div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-lg font-bold text-blue-600">
                                {formatCTR(campaign.average_ctr)}
                              </div>
                              <div className="text-xs text-gray-500">CTR</div>
                            </div>
                          )}

                          <div>
                            <div className="text-lg font-bold text-gray-900">
                              {campaign.objective === 'LEADS' && campaign.cost_per_lead > 0 ? 
                                formatCurrency(campaign.cost_per_lead) :
                                formatCurrency(campaign.average_cpc)
                              }
                            </div>
                            <div className="text-xs text-gray-500">
                              {campaign.objective === 'LEADS' ? 'Per Lead' : 'CPC'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${insight.color}`} />
                            <div>
                              <div className={`text-sm font-medium ${insight.color}`}>
                                {insight.text.split(' - ')[1] || insight.text}
                              </div>
                              <div className="text-xs text-gray-500">Trend</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Recommendations */}
      {generateBudgetRecommendations().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Budget Reallocation Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generateBudgetRecommendations().map((rec, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 rounded-r-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-1">
                        Move {formatCurrency(rec.amount)} Budget
                      </h4>
                      <p className="text-sm text-blue-800 mb-2">
                        From: {rec.from.split('_')[0]} → To: {rec.to.split('_')[0]}
                      </p>
                      <p className="text-sm text-blue-700">
                        <strong>Reason:</strong> {rec.reasoning}
                      </p>
                      <p className="text-sm text-blue-600">
                        <strong>Potential Impact:</strong> {rec.impact}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side-by-Side Comparison */}
      {selectedCampaigns.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Campaign Comparison ({selectedCampaigns.length} selected)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Metric</th>
                    {getSelectedCampaigns().map((campaign, index) => (
                      <th key={campaign.campaign_id} className="text-left py-3 px-4">
                        <div className="space-y-1">
                          <div className="font-semibold">
                            Campaign {index + 1}
                          </div>
                          <div className="text-xs font-normal text-gray-500">
                            {campaign.campaign_name.split('_')[0]}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Spend</td>
                    {getSelectedCampaigns().map((campaign) => (
                      <td key={campaign.campaign_id} className="py-3 px-4">
                        {formatCurrency(campaign.total_spend)}
                      </td>
                    ))}
                  </tr>
                  {getSelectedCampaigns().some(c => c.objective === 'LEADS') && (
                    <>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Leads</td>
                        {getSelectedCampaigns().map((campaign) => (
                          <td key={campaign.campaign_id} className="py-3 px-4">
                            <span className={campaign.objective === 'LEADS' ? 'font-semibold text-purple-600' : 'text-gray-400'}>
                              {campaign.objective === 'LEADS' ? campaign.actual_leads : 'N/A'}
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Cost per Lead</td>
                        {getSelectedCampaigns().map((campaign) => (
                          <td key={campaign.campaign_id} className="py-3 px-4">
                            <span className={campaign.objective === 'LEADS' && campaign.cost_per_lead > 0 ? 
                              (campaign.cost_per_lead < 2000 ? 'font-semibold text-green-600' : 
                               campaign.cost_per_lead < 3000 ? 'font-semibold text-yellow-600' : 
                               'font-semibold text-red-600') : 'text-gray-400'}>
                              {campaign.objective === 'LEADS' && campaign.cost_per_lead > 0 ? 
                                formatCurrency(campaign.cost_per_lead) : 'N/A'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">CTR</td>
                    {getSelectedCampaigns().map((campaign) => (
                      <td key={campaign.campaign_id} className="py-3 px-4">
                        {formatCTR(campaign.average_ctr)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Performance Score</td>
                    {getSelectedCampaigns().map((campaign) => (
                      <td key={campaign.campaign_id} className="py-3 px-4">
                        <span className={
                          campaign.performance_score >= 75 ? 'font-semibold text-green-600' :
                          campaign.performance_score >= 60 ? 'font-semibold text-blue-600' :
                          'font-semibold text-yellow-600'
                        }>
                          {campaign.performance_score}/100
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Recommendation</td>
                    {getSelectedCampaigns().map((campaign) => {
                      const insight = getTrendInsight(campaign);
                      return (
                        <td key={campaign.campaign_id} className={`py-3 px-4 font-semibold ${insight.color}`}>
                          {insight.text}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MetaAdsCampaignComparison;