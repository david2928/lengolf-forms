import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
  Image as ImageIcon,
  Video,
  FileText,
  Play,
  Eye,
  MousePointer,
  Calendar,
  ExternalLink,
  LayoutGrid,
  List,
  Target
} from 'lucide-react';
import MetaAdsCreativeActionView from './MetaAdsCreativeActionView';
import MetaAdsCreativeTableView from './MetaAdsCreativeTableView';
import CreativeDetailModal from './CreativeDetailModal';
import {
  CreativePerformanceDisplay,
  ActionGroups,
  CampaignGroup,
  ActionViewSummary,
  TableViewSummary
} from '@/types/meta-ads';

interface CreativePerformance {
  creative_id: string;
  creative_name: string;
  creative_type: string;
  thumbnail_url?: string;
  image_url?: string;
  video_url?: string;
  title?: string;
  body?: string;
  call_to_action?: string;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  average_ctr: number;
  average_cpm: number;
  average_cpc: number;
  total_reach: number;
  average_frequency: number;
  total_leads: number;
  lead_rate: number;
  cost_per_lead: number;
  first_seen: string;
  last_seen: string;
  days_active: number;
  campaign_info?: {
    campaign_name: string;
    campaign_id: string;
    campaign_objective: string;
  };
  // Smart performance metrics
  performance_score: number;
  efficiency_rating: string;
  objective_kpi_value: number;
  objective_kpi_label: string;
}


interface CreativeGalleryData {
  creatives: CreativePerformance[];
  total: number;
  has_more: boolean;
  summary: {
    total_creatives: number;
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_leads: number;
    average_performance_score: number;
    excellent_creatives: number;
    good_creatives: number;
    needs_review_creatives: number;
    creative_types: string[];
    campaign_objectives: string[];
    date_range: {
      start: string;
      end: string;
      days: number;
    };
  };
}

// V2 API Response interfaces
interface ActionViewData {
  view: 'action';
  creatives: CreativePerformanceDisplay[];
  actionGroups: ActionGroups;
  summary: ActionViewSummary;
}

interface TableViewData {
  view: 'table';
  campaigns: CampaignGroup[];
  summary: TableViewSummary;
}

interface MetaAdsCreativeGalleryProps {
  timeRange: string;
  referenceDate: string;
  isLoading: boolean;
}

