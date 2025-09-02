'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown,
  Users,
  Mouse,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Target,
  ArrowRight,
  Eye,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Zap
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel
} from 'recharts';

interface TrafficData {
  // Overall traffic metrics
  totalSessions: number;
  totalUsers: number;
  totalPageViews: number;
  avgPagesPerSession: number;
  avgSessionDuration: number;
  avgBounceRate: number;
  
  // Channel performance
  channelPerformance: Array<{
    channel: string;
    sessions: number;
    users: number;
    bookingConversions: number;
    conversionRate: number;
    sessionsChange: number;
    conversionRateChange: number;
  }>;
  
  // Device breakdown
  deviceBreakdown: Array<{
    device: string;
    sessions: number;
    percentage: number;
    conversionRate: number;
  }>;
  
  // Funnel analysis
  funnelData: Array<{
    channel: string;
    stage1Users: number; // Landing
    stage2Users: number; // Book Now
    stage3Users: number; // Booking Page
    stage4Users: number; // Form Start
    stage5Users: number; // Login
    stage6Users: number; // Confirmation
    overallConversionRate: number;
  }>;
  
  // Top pages
  topPages: Array<{
    path: string;
    title: string;
    pageViews: number;
    entrances: number;
    bounceRate: number;
    bookingConversions: number;
  }>;
  
  // Time series data for charts
  dailyTrends: Array<{
    date: string;
    sessions: number;
    users: number;
    bookingConversions: number;
    conversionRate: number;
  }>;
}

