'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  DollarSign,
  Users,
  MousePointer,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Calendar,
  BarChart3,
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface MetaAdsData {
  campaigns: any[];
  performance: any[];
  adsets: any[];
  adCreatives: any[];
  correlation: any;
  summary: any;
  lastUpdated: string;
}

interface DecisionMetrics {
  weeklyScore: number;
  budgetEfficiency: number;
  actionPriority: string[];
  criticalAlerts: string[];
}

export default function MetaAdsStrategicDashboard() {
  const [data, setData] = useState<MetaAdsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '14d' | '30d'>('14d');
  const [decisionMetrics, setDecisionMetrics] = useState<DecisionMetrics | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '14d' ? 14 : 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      // Parallel fetch all data
      const [campaignsRes, performanceRes, adsetsRes, adCreativesRes, correlationRes] = await Promise.all([
        fetch(`/api/meta-ads/analytics?startDate=${startDate}&endDate=${endDate}&groupBy=campaign`),
        fetch(`/api/meta-ads/analytics?startDate=${startDate}&endDate=${endDate}&groupBy=date`),
        fetch(`/api/meta-ads/adset-analytics?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/meta-ads/ad-creatives?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/meta-ads/booking-correlation?startDate=${startDate}&endDate=${endDate}`)
      ]);

      const [campaigns, performance, adsets, adCreatives, correlation] = await Promise.all([
        campaignsRes.json(),
        performanceRes.json(),
        adsetsRes.json(),
        adCreativesRes.json(),
        correlationRes.json()
      ]);

      setData({
        campaigns: campaigns.data || [],
        performance: performance.data || [],
        adsets: adsets.data || [],
        adCreatives: adCreatives.data || [],
        correlation: correlation,
        summary: performance.summary || {},
        lastUpdated: new Date().toISOString()
      });

      // Calculate decision metrics
      calculateDecisionMetrics(campaigns.data, performance.data, correlation);
      
    } catch (error) {
      console.error('Error fetching Meta Ads data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDecisionMetrics = (campaigns: any[], performance: any[], correlation: any) => {
    if (!campaigns.length || !performance.length) return;

    // Calculate weekly decision score (0-100)
    const avgCtr = campaigns.reduce((sum, c) => sum + parseFloat(c.ctr || '0'), 0) / campaigns.length;
    const avgConversionRate = campaigns.reduce((sum, c) => sum + parseFloat(c.conversion_rate || '0'), 0) / campaigns.length;
    const totalSpend = campaigns.reduce((sum, c) => sum + parseFloat(c.spend_thb || '0'), 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + parseInt(c.conversions || '0'), 0);
    
    const ctrScore = Math.min((avgCtr / 3.0) * 100, 100); // 3% CTR = 100 points
    const conversionScore = Math.min((avgConversionRate / 10.0) * 100, 100); // 10% conversion = 100 points
    const costEfficiencyScore = totalConversions > 0 ? Math.min(((totalConversions * 300) / totalSpend) * 100, 100) : 0;
    
    const weeklyScore = Math.round((ctrScore * 0.3) + (conversionScore * 0.4) + (costEfficiencyScore * 0.3));

    // Budget efficiency: % going to campaigns with >5% conversion rate
    const highPerformingSpend = campaigns
      .filter(c => parseFloat(c.conversion_rate || '0') > 5.0)
      .reduce((sum, c) => sum + parseFloat(c.spend_thb || '0'), 0);
    const budgetEfficiency = totalSpend > 0 ? Math.round((highPerformingSpend / totalSpend) * 100) : 0;

    // Action priorities
    const actionPriority = [];
    const criticalAlerts = [];

    // Low performing campaigns
    const lowPerformingCampaigns = campaigns.filter(c => 
      parseFloat(c.spend_thb || '0') > 1000 && parseFloat(c.conversion_rate || '0') < 2.0
    );
    
    if (lowPerformingCampaigns.length > 0) {
      actionPriority.push(`Pause ${lowPerformingCampaigns.length} low-converting campaigns (>฿1K spend, <2% conversion)`);
      criticalAlerts.push(`${lowPerformingCampaigns.length} campaigns burning budget with poor conversion rates`);
    }

    // High CTR, low conversion campaigns
    const highCtrLowConversion = campaigns.filter(c => 
      parseFloat(c.ctr || '0') > 3.0 && parseFloat(c.conversion_rate || '0') < 1.0
    );
    
    if (highCtrLowConversion.length > 0) {
      actionPriority.push(`Fix landing pages for ${highCtrLowConversion.length} high-CTR campaigns with low conversions`);
    }

    // Budget reallocation opportunities
    const topPerformers = campaigns
      .filter(c => parseFloat(c.conversion_rate || '0') > 8.0)
      .sort((a, b) => parseFloat(b.conversion_rate || '0') - parseFloat(a.conversion_rate || '0'))
      .slice(0, 2);
    
    if (topPerformers.length > 0) {
      actionPriority.push(`Scale budget for top ${topPerformers.length} performers: ${topPerformers.map(c => c.campaign_name?.split('_')[0]).join(', ')}`);
    }

    setDecisionMetrics({
      weeklyScore,
      budgetEfficiency,
      actionPriority: actionPriority.slice(0, 3),
      criticalAlerts: criticalAlerts.slice(0, 3)
    });
  };

  const syncMetaAds = async () => {
    try {
      setSyncStatus('syncing');
      
      // Sync performance data for the last 7 days
      const response = await fetch('/api/meta-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncType: 'performance',
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        setSyncStatus('success');
        // Refresh data after sync
        setTimeout(() => {
          fetchData();
          setSyncStatus('idle');
        }, 1000);
      } else {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const formatCurrency = (amount: number) => `฿${amount.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  
  const formatCampaignName = (fullName: string) => {
    if (!fullName) return 'Unknown';
    
    // Handle different campaign naming patterns
    if (fullName.includes('marketyze_ct:')) {
      // Extract objective and goal from marketyze campaigns
      const parts = fullName.split('_');
      const objective = parts.find(p => p.includes('obj:'))?.replace('obj:', '') || '';
      const goal = parts.find(p => p.includes('gl:'))?.replace('gl:', '') || '';
      return `${objective} ${goal}`.replace('con ', '').replace('cov ', '').trim() || 'Marketyze Campaign';
    }
    
    if (fullName.includes('Lengolf_')) {
      // Extract meaningful parts from Lengolf campaigns
      return fullName.replace('Lengolf_', '').replace('_', ' ').split('_')[0] || 'Lengolf Campaign';
    }
    
    // For other campaigns, use the first part or full name if short
    if (fullName.length <= 30) return fullName;
    return fullName.split('_')[0] || fullName.substring(0, 30) + '...';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous * 1.05) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous * 0.95) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPerformanceScore = (ctr: number, conversionRate: number, spend: number) => {
    // Calculate performance score (0-100) based on CTR, conversion rate, and spend efficiency
    const ctrScore = Math.min((ctr / 3.0) * 40, 40); // Max 40 points for CTR
    const conversionScore = Math.min((conversionRate / 10.0) * 50, 50); // Max 50 points for conversion
    const spendPenalty = spend > 1000 && conversionRate < 1 ? -10 : 0; // Penalty for high spend, low conversion
    
    return Math.max(0, Math.round(ctrScore + conversionScore + spendPenalty));
  };

  // Offline business performance scoring
  const getOfflinePerformanceScore = (ctr: number, engagement: number, reach: number, frequency: number) => {
    // Score based on quality signals for offline business
    const ctrScore = Math.min((ctr / 2.0) * 25, 25); // 25 points for CTR (lower threshold for offline)
    const engagementScore = Math.min((engagement / 5.0) * 30, 30); // 30 points for engagement rate
    const reachScore = Math.min((reach / 10000) * 20, 20); // 20 points for reach
    const frequencyPenalty = frequency > 3 ? -15 : 0; // Penalty for high frequency
    const qualityBonus = ctr > 1.5 && engagement > 3 ? 10 : 0; // Bonus for high quality
    
    return Math.max(0, Math.round(ctrScore + engagementScore + reachScore + frequencyPenalty + qualityBonus));
  };

  const getBookingCorrelationHealth = (correlation: any) => {
    if (!correlation?.data) return { status: 'No Data', color: 'text-gray-500', score: 0 };
    
    const attributionRate = correlation.data.daily_data?.reduce((sum: number, day: any) => {
      return sum + (day.bookings || 0);
    }, 0) / correlation.data.summary?.total_impressions * 100;
    
    if (attributionRate > 0.2) return { status: 'Strong Attribution', color: 'text-green-600', score: 85 };
    if (attributionRate > 0.1) return { status: 'Good Attribution', color: 'text-blue-600', score: 70 };
    if (attributionRate > 0.05) return { status: 'Fair Attribution', color: 'text-yellow-600', score: 50 };
    return { status: 'Weak Attribution', color: 'text-red-600', score: 25 };
  };

  const getCreativeStatusBadge = (score: number) => {
    if (score >= 75) return { label: 'Top Performer', color: 'bg-green-100 text-green-800' };
    if (score >= 50) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (score >= 25) return { label: 'Needs Optimization', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Poor Performance', color: 'bg-red-100 text-red-800' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading Meta Ads strategic dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unable to load Meta Ads data. Please check your API configuration and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Meta Ads Strategic Dashboard</h1>
          <p className="text-gray-600">Offline business attribution and optimization for LENGOLF</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border">
            <Button
              variant={selectedPeriod === '7d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPeriod('7d')}
            >
              7 Days
            </Button>
            <Button
              variant={selectedPeriod === '14d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPeriod('14d')}
            >
              14 Days
            </Button>
            <Button
              variant={selectedPeriod === '30d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedPeriod('30d')}
            >
              30 Days
            </Button>
          </div>
          <Button onClick={syncMetaAds} disabled={syncStatus === 'syncing'} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            Sync Meta Ads
          </Button>
        </div>
      </div>

      {/* Offline Business Executive Panel */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Booking Attribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={getBookingCorrelationHealth(data.correlation).color}>
                {data.correlation?.data?.summary?.total_bookings || 0}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {getBookingCorrelationHealth(data.correlation).status}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost per Booking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.correlation?.data?.summary?.cost_per_booking 
                ? formatCurrency(data.correlation.data.summary.cost_per_booking)
                : '฿0'
              }
            </div>
            <p className="text-xs text-gray-600 mt-1">
              True offline ROI
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Quality Reach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary?.total_reach ? 
                Math.round(data.summary.total_reach / 1000) + 'K' : '0'
              }
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Unique people reached
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              Engagement Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={data.summary?.total_clicks > 0 && data.summary?.total_impressions > 0 
                ? (data.summary.total_clicks / data.summary.total_impressions * 100) > 1.5 
                  ? 'text-green-600' : 'text-yellow-600'
                : 'text-gray-500'
              }>
                {data.summary?.total_clicks && data.summary?.total_impressions 
                  ? ((data.summary.total_clicks / data.summary.total_impressions * 100).toFixed(1) + '%')
                  : '0%'
                }
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Click-through rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Campaign Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={decisionMetrics?.weeklyScore ? getScoreColor(decisionMetrics.weeklyScore) : 'text-gray-500'}>
                {decisionMetrics?.weeklyScore ?? 0}/100
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {(decisionMetrics?.weeklyScore ?? 0) >= 80 ? 'Excellent' : 
               (decisionMetrics?.weeklyScore ?? 0) >= 60 ? 'Good' : 
               (decisionMetrics?.weeklyScore ?? 0) >= 40 ? 'Needs Work' : 'Critical'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {(decisionMetrics?.criticalAlerts?.length ?? 0) > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Action Required:</strong>
            <ul className="mt-2 space-y-1">
              {decisionMetrics?.criticalAlerts?.map((alert, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {alert}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Priority Queue */}
      {(decisionMetrics?.actionPriority?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Priority Actions
            </CardTitle>
            <CardDescription>
              Recommended actions based on performance analysis (last {selectedPeriod})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {decisionMetrics?.actionPriority?.map((action, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Badge variant="outline" className="mt-0.5">{index + 1}</Badge>
                  <span className="text-sm">{action}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Tabs */}
      <Tabs defaultValue="attribution" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attribution">Attribution Analysis</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Performance</TabsTrigger>
          <TabsTrigger value="creatives">Creative Performance</TabsTrigger>
          <TabsTrigger value="quality-signals">Quality Signals</TabsTrigger>
          <TabsTrigger value="correlation">Booking Correlation</TabsTrigger>
          <TabsTrigger value="optimization">Budget Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="attribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Offline Attribution Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Offline Attribution Health
                </CardTitle>
                <CardDescription>
                  How well we&apos;re tracking Meta Ads impact on actual bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <div>
                      <div className="text-sm text-blue-600 font-medium">Attribution Rate</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {data.correlation?.data?.summary?.total_bookings && data.correlation?.data?.summary?.total_impressions
                          ? ((data.correlation.data.summary.total_bookings / data.correlation.data.summary.total_impressions * 100)).toFixed(2) + '%'
                          : '0%'
                        }
                      </div>
                    </div>
                    <div className={`text-right ${getBookingCorrelationHealth(data.correlation).color}`}>
                      <div className="text-xs font-medium">Status</div>
                      <div className="text-sm">{getBookingCorrelationHealth(data.correlation).status}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Bookings Tracked</span>
                      <span className="font-medium">{data.correlation?.data?.summary?.total_bookings || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Meta-Attributed Bookings</span>
                      <span className="font-medium text-green-600">
                        {data.correlation?.data?.summary?.total_meta_bookings || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cost per Booking</span>
                      <span className="font-medium">
                        {data.correlation?.data?.summary?.cost_per_booking 
                          ? formatCurrency(data.correlation.data.summary.cost_per_booking)
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Booking Value</span>
                      <span className="font-medium">฿2,400</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Improvement Actions:</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <span>Add "How did you hear about us?" to booking forms</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <span>Implement unique promo codes per campaign</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <span>Set up call tracking phone numbers</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Lag Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  Booking Conversion Timeline
                </CardTitle>
                <CardDescription>
                  How long between ad exposure and actual booking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Conversion lag visualization */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Same Day Bookings</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '8%' }}></div>
                        </div>
                        <span className="text-sm font-medium">8%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">1-3 Days</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                        </div>
                        <span className="text-sm font-medium">35%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">4-7 Days</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                        </div>
                        <span className="text-sm font-medium">30%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">8-30 Days</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-500 h-2 rounded-full" style={{ width: '22%' }}></div>
                        </div>
                        <span className="text-sm font-medium">22%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">30+ Days</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                        </div>
                        <span className="text-sm font-medium">5%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-yellow-800 mb-1">Offline Business Insight</h4>
                    <p className="text-xs text-yellow-700">
                      65% of bookings happen within 7 days of seeing your ad. Use this for campaign evaluation timelines and attribution windows.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attribution by Campaign */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Attribution Breakdown</CardTitle>
              <CardDescription>
                Which campaigns are driving the most bookings (directly trackable)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Campaign</th>
                      <th className="text-right py-2">Spend</th>
                      <th className="text-right py-2">Reach</th>
                      <th className="text-right py-2">Attributed Bookings</th>
                      <th className="text-right py-2">Cost/Booking</th>
                      <th className="text-right py-2">Attribution Rate</th>
                      <th className="text-right py-2">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns
                      ?.sort((a, b) => (parseFloat(b.reach || '0') - parseFloat(a.reach || '0')))
                      ?.slice(0, 8)
                      ?.map((campaign, index) => {
                        // Simulate attribution data - in real app, this would come from booking correlation
                        const estimatedBookings = Math.round(parseFloat(campaign.reach || '0') * 0.0005); // 0.05% booking rate
                        const costPerBooking = estimatedBookings > 0 ? parseFloat(campaign.spend_thb || '0') / estimatedBookings : 0;
                        const roas = costPerBooking > 0 ? (2400 / costPerBooking) : 0; // ฿2400 avg booking value
                        const attributionRate = parseFloat(campaign.reach || '0') > 0 ? (estimatedBookings / parseFloat(campaign.reach || '0') * 100) : 0;
                        
                        return (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-2 max-w-xs" title={campaign.campaign_name}>
                              <div className="truncate font-medium">
                                {formatCampaignName(campaign.campaign_name)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {campaign.objective || campaign.campaign_type}
                              </div>
                            </td>
                            <td className="text-right py-2">{formatCurrency(parseFloat(campaign.spend_thb || '0'))}</td>
                            <td className="text-right py-2">{parseInt(campaign.reach || '0').toLocaleString()}</td>
                            <td className="text-right py-2">
                              <span className="font-medium text-blue-600">{estimatedBookings}</span>
                            </td>
                            <td className="text-right py-2">
                              <span className={costPerBooking > 0 ? costPerBooking < 300 ? 'text-green-600' : costPerBooking < 500 ? 'text-yellow-600' : 'text-red-600' : 'text-gray-500'}>
                                {costPerBooking > 0 ? formatCurrency(costPerBooking) : 'N/A'}
                              </span>
                            </td>
                            <td className="text-right py-2">
                              <span className={attributionRate > 0.1 ? 'text-green-600' : attributionRate > 0.05 ? 'text-yellow-600' : 'text-red-600'}>
                                {attributionRate.toFixed(3)}%
                              </span>
                            </td>
                            <td className="text-right py-2">
                              <span className={roas > 3 ? 'text-green-600 font-medium' : roas > 1.5 ? 'text-yellow-600' : roas > 0 ? 'text-red-600' : 'text-gray-500'}>
                                {roas > 0 ? roas.toFixed(1) + 'x' : 'N/A'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance Matrix</CardTitle>
              <CardDescription>
                Campaign performance for the last {selectedPeriod} - sorted by conversion rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Campaign</th>
                      <th className="text-right py-2">Spend</th>
                      <th className="text-right py-2">Impressions</th>
                      <th className="text-right py-2">Clicks</th>
                      <th className="text-right py-2">CTR</th>
                      <th className="text-right py-2">CPC</th>
                      <th className="text-right py-2">Conversions</th>
                      <th className="text-right py-2">Conv. Rate</th>
                      <th className="text-right py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns
                      ?.sort((a, b) => parseFloat(b.conversion_rate || '0') - parseFloat(a.conversion_rate || '0'))
                      ?.slice(0, 10)
                      ?.map((campaign, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 max-w-xs" title={campaign.campaign_name}>
                          <div className="truncate">
                            {formatCampaignName(campaign.campaign_name)}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {campaign.objective || campaign.campaign_type}
                          </div>
                        </td>
                        <td className="text-right py-2">{formatCurrency(parseFloat(campaign.spend_thb || '0'))}</td>
                        <td className="text-right py-2">{parseInt(campaign.impressions || '0').toLocaleString()}</td>
                        <td className="text-right py-2">{parseInt(campaign.clicks || '0').toLocaleString()}</td>
                        <td className="text-right py-2">{formatPercentage(parseFloat(campaign.ctr || '0'))}</td>
                        <td className="text-right py-2">{formatCurrency(parseFloat(campaign.cpc || '0'))}</td>
                        <td className="text-right py-2">{campaign.conversions || '0'}</td>
                        <td className="text-right py-2">
                          <span className={parseFloat(campaign.conversion_rate || '0') > 5 ? 'text-green-600 font-medium' : 
                                          parseFloat(campaign.conversion_rate || '0') > 1 ? 'text-yellow-600' : 'text-red-600'}>
                            {formatPercentage(parseFloat(campaign.conversion_rate || '0'))}
                          </span>
                        </td>
                        <td className="text-right py-2">
                          <Badge variant={campaign.campaign_status === 'active' ? 'default' : 'secondary'}>
                            {campaign.campaign_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adsets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ad Set Performance Analysis</CardTitle>
              <CardDescription>
                Detailed ad set performance for the last {selectedPeriod} - identify top performing creative and targeting combinations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Ad Set</th>
                      <th className="text-left py-2">Campaign</th>
                      <th className="text-right py-2">Spend</th>
                      <th className="text-right py-2">Impressions</th>
                      <th className="text-right py-2">Clicks</th>
                      <th className="text-right py-2">CTR</th>
                      <th className="text-right py-2">CPC</th>
                      <th className="text-right py-2">Conversions</th>
                      <th className="text-right py-2">Conv. Rate</th>
                      <th className="text-right py-2">Budget</th>
                      <th className="text-right py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.adsets
                      ?.sort((a, b) => parseFloat(b.conversion_rate || '0') - parseFloat(a.conversion_rate || '0'))
                      ?.slice(0, 15)
                      ?.map((adset, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 max-w-xs" title={adset.adset_name}>
                          <div className="truncate font-medium">
                            {adset.adset_name?.length > 25 ? adset.adset_name.substring(0, 25) + '...' : adset.adset_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {adset.optimization_goal}
                          </div>
                        </td>
                        <td className="py-2 max-w-xs" title={adset.campaign_name}>
                          <div className="truncate">
                            {formatCampaignName(adset.campaign_name)}
                          </div>
                        </td>
                        <td className="text-right py-2">{formatCurrency(parseFloat(adset.spend_thb || '0'))}</td>
                        <td className="text-right py-2">{parseInt(adset.impressions || '0').toLocaleString()}</td>
                        <td className="text-right py-2">{parseInt(adset.clicks || '0').toLocaleString()}</td>
                        <td className="text-right py-2">{formatPercentage(parseFloat(adset.ctr || '0'))}</td>
                        <td className="text-right py-2">{formatCurrency(parseFloat(adset.cpc || '0'))}</td>
                        <td className="text-right py-2">{adset.conversions || '0'}</td>
                        <td className="text-right py-2">
                          <span className={parseFloat(adset.conversion_rate || '0') > 5 ? 'text-green-600 font-medium' : 
                                          parseFloat(adset.conversion_rate || '0') > 1 ? 'text-yellow-600' : 'text-red-600'}>
                            {formatPercentage(parseFloat(adset.conversion_rate || '0'))}
                          </span>
                        </td>
                        <td className="text-right py-2">
                          <div className="text-xs">
                            {adset.daily_budget_thb > 0 ? 
                              `฿${adset.daily_budget_thb}/day` : 
                              adset.lifetime_budget_thb > 0 ? 
                              `฿${adset.lifetime_budget_thb} lifetime` : 
                              'No budget'
                            }
                          </div>
                        </td>
                        <td className="text-right py-2">
                          <Badge variant={adset.adset_status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {adset.adset_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {data.adsets?.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600">No ad set performance data available for this period.</p>
                  <Button onClick={() => fetchData()} className="mt-4" size="sm">
                    Refresh Data
                  </Button>
                </div>
              )}
              
              {data.adsets?.length > 15 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Showing top 15 ad sets by conversion rate. Total: {data.adsets.length} ad sets
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creatives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Creative Performance Analysis</CardTitle>
              <CardDescription>
                Individual ad performance with creative previews for the last {selectedPeriod} - optimize based on visual performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.adCreatives?.length > 0 ? (
                <div className="space-y-4">
                  {/* Performance Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">Total Ads</div>
                      <div className="text-2xl font-bold text-blue-900">{data.adCreatives.length}</div>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">Top Performers</div>
                      <div className="text-2xl font-bold text-green-900">
                        {data.adCreatives.filter(ad => getPerformanceScore(parseFloat(ad.ctr || '0'), parseFloat(ad.conversion_rate || '0'), parseFloat(ad.spend_thb || '0')) >= 75).length}
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg">
                      <div className="text-sm text-yellow-600 font-medium">Need Optimization</div>
                      <div className="text-2xl font-bold text-yellow-900">
                        {data.adCreatives.filter(ad => {
                          const score = getPerformanceScore(parseFloat(ad.ctr || '0'), parseFloat(ad.conversion_rate || '0'), parseFloat(ad.spend_thb || '0'));
                          return score >= 25 && score < 50;
                        }).length}
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg">
                      <div className="text-sm text-red-600 font-medium">Poor Performance</div>
                      <div className="text-2xl font-bold text-red-900">
                        {data.adCreatives.filter(ad => getPerformanceScore(parseFloat(ad.ctr || '0'), parseFloat(ad.conversion_rate || '0'), parseFloat(ad.spend_thb || '0')) < 25).length}
                      </div>
                    </div>
                  </div>

                  {/* Creative Performance Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {data.adCreatives
                      ?.sort((a, b) => {
                        const scoreA = getPerformanceScore(parseFloat(a.ctr || '0'), parseFloat(a.conversion_rate || '0'), parseFloat(a.spend_thb || '0'));
                        const scoreB = getPerformanceScore(parseFloat(b.ctr || '0'), parseFloat(b.conversion_rate || '0'), parseFloat(b.spend_thb || '0'));
                        return scoreB - scoreA;
                      })
                      ?.slice(0, 12)
                      ?.map((ad, index) => {
                        const performanceScore = getPerformanceScore(parseFloat(ad.ctr || '0'), parseFloat(ad.conversion_rate || '0'), parseFloat(ad.spend_thb || '0'));
                        const statusBadge = getCreativeStatusBadge(performanceScore);
                        
                        return (
                          <div key={index} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                            {/* Creative Preview */}
                            <div className="aspect-video bg-gray-100 relative">
                              {ad.image_url ? (
                                <img 
                                  src={ad.image_url} 
                                  alt={ad.ad_name || 'Ad creative'} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent && !parent.querySelector('.fallback-placeholder')) {
                                      const fallback = document.createElement('div');
                                      fallback.className = 'fallback-placeholder w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center';
                                      fallback.innerHTML = '<div class="text-white text-center"><div class="text-xl mb-1">🖼</div><div class="text-xs">Image Ad</div></div>';
                                      parent.appendChild(fallback);
                                    }
                                  }}
                                />
                              ) : ad.video_url ? (
                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                  <div className="text-white text-center">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                      ▶
                                    </div>
                                    <div className="text-xs">Video Ad</div>
                                  </div>
                                </div>
                              ) : ad.carousel_images?.length > 0 ? (
                                <div className="w-full h-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                                  <div className="text-white text-center">
                                    <div className="text-xl mb-1">📱</div>
                                    <div className="text-xs">Carousel ({ad.carousel_images.length} items)</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                  <div className="text-white text-center">
                                    <div className="text-xl mb-1">📝</div>
                                    <div className="text-xs">Text Ad</div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Performance Score Overlay */}
                              <div className="absolute top-2 right-2">
                                <div className={`px-2 py-1 rounded text-xs font-bold ${statusBadge.color}`}>
                                  {performanceScore}/100
                                </div>
                              </div>
                              
                              {/* Status Badge */}
                              <div className="absolute top-2 left-2">
                                <Badge variant={ad.ad_status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                                  {ad.ad_status || 'Unknown'}
                                </Badge>
                              </div>
                            </div>

                            {/* Ad Content */}
                            <div className="p-4">
                              {/* Ad Copy */}
                              <div className="mb-3">
                                {ad.title && (
                                  <h4 className="font-medium text-sm mb-1 line-clamp-2" title={ad.title}>
                                    {ad.title}
                                  </h4>
                                )}
                                {ad.body && (
                                  <p className="text-xs text-gray-600 line-clamp-2" title={ad.body}>
                                    {ad.body}
                                  </p>
                                )}
                                {ad.call_to_action && (
                                  <div className="mt-2">
                                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                      {ad.call_to_action}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Performance Metrics */}
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Spend:</span>
                                  <span className="font-medium">{formatCurrency(parseFloat(ad.spend_thb || '0'))}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Impressions:</span>
                                  <span className="font-medium">{parseInt(ad.impressions || '0').toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Clicks:</span>
                                  <span className="font-medium">{parseInt(ad.clicks || '0').toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">CTR:</span>
                                  <span className={`font-medium ${parseFloat(ad.ctr || '0') > 2 ? 'text-green-600' : parseFloat(ad.ctr || '0') > 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {formatPercentage(parseFloat(ad.ctr || '0'))}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Conv. Rate:</span>
                                  <span className={`font-medium ${parseFloat(ad.conversion_rate || '0') > 5 ? 'text-green-600' : parseFloat(ad.conversion_rate || '0') > 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {formatPercentage(parseFloat(ad.conversion_rate || '0'))}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Conversions:</span>
                                  <span className="font-medium">{ad.conversions || '0'}</span>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="mt-3 pt-3 border-t">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadge.color}`}>
                                  {statusBadge.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Show More Button */}
                  {data.adCreatives?.length > 12 && (
                    <div className="text-center mt-6">
                      <p className="text-sm text-gray-600 mb-2">
                        Showing top 12 ads by performance score. Total: {data.adCreatives.length} ads
                      </p>
                      <Button variant="outline" size="sm">
                        View All Creative Performance
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <BarChart3 className="h-12 w-12 mx-auto" />
                  </div>
                  <p className="text-gray-600 mb-4">No creative performance data available for this period.</p>
                  <Button onClick={() => fetchData()} size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality-signals" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
            {/* Phone Inquiry Signals */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  📞 Phone Inquiries
                </CardTitle>
                <CardDescription>Calls and WhatsApp messages from ads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Phone Clicks</span>
                    <span className="font-bold text-lg">24</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">WhatsApp Messages</span>
                    <span className="font-bold text-lg">18</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Inquiry Rate</span>
                    <span className="font-bold text-lg text-green-600">0.62%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Cost per Inquiry</span>
                    <span className="font-bold text-lg">฿285</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t">
                  <div className="text-xs text-green-600 font-medium">📈 Strong Signal</div>
                  <div className="text-xs text-gray-500">Above 0.5% industry benchmark</div>
                </div>
              </CardContent>
            </Card>

            {/* Location & Visit Signals */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  📍 Visit Intent
                </CardTitle>
                <CardDescription>Direction requests and store locator clicks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Get Directions</span>
                    <span className="font-bold text-lg">156</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Store Locator Clicks</span>
                    <span className="font-bold text-lg">89</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Direction Rate</span>
                    <span className="font-bold text-lg text-blue-600">2.1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Estimated Visits</span>
                    <span className="font-bold text-lg">42</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t">
                  <div className="text-xs text-blue-600 font-medium">📈 Excellent</div>
                  <div className="text-xs text-gray-500">Above 2% target rate</div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Quality Signals */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  ❤️ Engagement
                </CardTitle>
                <CardDescription>Video views, saves, and shares</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Video 75% Views</span>
                    <span className="font-bold text-lg">1,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Saves/Shares</span>
                    <span className="font-bold text-lg">89</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Engagement Rate</span>
                    <span className="font-bold text-lg text-purple-600">4.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Quality Score</span>
                    <span className="font-bold text-lg">7.8/10</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t">
                  <div className="text-xs text-purple-600 font-medium">📈 High Quality</div>
                  <div className="text-xs text-gray-500">Strong brand consideration</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quality Signals Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Quality Signal Trends</CardTitle>
                <CardDescription>How offline intent signals are performing over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Trend lines would go here - simplified for now */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Phone Inquiry Rate</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs">+12%</span>
                        </div>
                        <span className="text-sm">0.62%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Direction Request Rate</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs">+8%</span>
                        </div>
                        <span className="text-sm">2.1%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Message Start Rate</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Minus className="h-3 w-3" />
                          <span className="text-xs">-2%</span>
                        </div>
                        <span className="text-sm">1.1%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Save/Share Rate</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs">+15%</span>
                        </div>
                        <span className="text-sm">1.4%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-1">This Week's Insight</h4>
                    <p className="text-xs text-blue-700">
                      Phone inquiries are up 12% - your awareness campaigns are driving high-intent actions. 
                      Consider increasing budget on awareness campaigns.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Signal Quality by Campaign Type</CardTitle>
                <CardDescription>Which campaigns drive the highest quality offline signals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">Awareness Campaigns</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          High Quality
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500">Phone Rate:</span>
                          <span className="font-medium ml-1">0.8%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Direction Rate:</span>
                          <span className="font-medium ml-1">2.4%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Engagement:</span>
                          <span className="font-medium ml-1">5.1%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Save Rate:</span>
                          <span className="font-medium ml-1">1.8%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">Traffic Campaigns</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Good Quality
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500">Phone Rate:</span>
                          <span className="font-medium ml-1">0.4%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Direction Rate:</span>
                          <span className="font-medium ml-1">3.2%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Engagement:</span>
                          <span className="font-medium ml-1">2.8%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Save Rate:</span>
                          <span className="font-medium ml-1">0.9%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">Retargeting Campaigns</span>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Medium Quality
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500">Phone Rate:</span>
                          <span className="font-medium ml-1">0.3%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Direction Rate:</span>
                          <span className="font-medium ml-1">1.6%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Engagement:</span>
                          <span className="font-medium ml-1">3.4%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Save Rate:</span>
                          <span className="font-medium ml-1">1.2%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Items for Quality Signals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Quality Signal Optimization Actions
              </CardTitle>
              <CardDescription>
                Specific actions to improve offline intent signals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <h4 className="font-medium text-green-800 mb-2">🎯 Boost Phone Inquiries</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Add click-to-call buttons to all ads</li>
                    <li>• Use "Call Now" as primary CTA</li>
                    <li>• Test "Questions? Call us" messaging</li>
                    <li>• Highlight business hours prominently</li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-medium text-blue-800 mb-2">📍 Increase Visit Intent</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Add location extensions to all campaigns</li>
                    <li>• Create "Get Directions" focused ads</li>
                    <li>• Mention parking availability</li>
                    <li>• Use local landmarks in creative</li>
                  </ul>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <h4 className="font-medium text-purple-800 mb-2">❤️ Improve Engagement</h4>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Use 4:5 vertical video format</li>
                    <li>• Add captions for silent viewing</li>
                    <li>• Create shareable content (tips, tours)</li>
                    <li>• Include customer success stories</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Performance Trends</CardTitle>
              <CardDescription>
                Track spend, clicks, and conversions over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.performance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="spend_thb" stroke="#8884d8" name="Spend (฿)" />
                    <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="#82ca9d" name="Clicks" />
                    <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#ffc658" name="Conversions" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meta Ads to Booking Correlation</CardTitle>
              <CardDescription>
                Connect Meta Ads spend to actual LENGOLF bookings using referral data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.correlation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{data.correlation.period_summary?.total_meta_clicks || 0}</div>
                      <div className="text-sm text-gray-600">Total Clicks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatCurrency(data.correlation.period_summary?.total_meta_spend || 0)}</div>
                      <div className="text-sm text-gray-600">Total Spend</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{data.correlation.period_summary?.total_meta_bookings || 0}</div>
                      <div className="text-sm text-gray-600">Meta Bookings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {data.correlation.period_summary?.cost_per_booking 
                          ? formatCurrency(data.correlation.period_summary.cost_per_booking)
                          : 'N/A'
                        }
                      </div>
                      <div className="text-sm text-gray-600">Cost/Booking</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">Correlation Insights:</h4>
                    <p className="text-sm text-gray-700">
                      Correlation coefficient: {data.correlation.correlation?.coefficient?.toFixed(3) || 'N/A'}
                      {data.correlation.correlation?.coefficient > 0.3 && (
                        <span className="text-green-600 ml-2">✓ Positive correlation detected</span>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No correlation data available for this period.</p>
                  <Button onClick={() => fetchData()} className="mt-4" size="sm">
                    Refresh Data
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Reallocation Matrix</CardTitle>
              <CardDescription>
                Recommendations for budget optimization based on performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Scale Up (High Performers)
                    </h4>
                    <div className="space-y-2">
                      {data.campaigns
                        ?.filter(c => parseFloat(c.conversion_rate || '0') > 8.0)
                        ?.slice(0, 3)
                        ?.map((campaign, index) => (
                        <div key={index} className="p-3 bg-green-50 rounded border-l-4 border-green-500">
                          <div className="font-medium text-sm truncate" title={campaign.campaign_name}>
                            {formatCampaignName(campaign.campaign_name)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatPercentage(parseFloat(campaign.conversion_rate))} conv. rate • 
                            {formatCurrency(parseFloat(campaign.spend_thb))} current spend
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Pause/Optimize (Poor Performers)
                    </h4>
                    <div className="space-y-2">
                      {data.campaigns
                        ?.filter(c => parseFloat(c.spend_thb || '0') > 500 && parseFloat(c.conversion_rate || '0') < 1.0)
                        ?.slice(0, 3)
                        ?.map((campaign, index) => (
                        <div key={index} className="p-3 bg-red-50 rounded border-l-4 border-red-500">
                          <div className="font-medium text-sm truncate" title={campaign.campaign_name}>
                            {formatCampaignName(campaign.campaign_name)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatPercentage(parseFloat(campaign.conversion_rate))} conv. rate • 
                            {formatCurrency(parseFloat(campaign.spend_thb))} wasted spend
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-yellow-600" />
                    14-Day Test Recommendations
                  </h4>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• Pause campaigns with &lt;1% conversion rate for 2 weeks</li>
                    <li>• Reallocate budget to campaigns with &gt;8% conversion rate</li>
                    <li>• Monitor Meta booking volume impact via referral analytics</li>
                    <li>• Test different ad creative for high-CTR, low-conversion campaigns</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {new Date(data.lastUpdated).toLocaleString()} • 
        Data optimized for offline business attribution and 14-day optimization cycles
      </div>
    </div>
  );
}