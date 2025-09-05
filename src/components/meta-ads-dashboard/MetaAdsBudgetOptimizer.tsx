import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Target,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Pause,
  Play
} from 'lucide-react';

interface BudgetOptimizationInsight {
  type: 'opportunity' | 'warning' | 'action';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action: string;
  icon: React.ReactNode;
}

interface CampaignSummary {
  total_campaigns: number;
  total_spend: number;
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
}

interface MetaAdsBudgetOptimizerProps {
  summary: CampaignSummary;
  timeRange: string;
  isLoading: boolean;
}

const MetaAdsBudgetOptimizer: React.FC<MetaAdsBudgetOptimizerProps> = ({
  summary,
  timeRange,
  isLoading
}) => {
  const formatCurrency = (amount: number): string => {
    return `฿${Math.round(amount).toLocaleString('th-TH')}`;
  };
  
  // Generate smart insights based on campaign performance
  const generateInsights = (): BudgetOptimizationInsight[] => {
    const insights: BudgetOptimizationInsight[] = [];
    
    // High performing campaigns opportunity
    if (summary.budget_recommendations.scale_up > 0) {
      insights.push({
        type: 'opportunity',
        priority: 'high',
        title: `${summary.budget_recommendations.scale_up} Campaigns Ready to Scale`,
        description: `High-performing campaigns with excellent efficiency ratings`,
        impact: `Potential 20-40% increase in results`,
        action: 'Increase budget by 20% on top performers',
        icon: <TrendingUp className="h-4 w-4 text-green-600" />
      });
    }
    
    // Performance optimization insights for 'Good' campaigns
    if (summary.good_campaigns > 0 && summary.average_performance_score >= 60 && summary.average_performance_score < 75) {
      insights.push({
        type: 'opportunity',
        priority: 'medium',
        title: `${summary.good_campaigns} Campaigns Can Be Optimized`,
        description: `Good performance (${summary.average_performance_score}/100) with room for improvement`,
        impact: `Potential to reach 80+ performance scores`,
        action: 'Test new audiences or refresh creatives',
        icon: <Target className="h-4 w-4 text-blue-600" />
      });
    }
    
    // Budget efficiency insight
    if (summary.total_spend > 15000 && summary.average_performance_score < 70) {
      const potentialSavings = Math.round(summary.total_spend * 0.15);
      insights.push({
        type: 'action',
        priority: 'medium',
        title: 'Budget Efficiency Opportunity',
        description: `Large spend (${formatCurrency(summary.total_spend)}) with moderate performance`,
        impact: `Could save ~${formatCurrency(potentialSavings)} through optimization`,
        action: 'Review targeting and creative strategy',
        icon: <BarChart3 className="h-4 w-4 text-orange-600" />
      });
    }
    
    // Underperforming campaigns warning
    if (summary.needs_review_campaigns > 0) {
      const wastagePercentage = Math.round((summary.needs_review_campaigns / summary.total_campaigns) * 100);
      insights.push({
        type: 'warning',
        priority: 'high',
        title: `${summary.needs_review_campaigns} Campaigns Need Review`,
        description: `${wastagePercentage}% of campaigns underperforming`,
        impact: `Potential budget waste of ฿${Math.round(summary.total_spend * 0.2).toLocaleString()}`,
        action: 'Pause or optimize underperformers',
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />
      });
    }
    
    // Budget reallocation opportunity
    if (summary.budget_recommendations.pause > 0 && summary.budget_recommendations.scale_up > 0) {
      insights.push({
        type: 'action',
        priority: 'medium',
        title: 'Budget Reallocation Opportunity',
        description: `Move budget from ${summary.budget_recommendations.pause} poor performers to ${summary.budget_recommendations.scale_up} winners`,
        impact: 'Estimated +30% efficiency improvement',
        action: 'Reallocate ฿15,000-25,000 weekly',
        icon: <BarChart3 className="h-4 w-4 text-blue-600" />
      });
    }
    
    // Overall performance assessment - adjusted threshold
    if (summary.average_performance_score < 65) {
      insights.push({
        type: 'warning',
        priority: 'medium',
        title: 'Campaign Portfolio Below Optimal',
        description: `Average score: ${summary.average_performance_score}/100 (Target: 75+)`,
        impact: 'Missing potential ROI and efficiency gains',
        action: 'Review creative strategy and targeting',
        icon: <TrendingDown className="h-4 w-4 text-orange-600" />
      });
    }
    
    // Stable performance insight when no major issues
    if (insights.length === 0) {
      insights.push({
        type: 'action',
        priority: 'low',
        title: 'Campaigns Performing Steadily',
        description: `Portfolio maintaining ${summary.average_performance_score}/100 performance`,
        impact: 'Consistent results with optimization opportunities',
        action: 'Consider A/B testing new creatives or audiences',
        icon: <Target className="h-4 w-4 text-gray-600" />
      });
    }
    
    return insights;
  };

  const insights = generateInsights();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Allocation Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Budget Allocation Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Performance Distribution */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Performance Distribution</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Badge className="bg-green-100 text-green-800 text-xs">Excellent</Badge>
                  <span className="text-sm font-medium">{summary.excellent_campaigns}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge className="bg-blue-100 text-blue-800 text-xs">Good</Badge>
                  <span className="text-sm font-medium">{summary.good_campaigns}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge className="bg-red-100 text-red-800 text-xs">Needs Review</Badge>
                  <span className="text-sm font-medium">{summary.needs_review_campaigns}</span>
                </div>
              </div>
            </div>
            
            {/* Budget Recommendations */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Budget Actions</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <ArrowUp className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-gray-600">Scale Up</span>
                  </div>
                  <span className="text-sm font-medium text-green-600">{summary.budget_recommendations.scale_up}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <ArrowDown className="h-3 w-3 text-yellow-600" />
                    <span className="text-xs text-gray-600">Scale Down</span>
                  </div>
                  <span className="text-sm font-medium text-yellow-600">{summary.budget_recommendations.scale_down}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Pause className="h-3 w-3 text-red-600" />
                    <span className="text-xs text-gray-600">Pause</span>
                  </div>
                  <span className="text-sm font-medium text-red-600">{summary.budget_recommendations.pause}</span>
                </div>
              </div>
            </div>
            
            {/* Overall Health Score */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Portfolio Health</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${
                      summary.average_performance_score >= 70 ? 'bg-green-500' :
                      summary.average_performance_score >= 50 ? 'bg-blue-500' :
                      summary.average_performance_score >= 30 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${summary.average_performance_score}%` }}
                  />
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {summary.average_performance_score}/100
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Avg Performance Score
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Quick Stats</div>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-gray-600">Total Spend:</span>
                  <span className="font-medium ml-1">{formatCurrency(summary.total_spend)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-medium ml-1">{summary.total_campaigns} campaigns</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Period:</span>
                  <span className="font-medium ml-1">{timeRange} days</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Insights & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Smart Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`border-l-4 p-4 rounded-r-lg ${
                    insight.type === 'opportunity' ? 'border-green-500 bg-green-50' :
                    insight.type === 'warning' ? 'border-red-500 bg-red-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-0.5">{insight.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {insight.title}
                          </h4>
                          <Badge className={`text-xs ${
                            insight.priority === 'high' ? 'bg-red-100 text-red-800' :
                            insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {insight.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Impact:</span> {insight.impact}
                          </div>
                          <div className="text-xs text-gray-900 font-medium">
                            {insight.action}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4 text-xs"
                    >
                      Take Action
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No specific insights available</p>
              <p className="text-sm">Your campaigns are performing within expected ranges</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MetaAdsBudgetOptimizer;