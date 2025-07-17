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
import { CalendarDays, TrendingUp, TrendingDown, Minus, RefreshCcw } from 'lucide-react';
import { Platform, CompetitorWithAccounts } from '@/types/competitor-tracking';

interface WeeklyMetric {
  competitor_id: number;
  competitor_name: string;
  platform: Platform;
  current_week: {
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
    page_likes?: number;
    google_rating?: number;
    google_review_count?: number;
    line_friends_count?: number;
    recorded_at: string;
  } | null;
  previous_week: {
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
    page_likes?: number;
    google_rating?: number;
    google_review_count?: number;
    line_friends_count?: number;
    recorded_at: string;
  } | null;
}

interface WeeklyComparisonProps {
  competitors: CompetitorWithAccounts[];
}

export function WeeklyComparison({ competitors }: WeeklyComparisonProps) {
  const [weeklyData, setWeeklyData] = useState<WeeklyMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeeklyData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/competitors/weekly-comparison');
      if (!response.ok) {
        throw new Error('Failed to fetch weekly comparison data');
      }
      
      const data = await response.json();
      setWeeklyData(data.comparisons || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyData();
  }, []);

  const calculateChange = (current: number | undefined, previous: number | undefined) => {
    if (!current || !previous) return null;
    const change = current - previous;
    const percentageChange = (change / previous) * 100;
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
  const groupedByPlatform = weeklyData.reduce((acc, item) => {
    if (!acc[item.platform]) {
      acc[item.platform] = [];
    }
    acc[item.platform].push(item);
    return acc;
  }, {} as Record<Platform, WeeklyMetric[]>);

  const formatNumber = (num: number | undefined) => {
    if (!num) return 'N/A';
    return num.toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Weekly Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading weekly comparison...</p>
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
            <CalendarDays className="h-5 w-5" />
            Weekly Comparison
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
            <CalendarDays className="h-5 w-5" />
            Weekly Comparison
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWeeklyData}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {weeklyData.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No weekly data available</h3>
            <p className="text-gray-600">Weekly comparisons will appear after data collection spans multiple weeks</p>
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
                              <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[30%]">Competitor</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[20%] text-center">Previous Week</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[20%] text-center">Current Week</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center">Change</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center">% Change</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {platformData.map((item, index) => {
                              const currentMetric = getMainMetric(item.platform, item.current_week);
                              const previousMetric = getMainMetric(item.platform, item.previous_week);
                              const changeData = formatChange(currentMetric.value, previousMetric.value);

                              return (
                                <TableRow key={index} className="hover:bg-gray-50/50 transition-colors">
                                  <TableCell className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                      <div className="flex-shrink-0">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                          <span className="text-sm font-semibold text-blue-700">
                                            {item.competitor_name.charAt(0).toUpperCase()}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-gray-900">{item.competitor_name}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-4 py-4">
                                    <div className="text-center">
                                      <div className="font-semibold text-gray-900">{formatNumber(previousMetric.value)}</div>
                                      {item.previous_week && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {new Date(item.previous_week.recorded_at).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-4 py-4">
                                    <div className="text-center">
                                      <div className="font-semibold text-gray-900">{formatNumber(currentMetric.value)}</div>
                                      {item.current_week && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {new Date(item.current_week.recorded_at).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-4 py-4">
                                    <div className="text-center">
                                      {changeData ? (
                                        <div className={`flex items-center justify-center gap-1 ${changeData.color}`}>
                                          <changeData.icon className="h-4 w-4" />
                                          <span className="font-semibold">
                                            {changeData.change > 0 ? '+' : ''}{changeData.change.toLocaleString()}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">--</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-4 py-4">
                                    <div className="text-center">
                                      {changeData ? (
                                        <span className={`font-semibold ${changeData.color}`}>
                                          {changeData.percentageChange > 0 ? '+' : ''}{changeData.percentageChange.toFixed(1)}%
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">--</span>
                                      )}
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