const MetaAdsCreativeGallery: React.FC<MetaAdsCreativeGalleryProps> = ({
  timeRange,
  referenceDate,
  isLoading
}) => {
  const [view, setView] = useState<'action' | 'table' | 'gallery'>('action');
  const [creativeData, setCreativeData] = useState<CreativeGalleryData | null>(null);
  const [actionData, setActionData] = useState<ActionViewData | null>(null);
  const [tableData, setTableData] = useState<TableViewData | null>(null);
  const [sortBy, setSortBy] = useState<string>('total_spend');
  const [creativeType, setCreativeType] = useState<string>('all');
  const [adsetFilter, setAdsetFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [selectedCreative, setSelectedCreative] = useState<CreativePerformanceDisplay | null>(null);

  const fetchCreativeData = useCallback(async () => {
    try {
      setIsLoadingGallery(true);
      
      if (view === 'gallery') {
        // Legacy API call for gallery view
        const params = new URLSearchParams({
          days: timeRange,
          referenceDate: referenceDate,
          sortBy: sortBy,
          creativeType: creativeType,
          limit: '24'
        });
        if (adsetFilter !== 'all') {
          params.append('adsetFilter', adsetFilter);
        }
        const response = await fetch(`/api/meta-ads/creatives?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Creative data fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        setCreativeData(data);
      } else {
        // V2 API call for action and table views
        const startDate = new Date();
        const endDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(timeRange));
        
        const groupBy = view === 'table' ? 'campaign' : 'action';
        const params = new URLSearchParams({
          view: view,
          groupBy: groupBy,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });
        if (adsetFilter !== 'all') {
          params.append('adsetFilter', adsetFilter);
        }
        const response = await fetch(`/api/meta-ads/creatives?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Creative data fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (view === 'action') {
          // API already returns display-ready data, just need to convert summary values if needed
          setActionData(data as ActionViewData);
        } else if (view === 'table') {
          setTableData(data as TableViewData);
        }
      }
    } catch (error) {
      console.error('Failed to fetch creative data:', error);
    } finally {
      setIsLoadingGallery(false);
    }
  }, [timeRange, referenceDate, sortBy, creativeType, adsetFilter, view]);

  useEffect(() => {
    if (!isLoading) {
      fetchCreativeData();
    }
  }, [fetchCreativeData, isLoading]);

  const formatCurrency = (amount: number): string => {
    return `฿${Math.round(amount).toLocaleString('th-TH')}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCTR = (ctr: number): string => {
    return `${(ctr * 100).toFixed(2)}%`;
  };

  const getCreativeTypeIcon = (type: string) => {
    const typeIcons = {
      'IMAGE': ImageIcon,
      'VIDEO': Video,
      'CAROUSEL': ImageIcon,
      'TEXT': FileText
    };
    
    const Icon = typeIcons[type as keyof typeof typeIcons] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getCreativeTypeColor = (type: string) => {
    const typeColors = {
      'IMAGE': 'bg-blue-100 text-blue-800',
      'VIDEO': 'bg-red-100 text-red-800', 
      'CAROUSEL': 'bg-purple-100 text-purple-800',
      'TEXT': 'bg-gray-100 text-gray-800'
    };
    
    return typeColors[type as keyof typeof typeColors] || typeColors.TEXT;
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Helper to get unique adsets from current data
  const getUniqueAdsets = () => {
    const adsets = new Set<{id: string, name: string}>();
    
    if (view === 'action' && actionData?.creatives) {
      actionData.creatives.forEach(creative => {
        if (creative.adset_id && creative.adset_name) {
          adsets.add({
            id: creative.adset_id,
            name: creative.adset_name
          });
        }
      });
    } else if (view === 'table' && tableData?.campaigns) {
      tableData.campaigns.forEach(campaign => {
        campaign.creatives.forEach(creative => {
          if (creative.adset_id && creative.adset_name) {
            adsets.add({
              id: creative.adset_id,
              name: creative.adset_name
            });
          }
        });
      });
    } else if (view === 'gallery' && creativeData?.creatives) {
      creativeData.creatives.forEach(creative => {
        // For gallery view, we need to check if the creative has campaign_info with adset data
        // Since the legacy interface doesn't include adset fields directly, we'll skip this for now
        // and handle it when the gallery API is updated to use the V2 format
      });
    }
    
    return Array.from(adsets).sort((a, b) => a.name.localeCompare(b.name));
  };

  if (isLoading || isLoadingGallery) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              {view === 'action' && <Target className="h-5 w-5" />}
              {view === 'table' && <List className="h-5 w-5" />}
              {view === 'gallery' && <ImageIcon className="h-5 w-5" />}
              Creative Performance 
              {view === 'action' && ' - Action View'}
              {view === 'table' && ' - Table View'}
              {view === 'gallery' && ' - Gallery'}
            </CardTitle>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
              <Button
                variant={view === 'action' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('action')}
                className="flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                Actions
              </Button>
              <Button
                variant={view === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('table')}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                Table
              </Button>
              <Button
                variant={view === 'gallery' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('gallery')}
                className="flex items-center gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Gallery
              </Button>
            </div>
          </div>
          
          {/* Filters - show for all views */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Creative Type Filter */}
            {view === 'gallery' && (
              <Select value={creativeType} onValueChange={setCreativeType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="CAROUSEL">Carousel</SelectItem>
                  <SelectItem value="TEXT">Text</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {/* Adset Filter - show for all views */}
            <Select value={adsetFilter} onValueChange={setAdsetFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All Adsets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Adsets</SelectItem>
                {getUniqueAdsets().map(adset => (
                  <SelectItem key={adset.id} value={adset.id}>
                    {adset.name.length > 50 ? `${adset.name.substring(0, 50)}...` : adset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Sort By Filter - only for gallery view */}
            {view === 'gallery' && (
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance_score">Performance Score</SelectItem>
                  <SelectItem value="total_spend">Total Spend</SelectItem>
                  <SelectItem value="total_leads">Leads</SelectItem>
                  <SelectItem value="total_impressions">Impressions</SelectItem>
                  <SelectItem value="total_clicks">Clicks</SelectItem>
                  <SelectItem value="average_ctr">CTR</SelectItem>
                  <SelectItem value="cost_per_lead">Cost per Lead</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* View Mode Toggle - only for gallery view */}
            {view === 'gallery' && (
              <>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Summary based on view */}
        {view === 'action' && actionData && actionData.creatives && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>{actionData.creatives.length} creatives</span>
            <span>•</span>
            <span>{formatCurrency(actionData.summary?.total_spend || 0)} total spend</span>
            <span>•</span>
            <span>🚀 {actionData.summary?.scale_count || 0} scale</span>
            <span>•</span>
            <span>✅ {actionData.summary?.keep_count || 0} keep</span>
            <span>•</span>
            <span>🛑 {actionData.summary?.pause_count || 0} pause</span>
          </div>
        )}
        
        {view === 'table' && tableData && tableData.summary && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>{tableData.summary.total_campaigns || 0} campaigns</span>
            <span>•</span>
            <span>{tableData.summary.total_creatives || 0} creatives</span>
            <span>•</span>
            <span>{formatCurrency(tableData.summary.total_spend || 0)} total spend</span>
            <span>•</span>
            <span>{tableData.summary.total_results || 0} results</span>
          </div>
        )}
        
        {view === 'gallery' && creativeData && creativeData.summary && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>{creativeData.total || 0} creatives</span>
            <span>•</span>
            <span>{formatCurrency(creativeData.summary.total_spend || 0)} total spend</span>
            <span>•</span>
            <span>{creativeData.summary.total_leads || 0} leads</span>
            <span>•</span>
            <span>Avg Score: {creativeData.summary.average_performance_score}/100</span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Action View */}
        {view === 'action' && actionData && (
          <MetaAdsCreativeActionView
            actionGroups={actionData.actionGroups}
            isLoading={isLoadingGallery}
            summary={actionData.summary}
            onCreativeClick={(creative) => setSelectedCreative(creative)}
          />
        )}

        {/* Table View */}
        {view === 'table' && tableData && (
          <MetaAdsCreativeTableView
            campaigns={tableData.campaigns}
            isLoading={isLoadingGallery}
            summary={tableData.summary}
            onCreativeClick={(creative) => setSelectedCreative(creative)}
          />
        )}

        {/* Gallery View */}
        {view === 'gallery' && creativeData?.creatives.length ? (
          <>
            <div className={viewMode === 'grid' ? 
              'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 
              'space-y-4'
            }>
              {creativeData.creatives.map((creative) => (
                <div
                  key={creative.creative_id}
                  className={`border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-200 bg-white ${
                    viewMode === 'grid' ? 'p-4' : 'p-4 flex gap-4'
                  }`}
                >
                  {/* Creative Visual */}
                  <div className={`relative ${
                    viewMode === 'grid' ? 'mb-3' : 'flex-shrink-0 w-32 h-20'
                  }`}>
                    {creative.thumbnail_url || creative.image_url ? (
                      <div className={`relative ${
                        viewMode === 'grid' ? 'aspect-video' : 'w-full h-full'
                      } bg-gray-100 rounded-lg overflow-hidden`}>
                        <Image
                          src={creative.thumbnail_url || creative.image_url || ''}
                          alt={creative.creative_name}
                          fill
                          className="object-cover"
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
                      <div className={`${
                        viewMode === 'grid' ? 'aspect-video' : 'w-full h-full'
                      } bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center`}>
                        {getCreativeTypeIcon(creative.creative_type)}
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2">
                      <Badge className={`text-xs ${getCreativeTypeColor(creative.creative_type)}`}>
                        {creative.creative_type}
                      </Badge>
                    </div>
                  </div>

                  {/* Creative Details */}
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                        {creative.creative_name || 'Unnamed Creative'}
                      </h4>
                      {creative.title && (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {creative.title}
                        </p>
                      )}
                    </div>

                    {/* Performance Score */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">Performance Score</span>
                        <span className="text-xs font-bold text-gray-900">{Math.round(creative.performance_score)}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            creative.performance_score >= 80 ? 'bg-green-500' :
                            creative.performance_score >= 60 ? 'bg-yellow-500' :
                            creative.performance_score >= 40 ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(Math.max(creative.performance_score, 1), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-gray-900 text-sm">
                          {formatCurrency(creative.total_spend)}
                        </div>
                        <div className="text-gray-600 text-xs">Total Spend</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="font-semibold text-blue-900 text-sm">
                          {creative.objective_kpi_label?.includes('CPC') || creative.objective_kpi_label?.includes('CPM') 
                            ? formatCurrency(creative.objective_kpi_value || 0)
                            : creative.objective_kpi_label?.includes('CTR') || creative.objective_kpi_label?.includes('Rate')
                              ? `${((creative.objective_kpi_value || 0) * 100).toFixed(2)}%`
                              : (creative.objective_kpi_value || 0).toLocaleString()
                          }
                        </div>
                        <div className="text-blue-600 text-xs">{creative.objective_kpi_label || 'N/A'}</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-gray-900 text-sm">
                          {formatNumber(creative.total_impressions)}
                        </div>
                        <div className="text-gray-600 text-xs">Impressions</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-gray-900 text-sm">
                          {formatCTR(creative.average_ctr)}
                        </div>
                        <div className="text-gray-600 text-xs">CTR</div>
                      </div>
                    </div>

                    {/* Campaign Info */}
                    {creative.campaign_info && (
                      <div className="text-xs text-gray-500 truncate">
                        Campaign: {creative.campaign_info.campaign_name}
                      </div>
                    )}

                    {/* Activity Period & Efficiency Rating */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{creative.days_active} days active</span>
                      </div>
                      <Badge className={`text-xs px-2 py-1 font-medium ${
                        creative.efficiency_rating === 'Excellent' ? 'bg-green-100 text-green-700 border border-green-200' :
                        creative.efficiency_rating === 'Good' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        creative.efficiency_rating === 'Average' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {creative.efficiency_rating}
                      </Badge>
                    </div>

                    {/* Call to Action */}
                    {creative.call_to_action && (
                      <div className="text-xs">
                        <Badge variant="outline" className="text-xs">
                          {creative.call_to_action}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {creativeData.has_more && (
              <div className="text-center py-6">
                <Button variant="outline" size="sm">
                  Load More Creatives
                </Button>
              </div>
            )}
          </>
        ) : view === 'gallery' ? (
          <div className="text-center py-12 text-gray-500">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No creative data available</p>
            <p className="text-sm">Try adjusting the date range or creative type filter</p>
          </div>
        ) : null}

        {/* Empty states for Action and Table views */}
        {view === 'action' && !actionData && !isLoadingGallery && (
          <div className="text-center py-12 text-gray-500">
            <Target className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No action data available</p>
            <p className="text-sm">Try adjusting the date range</p>
          </div>
        )}

        {view === 'table' && !tableData && !isLoadingGallery && (
          <div className="text-center py-12 text-gray-500">
            <List className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No campaign data available</p>
            <p className="text-sm">Try adjusting the date range</p>
          </div>
        )}
      </CardContent>

      {/* Creative Detail Modal */}
      {selectedCreative && (
        <CreativeDetailModal
          creative={selectedCreative}
          isOpen={!!selectedCreative}
          onClose={() => setSelectedCreative(null)}
        />
      )}
    </Card>
  );
};

export default MetaAdsCreativeGallery;