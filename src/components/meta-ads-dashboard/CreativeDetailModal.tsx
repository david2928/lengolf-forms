import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Play,
  Target,
  Calendar,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  MousePointer,
  Users,
  DollarSign,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { CreativePerformanceDisplay } from '@/types/meta-ads';


interface CreativeDetailModalProps {
  creative: CreativePerformanceDisplay | null;
  isOpen: boolean;
  onClose: () => void;
}

const CreativeDetailModal: React.FC<CreativeDetailModalProps> = ({
  creative,
  isOpen,
  onClose
}) => {
  if (!creative) return null;

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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'down': return <ArrowDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActionConfig = (status: string) => {
    switch (status) {
      case 'scale':
        return {
          color: 'bg-green-100 text-green-700 border-green-200',
          emoji: '🚀',
          title: 'Scale Winner',
          description: 'This creative is performing above benchmarks. Consider increasing budget allocation.'
        };
      case 'keep':
        return {
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          emoji: '✅',
          title: 'Keep Running',
          description: 'Performance is good. Continue with current budget and monitor regularly.'
        };
      case 'monitor':
        return {
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          emoji: '👁️',
          title: 'Monitor Closely',
          description: 'Performance is near threshold. Watch for changes and be ready to optimize.'
        };
      case 'refresh':
        return {
          color: 'bg-orange-100 text-orange-700 border-orange-200',
          emoji: '⚠️',
          title: 'Refresh Creative',
          description: 'Creative fatigue detected. Create new variations or refresh the existing creative.'
        };
      case 'pause':
        return {
          color: 'bg-red-100 text-red-700 border-red-200',
          emoji: '🛑',
          title: 'Consider Pausing',
          description: 'Performance is below benchmarks. Review targeting or pause to prevent budget waste.'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          emoji: '❓',
          title: 'Unknown Status',
          description: 'Status could not be determined.'
        };
    }
  };

  const getObjectiveInfo = (objective: string) => {
    switch (objective) {
      case 'OUTCOME_TRAFFIC':
        return {
          icon: '🚶',
          title: 'Traffic',
          description: 'Driving website visitors',
          primaryMetric: 'Cost per Click'
        };
      case 'OUTCOME_LEADS':
        return {
          icon: '🎯',
          title: 'Leads',
          description: 'Generating lead conversions',
          primaryMetric: 'Cost per Lead'
        };
      case 'OUTCOME_SALES':
        return {
          icon: '🎯',
          title: 'Sales',
          description: 'Driving sales conversions',
          primaryMetric: 'Cost per Sale'
        };
      case 'OUTCOME_ENGAGEMENT':
        return {
          icon: '💬',
          title: 'Engagement',
          description: 'Maximizing interactions',
          primaryMetric: 'Click-through Rate'
        };
      default:
        return {
          icon: '📊',
          title: 'Unknown',
          description: 'Unknown objective',
          primaryMetric: 'N/A'
        };
    }
  };

  const actionConfig = getActionConfig(creative.action_status);
  const objectiveInfo = getObjectiveInfo(creative.campaign_objective);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <DialogTitle className="text-xl font-semibold text-gray-900 mb-2">
                {creative.creative_name}
              </DialogTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="text-sm">
                  {creative.creative_type}
                </Badge>
                <Badge className={`text-sm ${actionConfig.color} border`}>
                  {actionConfig.emoji} {actionConfig.title}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {objectiveInfo.icon} {objectiveInfo.title}
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column - Creative Preview & Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Creative Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Creative Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {creative.thumbnail_url || creative.image_url ? (
                  <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={creative.thumbnail_url || creative.image_url}
                      alt={creative.creative_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    {creative.creative_type === 'VIDEO' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="h-12 w-12 text-blue-600" />
                  </div>
                )}

                {/* Creative Details */}
                <div className="mt-4 space-y-3">
                  {creative.title && (
                    <div>
                      <div className="text-sm font-medium text-gray-700">Title</div>
                      <div className="text-sm text-gray-900 mt-1">{creative.title}</div>
                    </div>
                  )}
                  
                  {creative.body && (
                    <div>
                      <div className="text-sm font-medium text-gray-700">Description</div>
                      <div className="text-sm text-gray-900 mt-1 line-clamp-3">{creative.body}</div>
                    </div>
                  )}
                  
                  {creative.call_to_action && (
                    <div>
                      <div className="text-sm font-medium text-gray-700">Call to Action</div>
                      <Badge variant="outline" className="mt-1">
                        {creative.call_to_action}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Campaign Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Campaign Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">Campaign</div>
                  <div className="text-sm text-gray-900 mt-1">{creative.campaign_name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Objective</div>
                  <div className="text-sm text-gray-900 mt-1 flex items-center gap-2">
                    <span>{objectiveInfo.icon}</span>
                    <span>{objectiveInfo.title}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{objectiveInfo.description}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Primary Metric</div>
                  <div className="text-sm text-gray-900 mt-1">{objectiveInfo.primaryMetric}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Performance Data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Action Recommendation */}
            <Card className={actionConfig.color}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-xl">{actionConfig.emoji}</span>
                  Recommendation: {actionConfig.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">{actionConfig.description}</p>
                <div className="text-xs text-gray-700">
                  <strong>Reason:</strong> {creative.action_reason}
                </div>
              </CardContent>
            </Card>

            {/* Key Performance Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(creative.total_spend)}
                      </p>
                      <p className="text-sm text-gray-600">Total Spend</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-600 opacity-70" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatNumber(creative.total_impressions)}
                      </p>
                      <p className="text-sm text-gray-600">Impressions</p>
                    </div>
                    <Eye className="h-8 w-8 text-purple-600 opacity-70" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatNumber(creative.total_clicks)}
                      </p>
                      <p className="text-sm text-gray-600">Clicks</p>
                    </div>
                    <MousePointer className="h-8 w-8 text-green-600 opacity-70" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {creative.total_leads || 0}
                      </p>
                      <p className="text-sm text-gray-600">Leads</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600 opacity-70" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Ratios */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Ratios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">
                      {formatCTR(creative.average_ctr)}
                    </div>
                    <div className="text-sm text-gray-600">CTR</div>
                    <div className="flex items-center justify-center mt-1">
                      {getTrendIcon(creative.ctr_trend_7d || 'stable')}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">
                      {formatCurrency(creative.average_cpc)}
                    </div>
                    <div className="text-sm text-gray-600">Avg CPC</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">
                      {formatCurrency(creative.average_cpm)}
                    </div>
                    <div className="text-sm text-gray-600">Avg CPM</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">
                      {creative.frequency > 0 ? creative.frequency.toFixed(2) : '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">Frequency</div>
                    {creative.frequency > 2.5 && (
                      <div className="text-xs text-orange-600 mt-1">High</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Period Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Time Period Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Period</th>
                        <th className="text-right py-2">Spend</th>
                        <th className="text-right py-2">Impressions</th>
                        <th className="text-right py-2">Clicks</th>
                        <th className="text-right py-2">Results</th>
                        <th className="text-center py-2">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 font-medium">Total (All Time)</td>
                        <td className="text-right py-2">{formatCurrency(creative.total_spend)}</td>
                        <td className="text-right py-2">{formatNumber(creative.total_impressions)}</td>
                        <td className="text-right py-2">{formatNumber(creative.total_clicks)}</td>
                        <td className="text-right py-2">{creative.total_leads || 0}</td>
                        <td className="text-center py-2">-</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">Last 30 Days</td>
                        <td className="text-right py-2">{formatCurrency(creative.last_30d_spend)}</td>
                        <td className="text-right py-2">{formatNumber(creative.last_30d_impressions)}</td>
                        <td className="text-right py-2">{formatNumber(creative.last_30d_clicks)}</td>
                        <td className="text-right py-2">{creative.last_30d_leads || 0}</td>
                        <td className="text-center py-2">-</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Last 7 Days</td>
                        <td className="text-right py-2">{formatCurrency(creative.last_7d_spend)}</td>
                        <td className="text-right py-2">{formatNumber(creative.last_7d_impressions)}</td>
                        <td className="text-right py-2">{formatNumber(creative.last_7d_clicks)}</td>
                        <td className="text-right py-2">{creative.last_7d_leads || 0}</td>
                        <td className="text-center py-2">
                          <div className="flex items-center justify-center gap-1">
                            {getTrendIcon(creative.spend_trend_7d)}
                            {getTrendIcon(creative.lead_trend_7d)}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatDate(creative.launch_date)}
                    </div>
                    <div className="text-sm text-gray-600">Launch Date</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {creative.days_active}
                    </div>
                    <div className="text-sm text-gray-600">Days Active</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatDate(creative.last_active_date || creative.launch_date)}
                    </div>
                    <div className="text-sm text-gray-600">Last Active</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* External Links */}
            <div className="flex justify-center">
              <Button variant="outline" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                View in Meta Ads Manager
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreativeDetailModal;