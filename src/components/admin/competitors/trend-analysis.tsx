'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, RefreshCcw, BarChart3 } from 'lucide-react';
import { Platform, CompetitorWithAccounts } from '@/types/competitor-tracking';

interface TrendPeriod {
  name: string;
  label: string;
  days: number;
}

interface TrendMetric {
  competitor_id: number;
  competitor_name: string;
  platform: Platform;
  periods: {
    latest?: any;
    l7days?: any;
    l14days?: any;
    l21days?: any;
    l28days?: any;
  };
}

interface TrendAnalysisProps {
  competitors: CompetitorWithAccounts[];
}

export function TrendAnalysis({ competitors }: TrendAnalysisProps) {
  const [trendData, setTrendData] = useState<TrendMetric[]>([]);
  const [periods, setPeriods] = useState<TrendPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/competitors/weekly-comparison');
      if (!response.ok) {
        throw new Error('Failed to fetch trend analysis data');
      }
      
      const data = await response.json();
      setTrendData(data.trends || []);
      setPeriods(data.periods || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendData();
  }, []);

  const calculateChange = (current: number | undefined, previous: number | undefined) => {
    if (!current || !previous) return null;
    const change = current - previous;
    const percentageChange = previous > 0 ? (change / previous) * 100 : 0;
    return { change, percentageChange };
  };

  const formatChange = (current: number | undefined, previous: number | undefined) => {
    const result = calculateChange(current, previous);
    if (!result) return null;
    
    const { change, percentageChange } = result;
    const isPositive = change > 0;
    const isNegative = change < 0;
    
    return {
      change,
      percentageChange,
      isPositive,
      isNegative,
      icon: isPositive ? TrendingUp : isNegative ? TrendingDown : Minus,
      color: isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
    };
  };

  const getPlatformBadgeColor = (platform: Platform) => {
    switch (platform) {
      case 'instagram': return 'bg-pink-100 text-pink-800';
      case 'facebook': return 'bg-blue-100 text-blue-800';
      case 'line': return 'bg-green-100 text-green-800';
      case 'google_reviews': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMainMetric = (platform: Platform, metrics: any) => {
    switch (platform) {
      case 'instagram':
      case 'facebook':
        return { value: metrics?.followers_count, label: 'Followers' };
      case 'google_reviews':
        return { value: metrics?.google_review_count, label: 'Reviews' };
      case 'line':
        return { value: metrics?.line_friends_count, label: 'Friends' };
      default:
        return { value: metrics?.followers_count, label: 'Followers' };
    }
  };

  // Group data by platform
  const groupedByPlatform = trendData.reduce((acc, item) => {
    if (!acc[item.platform]) {
      acc[item.platform] = [];
    }
    acc[item.platform].push(item);
    return acc;
  }, {} as Record<Platform, TrendMetric[]>);

  const formatNumber = (num: number | undefined) => {
    if (!num && num !== 0) return 'N/A';
    return num.toLocaleString();
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Function to find highest and lowest changes for highlighting
  const findExtremeChanges = (platformData: TrendMetric[], periodIndex: number) => {
    const changes = platformData.map((item, itemIndex) => {
      const latestMetric = getMainMetric(item.platform, item.periods.latest);
      let compareMetric;
      
      switch (periodIndex) {
        case 0: compareMetric = getMainMetric(item.platform, item.periods.l7days); break;
        case 1: compareMetric = getMainMetric(item.platform, item.periods.l14days); break;
        case 2: compareMetric = getMainMetric(item.platform, item.periods.l21days); break;
        case 3: compareMetric = getMainMetric(item.platform, item.periods.l28days); break;
        default: compareMetric = { value: undefined };
      }
      
      const changeData = calculateChange(latestMetric.value, compareMetric.value);
      return {
        itemIndex,
        change: changeData?.change || null
      };
    }).filter(item => item.change !== null);

    if (changes.length === 0) return { highest: -1, lowest: -1 };

    const highest = changes.reduce((max, curr) => curr.change! > max.change! ? curr : max);
    const lowest = changes.reduce((min, curr) => curr.change! < min.change! ? curr : min);

    return {
      highest: highest.itemIndex,
      lowest: lowest.itemIndex
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Competitor Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading trend analysis...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Competitor Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Competitor Trend Analysis
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTrendData}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {trendData.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No trend data available</h3>
            <p className="text-gray-600">Trend analysis will appear after data collection over multiple periods</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByPlatform).map(([platform, platformData]) => {
              const mainMetricLabel = getMainMetric(platform as Platform, {}).label;
              
              return (
                <div key={platform} className="space-y-3">
                  {/* Platform Header */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`${getPlatformBadgeColor(platform as Platform)} text-sm px-3 py-1`}
                    >
                      {platform.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-600">({mainMetricLabel})</span>
                  </div>

                  {/* Platform Table */}
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b bg-gray-50/50">
                              <TableHead className="font-semibold text-gray-900 px-2 py-2 text-xs md:px-4 md:py-3 md:text-sm w-[35%] lg:w-[20%]">Competitor</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-1 py-2 text-xs md:px-3 md:py-3 md:text-sm w-[20%] lg:w-[15%] text-center">Latest</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-1 py-2 text-xs md:px-3 md:py-3 md:text-sm w-[22%] lg:w-[13%] text-center">vs 7d</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-3 py-3 w-[13%] text-center hidden lg:table-cell">vs 14d</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-3 py-3 w-[13%] text-center hidden lg:table-cell">vs 21d</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-1 py-2 text-xs md:px-3 md:py-3 md:text-sm w-[23%] lg:w-[13%] text-center">vs 28d</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-3 py-3 w-[13%] text-center hidden md:table-cell">Last Updated</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {platformData.map((item, index) => {
                              const latestMetric = getMainMetric(item.platform, item.periods.latest);
                              const l7Metric = getMainMetric(item.platform, item.periods.l7days);
                              const l14Metric = getMainMetric(item.platform, item.periods.l14days);
                              const l21Metric = getMainMetric(item.platform, item.periods.l21days);
                              const l28Metric = getMainMetric(item.platform, item.periods.l28days);

                              const change7d = formatChange(latestMetric.value, l7Metric.value);
                              const change14d = formatChange(latestMetric.value, l14Metric.value);
                              const change21d = formatChange(latestMetric.value, l21Metric.value);
                              const change28d = formatChange(latestMetric.value, l28Metric.value);

                              // Get extreme changes for highlighting
                              const extremes7d = findExtremeChanges(platformData, 0);
                              const extremes14d = findExtremeChanges(platformData, 1);
                              const extremes21d = findExtremeChanges(platformData, 2);
                              const extremes28d = findExtremeChanges(platformData, 3);

                              return (
                                <TableRow key={index} className="hover:bg-gray-50/50 transition-colors">
                                  <TableCell className="px-2 py-2 md:px-4 md:py-3">
                                    <div className="flex items-center gap-1 md:gap-3">
                                      <div className="flex-shrink-0 hidden md:block">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                          <span className="text-sm font-semibold text-blue-700">
                                            {item.competitor_name.charAt(0).toUpperCase()}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-gray-900 text-xs md:text-sm leading-tight">{item.competitor_name}</p>
                                      </div>
                                    </div>
                                  </TableCell>

                                  <TableCell className="px-1 py-2 md:px-3 md:py-3 text-center">
                                    <div className="font-semibold text-gray-900 text-xs md:text-sm">
                                      {formatNumber(latestMetric.value)}
                                    </div>
                                  </TableCell>

                                  {/* vs 7d */}
                                  {(() => {
                                    const extremes = extremes7d;
                                    const changeData = change7d;
                                    const isHighest = extremes.highest === index;
                                    const isLowest = extremes.lowest === index;
                                    const bgClass = isHighest
                                      ? 'bg-green-50 border-green-200'
                                      : isLowest
                                        ? 'bg-red-50 border-red-200'
                                        : '';

                                    return (
                                      <TableCell
                                        className={`px-1 py-2 md:px-3 md:py-3 text-center ${bgClass} ${bgClass ? 'border' : ''}`}
                                      >
                                        {changeData ? (
                                          <div className="space-y-0.5 md:space-y-1">
                                            <div className="flex items-center justify-center gap-0.5 md:gap-1 text-gray-900">
                                              <changeData.icon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                              <span className="font-semibold text-[10px] md:text-xs leading-tight">
                                                {changeData.change > 0 ? '+' : ''}{Math.abs(changeData.change).toLocaleString()}
                                              </span>
                                            </div>
                                            <div className="text-[10px] md:text-xs font-medium text-gray-700 leading-tight">
                                              {changeData.percentageChange > 0 ? '+' : ''}{changeData.percentageChange.toFixed(1)}%
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">--</span>
                                        )}
                                      </TableCell>
                                    );
                                  })()}

                                  {/* vs 14d - Hidden on mobile */}
                                  {(() => {
                                    const extremes = extremes14d;
                                    const changeData = change14d;
                                    const isHighest = extremes.highest === index;
                                    const isLowest = extremes.lowest === index;
                                    const bgClass = isHighest
                                      ? 'bg-green-50 border-green-200'
                                      : isLowest
                                        ? 'bg-red-50 border-red-200'
                                        : '';

                                    return (
                                      <TableCell
                                        className={`px-3 py-3 text-center hidden lg:table-cell ${bgClass} ${bgClass ? 'border' : ''}`}
                                      >
                                        {changeData ? (
                                          <div className="space-y-1">
                                            <div className="flex items-center justify-center gap-1 text-gray-900">
                                              <changeData.icon className="h-3 w-3" />
                                              <span className="font-semibold text-xs">
                                                {changeData.change > 0 ? '+' : ''}{Math.abs(changeData.change).toLocaleString()}
                                              </span>
                                            </div>
                                            <div className="text-xs font-medium text-gray-700">
                                              {changeData.percentageChange > 0 ? '+' : ''}{changeData.percentageChange.toFixed(1)}%
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">--</span>
                                        )}
                                      </TableCell>
                                    );
                                  })()}

                                  {/* vs 21d - Hidden on mobile */}
                                  {(() => {
                                    const extremes = extremes21d;
                                    const changeData = change21d;
                                    const isHighest = extremes.highest === index;
                                    const isLowest = extremes.lowest === index;
                                    const bgClass = isHighest
                                      ? 'bg-green-50 border-green-200'
                                      : isLowest
                                        ? 'bg-red-50 border-red-200'
                                        : '';

                                    return (
                                      <TableCell
                                        className={`px-3 py-3 text-center hidden lg:table-cell ${bgClass} ${bgClass ? 'border' : ''}`}
                                      >
                                        {changeData ? (
                                          <div className="space-y-1">
                                            <div className="flex items-center justify-center gap-1 text-gray-900">
                                              <changeData.icon className="h-3 w-3" />
                                              <span className="font-semibold text-xs">
                                                {changeData.change > 0 ? '+' : ''}{Math.abs(changeData.change).toLocaleString()}
                                              </span>
                                            </div>
                                            <div className="text-xs font-medium text-gray-700">
                                              {changeData.percentageChange > 0 ? '+' : ''}{changeData.percentageChange.toFixed(1)}%
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">--</span>
                                        )}
                                      </TableCell>
                                    );
                                  })()}

                                  {/* vs 28d */}
                                  {(() => {
                                    const extremes = extremes28d;
                                    const changeData = change28d;
                                    const isHighest = extremes.highest === index;
                                    const isLowest = extremes.lowest === index;
                                    const bgClass = isHighest
                                      ? 'bg-green-50 border-green-200'
                                      : isLowest
                                        ? 'bg-red-50 border-red-200'
                                        : '';

                                    return (
                                      <TableCell
                                        className={`px-1 py-2 md:px-3 md:py-3 text-center ${bgClass} ${bgClass ? 'border' : ''}`}
                                      >
                                        {changeData ? (
                                          <div className="space-y-0.5 md:space-y-1">
                                            <div className="flex items-center justify-center gap-0.5 md:gap-1 text-gray-900">
                                              <changeData.icon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                              <span className="font-semibold text-[10px] md:text-xs leading-tight">
                                                {changeData.change > 0 ? '+' : ''}{Math.abs(changeData.change).toLocaleString()}
                                              </span>
                                            </div>
                                            <div className="text-[10px] md:text-xs font-medium text-gray-700 leading-tight">
                                              {changeData.percentageChange > 0 ? '+' : ''}{changeData.percentageChange.toFixed(1)}%
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">--</span>
                                        )}
                                      </TableCell>
                                    );
                                  })()}

                                  <TableCell className="px-3 py-3 text-center hidden md:table-cell">
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(item.periods.latest?.recorded_at)}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}