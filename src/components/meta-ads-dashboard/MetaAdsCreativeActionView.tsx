import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Play,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
  Target
} from 'lucide-react';

import { CreativePerformanceDisplay, ActionGroups } from '@/types/meta-ads';


interface MetaAdsCreativeActionViewProps {
  actionGroups: ActionGroups;
  isLoading: boolean;
  summary: {
    scale_count: number;
    keep_count: number;
    monitor_count: number;
    refresh_count: number;
    pause_count: number;
    total_spend: number;
    last_7d_spend: number;
  };
  onCreativeClick?: (creative: CreativePerformanceDisplay) => void;
}

const MetaAdsCreativeActionView: React.FC<MetaAdsCreativeActionViewProps> = ({
  actionGroups,
  isLoading,
  summary,
  onCreativeClick
}) => {
  const formatCurrency = (amount: number): string => {
    return `฿${Math.round(amount).toLocaleString('th-TH')}`;
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

  const getActionConfig = (status: string) => {
    switch (status) {
      case 'scale':
        return {
          title: 'Scale Winners',
          icon: TrendingUp,
          color: 'bg-green-50 border-green-200',
          iconColor: 'text-green-600',
          badgeColor: 'bg-green-100 text-green-700',
          description: 'Top performers - increase budget',
          emoji: '🚀'
        };
      case 'keep':
        return {
          title: 'Keep Running',
          icon: CheckCircle,
          color: 'bg-blue-50 border-blue-200',
          iconColor: 'text-blue-600',
          badgeColor: 'bg-blue-100 text-blue-700',
          description: 'Good performance - maintain current spend',
          emoji: '✅'
        };
      case 'monitor':
        return {
          title: 'Monitor Closely',
          icon: Eye,
          color: 'bg-yellow-50 border-yellow-200',
          iconColor: 'text-yellow-600',
          badgeColor: 'bg-yellow-100 text-yellow-700',
          description: 'Watch for changes - may need action soon',
          emoji: '👁️'
        };
      case 'refresh':
        return {
          title: 'Refresh Creative',
          icon: AlertTriangle,
          color: 'bg-orange-50 border-orange-200',
          iconColor: 'text-orange-600',
          badgeColor: 'bg-orange-100 text-orange-700',
          description: 'Creative fatigue detected - needs new creative',
          emoji: '⚠️'
        };
      case 'pause':
        return {
          title: 'Consider Pausing',
          icon: XCircle,
          color: 'bg-red-50 border-red-200',
          iconColor: 'text-red-600',
          badgeColor: 'bg-red-100 text-red-700',
          description: 'Poor performance - review or pause',
          emoji: '🛑'
        };
      default:
        return {
          title: 'Unknown',
          icon: Eye,
          color: 'bg-gray-50 border-gray-200',
          iconColor: 'text-gray-600',
          badgeColor: 'bg-gray-100 text-gray-700',
          description: 'Unknown status',
          emoji: '❓'
        };
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

  const renderCreativeCard = (creative: CreativePerformanceDisplay) => {
    const config = getActionConfig(creative.action_status);
    
    return (
      <div
        key={creative.creative_id}
        className={`p-3 border rounded-lg cursor-pointer hover:shadow-md transition-all duration-200 ${config.color}`}
        onClick={() => onCreativeClick?.(creative)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{config.emoji}</span>
              <Badge className={`text-xs ${config.badgeColor} border-0`}>
                {creative.creative_type}
              </Badge>
              {creative.frequency > 2.0 && (
                <Badge className="text-xs bg-orange-100 text-orange-700 border-0">
                  High Freq
                </Badge>
              )}
            </div>
            <h4 className="font-medium text-sm text-gray-900 line-clamp-2 leading-tight">
              {creative.creative_name}
            </h4>
          </div>
          
          {/* Creative Preview */}
          <div className="flex-shrink-0 ml-3">
            {creative.thumbnail_url || creative.image_url ? (
              <div className="relative w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={creative.thumbnail_url || creative.image_url}
                  alt="Creative"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                {creative.creative_type === 'VIDEO' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                    <Play className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
            )}
          </div>
        </div>

        {/* Key Metric */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Key Metric</span>
            <div className="flex items-center gap-1">
              {getTrendIcon(creative.spend_trend_7d)}
              <span className="text-xs text-gray-500">7d</span>
            </div>
          </div>
          <div className="mt-1">
            {creative.campaign_objective === 'OUTCOME_LEADS' || creative.campaign_objective === 'OUTCOME_SALES' ? (
              <div className="text-base font-bold text-gray-900">
                {creative.total_leads > 0 
                  ? formatCurrency(creative.cost_per_result) 
                  : formatCTR(creative.average_ctr)
                }
              </div>
            ) : creative.campaign_objective === 'OUTCOME_TRAFFIC' ? (
              <div className="text-base font-bold text-gray-900">
                {formatCurrency(creative.cost_per_result)}
              </div>
            ) : (
              <div className="text-base font-bold text-gray-900">
                {formatCTR(creative.average_ctr)}
              </div>
            )}
            <div className="text-xs text-gray-600">
              {creative.campaign_objective === 'OUTCOME_LEADS' || creative.campaign_objective === 'OUTCOME_SALES' ? (
                creative.total_leads > 0 ? 'Cost/Lead' : 'CTR (no leads)'
              ) : creative.campaign_objective === 'OUTCOME_TRAFFIC' ? (
                'Cost/Click'
              ) : (
                'CTR'
              )}
            </div>
          </div>
        </div>

        {/* Spend and Stats */}
        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
          <div className="text-center p-2 bg-white/60 rounded">
            <div className="font-semibold text-gray-900">
              {formatCurrency(creative.total_spend)}
            </div>
            <div className="text-gray-600">Total Spend</div>
          </div>
          <div className="text-center p-2 bg-white/60 rounded">
            <div className="font-semibold text-gray-900">
              {creative.total_leads || 0}
            </div>
            <div className="text-gray-600">Results</div>
          </div>
        </div>

        {/* Campaign and Time Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>{getObjectiveIcon(creative.campaign_objective)}</span>
            <span className="truncate">{creative.campaign_name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>{creative.days_active} days active</span>
          </div>
        </div>

        {/* Action Reason */}
        <div className="mt-3 pt-2 border-t border-white/40">
          <div className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
            {creative.action_reason}
          </div>
        </div>
      </div>
    );
  };

  const renderActionGroup = (status: string, creatives: CreativePerformanceDisplay[]) => {
    const config = getActionConfig(status);
    const Icon = config.icon;
    
    if (creatives.length === 0) return null;

    return (
      <div key={status} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${config.color}`}>
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-xl">{config.emoji}</span>
              {config.title}
              <Badge className={`${config.badgeColor} border-0`}>
                {creatives.length}
              </Badge>
            </h3>
            <p className="text-sm text-gray-600">{config.description}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {creatives.map(renderCreativeCard)}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {['scale', 'keep', 'monitor', 'refresh', 'pause'].map((status) => (
          <div key={status} className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {summary.scale_count}
              </div>
              <div className="text-sm text-gray-600">🚀 Scale</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {summary.keep_count}
              </div>
              <div className="text-sm text-gray-600">✅ Keep</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {summary.monitor_count}
              </div>
              <div className="text-sm text-gray-600">👁️ Monitor</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {summary.refresh_count}
              </div>
              <div className="text-sm text-gray-600">⚠️ Refresh</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {summary.pause_count}
              </div>
              <div className="text-sm text-gray-600">🛑 Pause</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/40 flex justify-center">
            <div className="text-sm text-gray-600">
              Total spend: <span className="font-semibold">{formatCurrency(summary.total_spend)}</span> • 
              Last 7 days: <span className="font-semibold">{formatCurrency(summary.last_7d_spend)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Groups */}
      <div>
        {renderActionGroup('scale', actionGroups?.scale || [])}
        {renderActionGroup('keep', actionGroups?.keep || [])}
        {renderActionGroup('monitor', actionGroups?.monitor || [])}
        {renderActionGroup('refresh', actionGroups?.refresh || [])}
        {renderActionGroup('pause', actionGroups?.pause || [])}
      </div>

      {/* Empty State */}
      {actionGroups && Object.values(actionGroups).every(group => group?.length === 0) && (
        <div className="text-center py-12 text-gray-500">
          <Target className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No creative data available</p>
          <p className="text-sm">Try adjusting the date range or filters</p>
        </div>
      )}
    </div>
  );
};

export default MetaAdsCreativeActionView;