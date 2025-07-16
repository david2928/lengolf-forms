'use client';

import { useState, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompetitorMetrics } from '@/hooks/use-competitors';
import { Platform } from '@/types/competitor-tracking';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CompetitorMetricsModalProps {
  competitorId: number;
  onClose: () => void;
}

const platforms: { value: Platform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'line', label: 'LINE' },
  { value: 'google_reviews', label: 'Google Reviews' },
];

export function CompetitorMetricsModal({ competitorId, onClose }: CompetitorMetricsModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | undefined>();
  const [dateRange, setDateRange] = useState<string>('30d');
  
  const startDate = useMemo(() => {
    if (dateRange === '30d') {
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (dateRange === '7d') {
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    return undefined;
  }, [dateRange]);

  const { metrics, summary, isLoading } = useCompetitorMetrics(
    competitorId,
    selectedPlatform,
    startDate
  );

  const formatNumber = (num: number | null | undefined) => {
    if (!num) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getTrendIcon = (rate: number) => {
    if (rate > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (rate < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  // Process chart data differently based on whether platform is selected
  const chartData = (() => {
    if (selectedPlatform) {
      // Single platform - simple line chart
      return metrics
        .slice(0, 30)
        .reverse()
        .map((metric: any) => {
          let primaryValue = 0;
          switch (metric.platform) {
            case 'instagram':
              primaryValue = metric.followers_count || 0;
              break;
            case 'facebook':
              primaryValue = metric.followers_count || metric.page_likes || 0;
              break;
            case 'line':
              primaryValue = metric.line_friends_count || 0;
              break;
            case 'google_reviews':
              primaryValue = metric.google_review_count || 0; // Use review count as primary
              break;
          }
          
          return {
            date: new Date(metric.recorded_at).toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              timeZone: 'UTC'
            }),
            value: primaryValue
          };
        });
    } else {
      // All platforms - group by date and normalize values
      const groupedByDate: { [key: string]: any } = {};
      
      // First pass: collect all values to find min/max for normalization
      const platformValues: { [key: string]: number[] } = {
        instagram: [],
        facebook: [],
        line: [],
        google_reviews: []
      };
      
      metrics.forEach((metric: any) => {
        switch (metric.platform) {
          case 'instagram':
            if (metric.followers_count) platformValues.instagram.push(metric.followers_count);
            break;
          case 'facebook':
            if (metric.followers_count || metric.page_likes) {
              platformValues.facebook.push(metric.followers_count || metric.page_likes);
            }
            break;
          case 'line':
            if (metric.line_friends_count) platformValues.line.push(metric.line_friends_count);
            break;
          case 'google_reviews':
            if (metric.google_review_count) platformValues.google_reviews.push(metric.google_review_count);
            break;
        }
      });
      
      // Calculate min/max for each platform
      const getMinMax = (values: number[]) => {
        if (values.length === 0) return { min: 0, max: 100 };
        const min = Math.min(...values);
        const max = Math.max(...values);
        return { min, max: max === min ? max + 1 : max }; // Avoid division by zero
      };
      
      const ranges = {
        instagram: getMinMax(platformValues.instagram),
        facebook: getMinMax(platformValues.facebook),
        line: getMinMax(platformValues.line),
        google_reviews: getMinMax(platformValues.google_reviews)
      };
      
      // Normalize function (0-100 scale)
      const normalize = (value: number, platform: string) => {
        const range = ranges[platform as keyof typeof ranges];
        if (!range || range.max === range.min) return 50;
        return ((value - range.min) / (range.max - range.min)) * 100;
      };
      
      // Second pass: group by date with normalized values
      metrics.forEach((metric: any) => {
        const date = new Date(metric.recorded_at).toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          timeZone: 'UTC'
        });
        
        if (!groupedByDate[date]) {
          groupedByDate[date] = { 
            date,
            // Store both normalized and raw values
            instagramRaw: null,
            facebookRaw: null,
            lineRaw: null,
            google_reviewsRaw: null
          };
        }
        
        // Add platform-specific normalized value
        switch (metric.platform) {
          case 'instagram':
            const instagramValue = metric.followers_count || 0;
            if (instagramValue > 0) {
              groupedByDate[date].instagram = normalize(instagramValue, 'instagram');
              groupedByDate[date].instagramRaw = instagramValue;
            }
            break;
          case 'facebook':
            const facebookValue = metric.followers_count || metric.page_likes || 0;
            if (facebookValue > 0) {
              groupedByDate[date].facebook = normalize(facebookValue, 'facebook');
              groupedByDate[date].facebookRaw = facebookValue;
            }
            break;
          case 'line':
            const lineValue = metric.line_friends_count || 0;
            if (lineValue > 0) {
              groupedByDate[date].line = normalize(lineValue, 'line');
              groupedByDate[date].lineRaw = lineValue;
            }
            break;
          case 'google_reviews':
            const googleValue = metric.google_review_count || 0;
            if (googleValue > 0) {
              groupedByDate[date].google_reviews = normalize(googleValue, 'google_reviews');
              groupedByDate[date].google_reviewsRaw = googleValue;
            }
            break;
        }
      });
      
      // Convert to array and sort by date
      return Object.values(groupedByDate)
        .sort((a, b) => {
          const dateA = new Date(a.date.split('/').reverse().join('-'));
          const dateB = new Date(b.date.split('/').reverse().join('-'));
          return dateA.getTime() - dateB.getTime();
        })
        .slice(-30); // Last 30 days
    }
  })();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Competitor Metrics</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Platform</label>
            <Select value={selectedPlatform || 'all'} onValueChange={(value) => 
              setSelectedPlatform(value === 'all' ? undefined : value as Platform)
            }>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {platforms.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{formatNumber(summary.total_followers)}</div>
                    <div className="text-sm text-gray-600">Total Followers</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{summary.platforms_tracked}</div>
                    <div className="text-sm text-gray-600">Platforms</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">Last Updated</div>
                    <div className="text-sm font-medium">
                      {summary.last_updated 
                        ? new Date(summary.last_updated).toLocaleDateString()
                        : 'Never'
                      }
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">Growth Trends</div>
                    <div className="flex gap-1 mt-1">
                      {Object.entries(summary.growth_trends).map(([platform, trend]: [string, any]) => (
                        <Badge key={platform} variant="outline" className="text-xs">
                          {platform}: {trend}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedPlatform 
                      ? `${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} Metrics`
                      : 'All Platform Metrics (Normalized)'
                    }
                  </CardTitle>
                  {!selectedPlatform && (
                    <p className="text-sm text-muted-foreground">
                      Values are normalized to 0-100 scale for comparison. Hover to see actual values.
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis hide={!selectedPlatform} />
                        <Tooltip 
                          content={(props) => {
                            const { active, payload, label } = props;
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-3 border rounded shadow-lg">
                                  <p className="font-medium mb-2">{label}</p>
                                  {payload.map((entry: any, index: number) => {
                                    if (entry.value === null || entry.value === undefined || isNaN(entry.value)) {
                                      return null;
                                    }
                                    
                                    let displayValue = entry.value;
                                    let platformName = entry.name || entry.dataKey;
                                    
                                    // For all platforms view, show actual raw values
                                    if (!selectedPlatform) {
                                      const dataPoint = chartData.find((d: any) => d.date === label);
                                      const rawKey = `${entry.dataKey}Raw`;
                                      const rawValue = dataPoint ? dataPoint[rawKey] : null;
                                      
                                      if (rawValue !== null && rawValue !== undefined) {
                                        displayValue = rawValue;
                                        platformName = entry.dataKey.charAt(0).toUpperCase() + entry.dataKey.slice(1).replace('_', ' ');
                                      } else {
                                        return null;
                                      }
                                    }
                                    
                                    return (
                                      <p key={index} style={{ color: entry.color }} className="text-sm">
                                        {platformName}: {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
                                      </p>
                                    );
                                  })}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {selectedPlatform ? (
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                          />
                        ) : (
                          <>
                            <Line 
                              type="monotone" 
                              dataKey="instagram" 
                              stroke="#E4405F" 
                              strokeWidth={2}
                              dot={{ fill: '#E4405F', strokeWidth: 2 }}
                              name="Instagram"
                              connectNulls={true}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="facebook" 
                              stroke="#1877F2" 
                              strokeWidth={2}
                              dot={{ fill: '#1877F2', strokeWidth: 2 }}
                              name="Facebook"
                              connectNulls={true}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="line" 
                              stroke="#00C300" 
                              strokeWidth={2}
                              dot={{ fill: '#00C300', strokeWidth: 2 }}
                              name="LINE"
                              connectNulls={true}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="google_reviews" 
                              stroke="#EA4335" 
                              strokeWidth={2}
                              dot={{ fill: '#EA4335', strokeWidth: 2 }}
                              name="Google Reviews"
                              connectNulls={true}
                            />
                            <Legend />
                          </>
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metrics Table */}
            <Card>
              <CardHeader>
                <CardTitle>Historical Data</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No metrics data available
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Platform</th>
                          <th className="text-right py-2">Primary Metric</th>
                          <th className="text-right py-2">Secondary Metric</th>
                          <th className="text-right py-2">Posts/Content</th>
                          <th className="text-right py-2">Rating/Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.slice(0, 20).map((metric: any, index: number) => {
                          const getPlatformMetrics = (metric: any) => {
                            switch (metric.platform) {
                              case 'instagram':
                                return {
                                  primary: { label: 'Followers', value: formatNumber(metric.followers_count) },
                                  secondary: { label: 'Following', value: formatNumber(metric.following_count) },
                                  content: { label: 'Posts', value: formatNumber(metric.posts_count) },
                                  rating: { label: 'Verified', value: metric.raw_data?.is_verified ? '✓' : 'N/A' }
                                };
                              case 'facebook':
                                return {
                                  primary: { label: 'Followers', value: formatNumber(metric.followers_count) },
                                  secondary: { label: 'Page Likes', value: formatNumber(metric.page_likes) },
                                  content: { label: 'Check-ins', value: formatNumber(metric.check_ins) },
                                  rating: { label: 'Rating', value: metric.page_rating ? `${metric.page_rating}⭐` : 'N/A' }
                                };
                              case 'line':
                                return {
                                  primary: { label: 'Friends', value: formatNumber(metric.line_friends_count) },
                                  secondary: { label: 'Verified', value: metric.raw_data?.is_verified ? '✓' : 'N/A' },
                                  content: { label: 'Recent Posts', value: formatNumber(metric.raw_data?.recent_posts_count) },
                                  rating: { label: 'Account', value: metric.raw_data?.account_name || 'N/A' }
                                };
                              case 'google_reviews':
                                return {
                                  primary: { label: 'Reviews', value: formatNumber(metric.google_review_count) },
                                  secondary: { label: 'Rating', value: metric.google_rating ? `${metric.google_rating}⭐` : 'N/A' },
                                  content: { label: 'Status', value: metric.raw_data?.is_open ? 'Open' : 'N/A' },
                                  rating: { label: 'Category', value: metric.raw_data?.business_category || 'N/A' }
                                };
                              default:
                                return {
                                  primary: { label: 'Followers', value: formatNumber(metric.followers_count) },
                                  secondary: { label: 'Following', value: formatNumber(metric.following_count) },
                                  content: { label: 'Posts', value: formatNumber(metric.posts_count) },
                                  rating: { label: 'N/A', value: 'N/A' }
                                };
                            }
                          };
                          
                          const platformMetrics = getPlatformMetrics(metric);
                          
                          return (
                            <tr key={index} className="border-b">
                              <td className="py-2">
                                {new Date(metric.recorded_at).toLocaleDateString('en-GB', { 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  year: 'numeric',
                                  timeZone: 'UTC'
                                })}
                              </td>
                              <td className="py-2">
                                <Badge variant="outline">
                                  {metric.platform}
                                </Badge>
                              </td>
                              <td className="text-right py-2">
                                <div className="text-xs text-gray-500">{platformMetrics.primary.label}</div>
                                <div className="font-medium">{platformMetrics.primary.value}</div>
                              </td>
                              <td className="text-right py-2">
                                <div className="text-xs text-gray-500">{platformMetrics.secondary.label}</div>
                                <div className="font-medium">{platformMetrics.secondary.value}</div>
                              </td>
                              <td className="text-right py-2">
                                <div className="text-xs text-gray-500">{platformMetrics.content.label}</div>
                                <div className="font-medium">{platformMetrics.content.value}</div>
                              </td>
                              <td className="text-right py-2">
                                <div className="text-xs text-gray-500">{platformMetrics.rating.label}</div>
                                <div className="font-medium">{platformMetrics.rating.value}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}