interface TrafficAnalysisProps {
  data: TrafficData | null;
  isLoading: boolean;
  timeRange: string;
  onRefresh?: () => void;
}

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function TrafficAnalysis({ data, isLoading, timeRange, onRefresh }: TrafficAnalysisProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'channels' | 'funnel' | 'pages'>('overview');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  // Filter funnel data by selected channel
  const filteredFunnelData = useMemo(() => {
    if (!data?.funnelData) return [];
    if (selectedChannel === 'all') {
      // Aggregate all channels
      const totals = data.funnelData.reduce((acc, item) => ({
        stage1Users: acc.stage1Users + item.stage1Users,
        stage2Users: acc.stage2Users + item.stage2Users,
        stage3Users: acc.stage3Users + item.stage3Users,
        stage4Users: acc.stage4Users + item.stage4Users,
        stage5Users: acc.stage5Users + item.stage5Users,
        stage6Users: acc.stage6Users + item.stage6Users,
      }), {
        stage1Users: 0,
        stage2Users: 0,
        stage3Users: 0,
        stage4Users: 0,
        stage5Users: 0,
        stage6Users: 0,
      });

      return [{
        channel: 'All Channels',
        ...totals,
        overallConversionRate: totals.stage1Users > 0 ? (totals.stage6Users / totals.stage1Users * 100) : 0
      }];
    }
    return data.funnelData.filter(item => item.channel === selectedChannel);
  }, [data?.funnelData, selectedChannel]);

  // Prepare funnel chart data
  const funnelChartData = useMemo(() => {
    if (!filteredFunnelData[0]) return [];
    
    const funnel = filteredFunnelData[0];
    return [
      { name: 'Landing Page', value: funnel.stage1Users, fill: COLORS[0] },
      { name: 'Book Now Click', value: funnel.stage2Users, fill: COLORS[1] },
      { name: 'Booking Page', value: funnel.stage3Users, fill: COLORS[2] },
      { name: 'Form Start', value: funnel.stage4Users, fill: COLORS[3] },
      { name: 'Login/Register', value: funnel.stage5Users, fill: COLORS[4] },
      { name: 'Confirmation', value: funnel.stage6Users, fill: COLORS[5] },
    ];
  }, [filteredFunnelData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="h-96 bg-gray-100 rounded"></CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Traffic Data Available</h3>
          <p className="text-gray-600 mb-4">
            Traffic data from Google Analytics 4 is not available for the selected time period.
          </p>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Traffic Analysis
          </h2>
          <p className="text-gray-600 mt-1">
            Google Analytics 4 traffic insights and conversion analysis
          </p>
        </div>
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>

      {/* Main Traffic KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.totalSessions)}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalUsers} unique users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.totalPageViews)}</div>
            <p className="text-xs text-muted-foreground">
              {data.avgPagesPerSession.toFixed(1)} per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(data.avgSessionDuration)}</div>
            <p className="text-xs text-muted-foreground">
              {data.avgBounceRate.toFixed(1)}% bounce rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Conversions</CardTitle>
            <Target className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.channelPerformance.reduce((sum, channel) => sum + channel.bookingConversions, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((data.channelPerformance.reduce((sum, channel) => sum + channel.bookingConversions, 0) / data.totalSessions) * 100).toFixed(2)}% conversion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-navigation */}
      <Tabs value={activeSubTab} onValueChange={(value: any) => setActiveSubTab(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Daily Trends Chart */}
          {data.dailyTrends && data.dailyTrends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Traffic Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="sessions" 
                      stroke={COLORS[0]} 
                      strokeWidth={2}
                      name="Sessions"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke={COLORS[1]} 
                      strokeWidth={2}
                      name="Users"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bookingConversions" 
                      stroke={COLORS[3]} 
                      strokeWidth={2}
                      name="Conversions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Device Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.deviceBreakdown.map((device, index) => {
                    const Icon = DEVICE_ICONS[device.device as keyof typeof DEVICE_ICONS] || Monitor;
                    return (
                      <div key={device.device} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-gray-600" />
                          <span className="font-medium capitalize">{device.device}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{device.sessions} sessions</div>
                          <div className="text-sm text-gray-600">
                            {device.percentage}% • {device.conversionRate}% conv.
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Device Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Sessions by Device</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={data.deviceBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="sessions"
                      label={({ device, percentage }) => `${device}: ${percentage}%`}
                    >
                      {data.deviceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Channel Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.channelPerformance.map((channel, index) => (
                  <div key={channel.channel} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <h3 className="font-semibold text-lg">{channel.channel}</h3>
                      </div>
                      <Badge variant="outline">
                        {channel.conversionRate.toFixed(2)}% conv.
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-semibold text-lg">{formatNumber(channel.sessions)}</div>
                        <div className="text-gray-600">Sessions</div>
                        <div className="flex items-center gap-1 mt-1">
                          {channel.sessionsChange > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={`text-xs ${channel.sessionsChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {channel.sessionsChange > 0 ? '+' : ''}{channel.sessionsChange.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-semibold text-lg">{formatNumber(channel.users)}</div>
                        <div className="text-gray-600">Users</div>
                      </div>
                      
                      <div>
                        <div className="font-semibold text-lg">{channel.bookingConversions}</div>
                        <div className="text-gray-600">Conversions</div>
                      </div>
                      
                      <div>
                        <div className="font-semibold text-lg">{channel.conversionRate.toFixed(2)}%</div>
                        <div className="text-gray-600">Conv. Rate</div>
                        <div className="flex items-center gap-1 mt-1">
                          {channel.conversionRateChange > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={`text-xs ${channel.conversionRateChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {channel.conversionRateChange > 0 ? '+' : ''}{channel.conversionRateChange.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Booking Funnel Analysis</CardTitle>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {data.funnelData.map((item) => (
                    <SelectItem key={item.channel} value={item.channel}>
                      {item.channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {filteredFunnelData[0] && (
                <div className="space-y-6">
                  {/* Funnel Visualization */}
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                    {funnelChartData.map((stage, index) => {
                      const nextStage = funnelChartData[index + 1];
                      const dropOffRate = nextStage ? 
                        ((stage.value - nextStage.value) / stage.value * 100) : 0;
                      
                      return (
                        <div key={stage.name} className="relative">
                          <div className="bg-white border rounded-lg p-4 text-center">
                            <div className="text-xs font-medium text-gray-600 mb-2">
                              {stage.name}
                            </div>
                            <div className="text-2xl font-bold mb-1" style={{ color: stage.fill }}>
                              {formatNumber(stage.value)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {((stage.value / funnelChartData[0].value) * 100).toFixed(1)}%
                            </div>
                          </div>
                          
                          {index < funnelChartData.length - 1 && (
                            <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 z-10">
                              <div className="bg-white border rounded-full p-1">
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                              </div>
                              {dropOffRate > 0 && (
                                <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2">
                                  <div className="text-xs text-red-600 font-medium whitespace-nowrap">
                                    -{dropOffRate.toFixed(1)}%
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Funnel Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Overall Conversion</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                          {filteredFunnelData[0].overallConversionRate.toFixed(2)}%
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Landing to Confirmation
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Biggest Drop-off</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          let maxDropOff = 0;
                          let maxDropOffStage = '';
                          
                          funnelChartData.forEach((stage, index) => {
                            if (index < funnelChartData.length - 1) {
                              const nextStage = funnelChartData[index + 1];
                              const dropOff = (stage.value - nextStage.value) / stage.value * 100;
                              if (dropOff > maxDropOff) {
                                maxDropOff = dropOff;
                                maxDropOffStage = `${stage.name} → ${nextStage.name}`;
                              }
                            }
                          });
                          
                          return (
                            <>
                              <div className="text-3xl font-bold text-red-600">
                                {maxDropOff.toFixed(1)}%
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {maxDropOffStage}
                              </p>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Form Completion</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-600">
                          {filteredFunnelData[0].stage4Users > 0 ? 
                            ((filteredFunnelData[0].stage6Users / filteredFunnelData[0].stage4Users) * 100).toFixed(1) : 0}%
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Form Start to Confirmation
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topPages.map((page, index) => (
                  <div key={page.path} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">
                          {page.title || 'Untitled Page'}
                        </h3>
                        <p className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
                          {page.path}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-4">
                        #{index + 1}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                      <div>
                        <div className="font-semibold text-lg">{formatNumber(page.pageViews)}</div>
                        <div className="text-gray-600">Page Views</div>
                      </div>
                      
                      <div>
                        <div className="font-semibold text-lg">{formatNumber(page.entrances)}</div>
                        <div className="text-gray-600">Entrances</div>
                      </div>
                      
                      <div>
                        <div className="font-semibold text-lg">{page.bounceRate.toFixed(1)}%</div>
                        <div className="text-gray-600">Bounce Rate</div>
                      </div>
                      
                      <div>
                        <div className="font-semibold text-lg">{page.bookingConversions}</div>
                        <div className="text-gray-600">Conversions</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}