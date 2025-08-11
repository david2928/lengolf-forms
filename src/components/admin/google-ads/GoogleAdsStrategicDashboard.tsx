'use client';

import React, { useState, useEffect } from 'react';
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
  TrendingUp,
  RefreshCw,
  Calendar,
  Target,
  AlertCircle,
  CheckCircle,
  DollarSign,
  MousePointer,
  Eye,
  BarChart3,
  TestTube,
  Lightbulb,
  Table
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, Area } from 'recharts';
import GoogleAdsPivotDashboard from './GoogleAdsPivotDashboard';

interface CorrelationData {
  strength: number;
  period: { startDate: string; endDate: string };
  spendData: Array<{ date: string; spend: number }>;
  bookingData: Array<{ date: string; bookings: number }>;
  efficiency: {
    costPerBooking: number;
    previousCostPerBooking: number;
    change: number;
    bookingShare: number;
  };
  summary: {
    totalSpend: number;
    totalBookings: number;
    averageSpendPerDay: number;
    averageBookingsPerDay: number;
  };
}

interface ComparisonData {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  changes: {
    totalSpend: { value: number; percent: number };
    totalClicks: { value: number; percent: number };
    avgCTR: { value: number; percent: number };
    avgCPC: { value: number; percent: number };
    googleBookings: { value: number; percent: number };
    costPerBooking: { value: number; percent: number };
    bookingShare: { value: number; percent: number };
    clickToBookingRate: { value: number; percent: number };
  };
  alerts: Array<{
    type: 'warning' | 'critical' | 'positive';
    metric: string;
    message: string;
    impact: string;
  }>;
}

interface PeriodMetrics {
  period: string;
  startDate: string;
  endDate: string;
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  avgCTR: number;
  avgCPC: number;
  qualityScore: number;
  googleBookings: number;
  totalBookings: number;
  bookingShare: number;
  costPerBooking: number;
  clickToBookingRate: number;
  campaignBreakdown: Array<{
    campaignName: string;
    campaignType: string;
    spend: number;
    clicks: number;
    ctr: number;
    cpc: number;
    bookingContribution: number;
  }>;
}

interface GoogleAdsData {
  type: 'date_analytics' | 'campaign_analytics' | 'keyword_analytics';
  period: { startDate: string; endDate: string };
  data: any[];
  summary?: {
    total_impressions: number;
    total_clicks: number;
    total_cost: number;
    total_conversions: number;
    total_conversion_value: number;
  };
}

interface GoogleAdsStrategicDashboardProps {
  className?: string;
}

export default function GoogleAdsStrategicDashboard({ className }: GoogleAdsStrategicDashboardProps) {
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [campaignComparison, setCampaignComparison] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<GoogleAdsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'14-day' | 'correlation' | 'campaigns' | 'pivot'>('pivot');
  const [periodLength, setPeriodLength] = useState<'14-day' | '30-day' | '90-day'>('14-day');

  const fetchComparisonData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/google-ads/performance-comparison?analysisType=${periodLength}`);
      if (!response.ok) {
        throw new Error('Failed to fetch performance comparison data');
      }
      
      const data = await response.json();
      setComparisonData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const fetchCampaignComparison = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/google-ads/campaign-comparison?analysisType=${periodLength}`);
      if (!response.ok) {
        throw new Error('Failed to fetch campaign comparison data');
      }
      
      const data = await response.json();
      setCampaignComparison(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const fetchCorrelationData = async () => {
    try {
      const response = await fetch('/api/google-ads/booking-correlation?analysisType=14-day');
      if (!response.ok) {
        throw new Error('Failed to fetch correlation data');
      }
      
      const data = await response.json();
      setCorrelationData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      if (viewMode === '14-day') {
        await fetchComparisonData();
      } else if (viewMode === 'campaigns') {
        await fetchCampaignComparison();
      } else if (viewMode === 'correlation') {
        await fetchCorrelationData();
      }
      // Pivot view handles its own data fetching
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [viewMode, periodLength]);

  const calculatePerformanceScore = (): number => {
    if (viewMode === '14-day' && comparisonData) {
      // Score based on comparison data
      let score = 50; // Base score
      
      // Booking efficiency (0-30 points)
      const bookingChange = comparisonData.changes.googleBookings.percent;
      if (bookingChange > 10) score += 30;
      else if (bookingChange > 0) score += 20;
      else if (bookingChange > -10) score += 10;
      else score -= 20;
      
      // Cost efficiency (0-30 points)  
      const costPerBookingChange = comparisonData.changes.costPerBooking.percent;
      if (costPerBookingChange < -20) score += 30;
      else if (costPerBookingChange < 0) score += 20;
      else if (costPerBookingChange < 20) score += 10;
      else score -= 20;
      
      // CTR health (0-20 points)
      const ctrChange = comparisonData.changes.avgCTR.percent;
      if (ctrChange > 10) score += 20;
      else if (ctrChange > 0) score += 10;
      else if (ctrChange > -10) score += 5;
      else score -= 10;
      
      return Math.max(0, Math.min(100, Math.round(score)));
    }
    
    if (correlationData) {
      // Correlation health (0-25 points)
      const correlationScore = Math.max(0, Math.min(25, (correlationData.strength + 1) * 12.5));
      
      // Booking efficiency (0-25 points)
      const efficiencyScore = correlationData.efficiency.change < 0 ? 25 : Math.max(0, 25 - Math.abs(correlationData.efficiency.change));
      
      // CTR health (0-25 points) - assumed based on historical performance
      const ctrScore = 20; // Placeholder - would calculate from analytics data
      
      // Budget efficiency (0-25 points)
      const budgetScore = correlationData.efficiency.bookingShare > 35 ? 25 : (correlationData.efficiency.bookingShare / 35) * 25;

      return Math.round(correlationScore + efficiencyScore + ctrScore + budgetScore);
    }
    
    return 0;
  };

  const getCorrelationDescription = (strength: number): { text: string; color: string } => {
    if (strength > 0.7) return { text: 'Very Strong', color: 'text-green-600' };
    if (strength > 0.4) return { text: 'Strong', color: 'text-green-500' };
    if (strength > 0.1) return { text: 'Moderate', color: 'text-yellow-500' };
    if (strength > -0.1) return { text: 'Weak', color: 'text-gray-500' };
    return { text: 'Negative', color: 'text-red-500' };
  };

  const getUrgentActions = (): Array<{ text: string; priority: 'high' | 'medium' | 'low' }> => {
    const actions: Array<{ text: string; priority: 'high' | 'medium' | 'low' }> = [];

    if (viewMode === '14-day' && comparisonData) {
      // Add alerts from comparison data
      comparisonData.alerts.forEach(alert => {
        actions.push({
          text: alert.message,
          priority: alert.type === 'critical' ? 'high' : alert.type === 'warning' ? 'medium' : 'low'
        });
      });
    } else if (correlationData) {
      if (correlationData.efficiency.change > 25) {
        actions.push({ text: 'Cost per booking increased 25%+ - investigate campaigns', priority: 'high' });
      }
      if (correlationData.strength < 0.1) {
        actions.push({ text: 'Weak spend-booking correlation - review campaign targeting', priority: 'medium' });
      }
      if (correlationData.efficiency.bookingShare < 30) {
        actions.push({ text: 'Google booking share below 30% - optimize campaigns', priority: 'medium' });
      }
    }

    return actions;
  };

  const renderExecutiveOverview = () => {
    const performanceScore = calculatePerformanceScore();
    const urgentActions = getUrgentActions();

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Executive Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">
                <span className={performanceScore >= 80 ? 'text-green-600' : performanceScore >= 60 ? 'text-yellow-500' : 'text-red-500'}>
                  {performanceScore}
                </span>
                <span className="text-gray-400 text-lg">/100</span>
              </div>
              <p className="text-sm text-gray-600">Performance Score</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold mb-1">
                {viewMode === '14-day' && comparisonData ? (
                  <span className={comparisonData.changes.costPerBooking.percent < 0 ? 'text-green-600' : 'text-red-500'}>
                    {comparisonData.changes.costPerBooking.percent > 0 ? '+' : ''}{comparisonData.changes.costPerBooking.percent.toFixed(1)}%
                  </span>
                ) : correlationData?.efficiency.change !== undefined ? (
                  <span className={correlationData.efficiency.change < 0 ? 'text-green-600' : 'text-red-500'}>
                    {correlationData.efficiency.change > 0 ? '+' : ''}{correlationData.efficiency.change.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-gray-400">--</span>
                )}
              </div>
              <p className="text-sm text-gray-600">Booking Efficiency</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold mb-1 text-red-500">
                {urgentActions.filter(a => a.priority === 'high').length}
              </div>
              <p className="text-sm text-gray-600">Urgent Actions</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold mb-1">
                {viewMode === '14-day' && comparisonData ? (
                  <span className={comparisonData.current.bookingShare >= 35 ? 'text-green-600' : 'text-yellow-500'}>
                    {comparisonData.current.bookingShare.toFixed(1)}%
                  </span>
                ) : correlationData?.efficiency.bookingShare !== undefined ? (
                  <span className={correlationData.efficiency.bookingShare >= 35 ? 'text-green-600' : 'text-yellow-500'}>
                    {correlationData.efficiency.bookingShare.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-gray-400">--</span>
                )}
              </div>
              <p className="text-sm text-gray-600">Google Booking Share</p>
            </div>
          </div>

          {urgentActions.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Urgent Actions Required
              </h4>
              <ul className="space-y-1">
                {urgentActions.map((action, index) => (
                  <li key={index} className="text-sm text-red-700 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      action.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    {action.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPerformanceComparison = () => {
    if (!comparisonData) return null;

    const formatChange = (change: { value: number; percent: number }) => ({
      value: change.value,
      percent: change.percent,
      color: change.percent < 0 ? 'text-green-600' : change.percent === 0 ? 'text-gray-600' : 'text-red-600',
      bgColor: change.percent < 0 ? 'bg-green-50' : change.percent === 0 ? 'bg-gray-50' : 'bg-red-50'
    });

    const metrics = [
      { label: 'Total Spend', current: `฿${comparisonData.current.totalSpend.toLocaleString()}`, 
        previous: `฿${comparisonData.previous.totalSpend.toLocaleString()}`, change: comparisonData.changes.totalSpend },
      { label: 'Google Bookings', current: comparisonData.current.googleBookings, 
        previous: comparisonData.previous.googleBookings, change: comparisonData.changes.googleBookings },
      { label: 'Cost per Booking', current: `฿${comparisonData.current.costPerBooking}`, 
        previous: `฿${comparisonData.previous.costPerBooking}`, change: comparisonData.changes.costPerBooking },
      { label: 'Click-through Rate', current: `${comparisonData.current.avgCTR.toFixed(2)}%`, 
        previous: `${comparisonData.previous.avgCTR.toFixed(2)}%`, change: comparisonData.changes.avgCTR },
      { label: 'Cost per Click', current: `฿${comparisonData.current.avgCPC.toFixed(2)}`, 
        previous: `฿${comparisonData.previous.avgCPC.toFixed(2)}`, change: comparisonData.changes.avgCPC },
      { label: 'Booking Share', current: `${comparisonData.current.bookingShare.toFixed(1)}%`, 
        previous: `${comparisonData.previous.bookingShare.toFixed(1)}%`, change: comparisonData.changes.bookingShare },
      { label: 'Click-to-Booking Rate', current: `${comparisonData.current.clickToBookingRate.toFixed(2)}%`, 
        previous: `${comparisonData.previous.clickToBookingRate.toFixed(2)}%`, change: comparisonData.changes.clickToBookingRate },
    ];

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {periodLength.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Period Comparison
          </CardTitle>
          <div className="text-sm text-gray-600">
            Current: {comparisonData.current.startDate} to {comparisonData.current.endDate} vs 
            Previous: {comparisonData.previous.startDate} to {comparisonData.previous.endDate}
            ({periodLength.replace('-', ' ')} periods)
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Metric</th>
                  <th className="text-right py-3 px-2">Current</th>
                  <th className="text-right py-3 px-2">Previous</th>
                  <th className="text-right py-3 px-2">Change</th>
                  <th className="text-right py-3 px-2">% Change</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, index) => {
                  const changeData = formatChange(metric.change);
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium">{metric.label}</td>
                      <td className="py-3 px-2 text-right">{metric.current}</td>
                      <td className="py-3 px-2 text-right text-gray-600">{metric.previous}</td>
                      <td className={`py-3 px-2 text-right font-medium ${changeData.color}`}>
                        {metric.change.value > 0 ? '+' : ''}{typeof metric.change.value === 'number' ? 
                          (metric.label.includes('฿') ? `฿${metric.change.value.toFixed(0)}` : 
                           metric.change.value.toFixed(2)) : metric.change.value}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Badge variant="outline" className={`${changeData.bgColor} ${changeData.color} border-0`}>
                          {metric.change.percent > 0 ? '+' : ''}{metric.change.percent.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCampaignBreakdown = () => {
    if (!comparisonData) return null;

    const currentCampaigns = comparisonData.current.campaignBreakdown.slice(0, 8);

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Campaign Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentCampaigns.map((campaign, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {campaign.campaignName}
                  </div>
                  <div className="text-xs text-gray-600">
                    {campaign.campaignType}
                  </div>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <div className="text-sm font-semibold">฿{campaign.spend.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Spend</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{campaign.clicks}</div>
                    <div className="text-xs text-gray-600">Clicks</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{campaign.ctr.toFixed(1)}%</div>
                    <div className="text-xs text-gray-600">CTR</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">฿{campaign.cpc.toFixed(0)}</div>
                    <div className="text-xs text-gray-600">CPC</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{campaign.bookingContribution.toFixed(1)}</div>
                    <div className="text-xs text-gray-600">Est. Bookings</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCampaignComparison = () => {
    if (!campaignComparison) return null;

    const { campaigns, periodDays } = campaignComparison;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" />
            Campaign Period Comparison ({periodDays} Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.slice(0, 10).map((campaign: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-sm">{campaign.campaignName}</h4>
                    <p className="text-xs text-gray-600">{campaign.campaignType}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold">฿{campaign.current.spend.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Current Spend</div>
                    <div className="text-xs">
                      <Badge variant="outline" className={`
                        ${campaign.changes.spend.percent < 0 ? 'bg-green-50 text-green-700' : 
                          campaign.changes.spend.percent > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'} border-0
                      `}>
                        {campaign.changes.spend.percent > 0 ? '+' : ''}{campaign.changes.spend.percent.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-semibold">{campaign.current.clicks}</div>
                    <div className="text-xs text-gray-600">Current Clicks</div>
                    <div className="text-xs">
                      <Badge variant="outline" className={`
                        ${campaign.changes.clicks.percent > 0 ? 'bg-green-50 text-green-700' : 
                          campaign.changes.clicks.percent < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'} border-0
                      `}>
                        {campaign.changes.clicks.percent > 0 ? '+' : ''}{campaign.changes.clicks.percent.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-semibold">{campaign.current.ctr.toFixed(2)}%</div>
                    <div className="text-xs text-gray-600">Current CTR</div>
                    <div className="text-xs">
                      <Badge variant="outline" className={`
                        ${campaign.changes.ctr.percent > 0 ? 'bg-green-50 text-green-700' : 
                          campaign.changes.ctr.percent < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'} border-0
                      `}>
                        {campaign.changes.ctr.percent > 0 ? '+' : ''}{campaign.changes.ctr.percent.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-semibold">฿{campaign.current.cpc.toFixed(2)}</div>
                    <div className="text-xs text-gray-600">Current CPC</div>
                    <div className="text-xs">
                      <Badge variant="outline" className={`
                        ${campaign.changes.cpc.percent < 0 ? 'bg-green-50 text-green-700' : 
                          campaign.changes.cpc.percent > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'} border-0
                      `}>
                        {campaign.changes.cpc.percent > 0 ? '+' : ''}{campaign.changes.cpc.percent.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-semibold">{campaign.current.bookingContribution.toFixed(1)}</div>
                    <div className="text-xs text-gray-600">Est. Bookings</div>
                    <div className="text-xs">
                      <Badge variant="outline" className={`
                        ${campaign.changes.bookingContribution.percent > 0 ? 'bg-green-50 text-green-700' : 
                          campaign.changes.bookingContribution.percent < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'} border-0
                      `}>
                        {campaign.changes.bookingContribution.percent > 0 ? '+' : ''}{campaign.changes.bookingContribution.percent.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Previous Period</div>
                    <div className="text-xs">฿{campaign.previous.spend.toLocaleString()}</div>
                    <div className="text-xs">{campaign.previous.clicks} clicks</div>
                    <div className="text-xs">{campaign.previous.ctr.toFixed(2)}% CTR</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBookingCorrelationPanel = () => {
    if (!correlationData) return null;

    const correlationDesc = getCorrelationDescription(correlationData.strength);

    // Combine spend and booking data for chart
    const combinedData = correlationData.spendData.map(spendPoint => {
      const bookingPoint = correlationData.bookingData.find(b => b.date === spendPoint.date);
      return {
        date: spendPoint.date,
        spend: spendPoint.spend,
        bookings: bookingPoint?.bookings || 0
      };
    });

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Google Ads ↔ Bookings Correlation
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <span>Period: Last {combinedData.length} Days</span>
            <span className={`font-semibold ${correlationDesc.color}`}>
              Correlation: {correlationDesc.text} ({correlationData.strength.toFixed(3)})
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">฿{correlationData.summary.totalSpend.toLocaleString()}</div>
              <div className="text-xs text-blue-600">Google Ads Spend</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{correlationData.summary.totalBookings}</div>
              <div className="text-xs text-green-600">Google Bookings</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">฿{correlationData.efficiency.costPerBooking}</div>
              <div className="text-xs text-purple-600">Cost/Booking</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-lg font-bold text-orange-600">{correlationData.efficiency.bookingShare}%</div>
              <div className="text-xs text-orange-600">Booking Share</div>
            </div>
          </div>

          {/* Correlation Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value, name) => {
                  if (name === 'Spend (฿)') return [`฿${parseFloat(String(value)).toFixed(0)}`, name];
                  return [value, name];
                }}
              />
              <Legend />
              <Area 
                yAxisId="left" 
                type="monotone" 
                dataKey="spend" 
                fill="#3b82f6" 
                fillOpacity={0.3} 
                stroke="#3b82f6" 
                name="Spend (฿)" 
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="bookings" 
                stroke="#10b981" 
                strokeWidth={3} 
                name="Bookings" 
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Efficiency Comparison */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cost per Booking Efficiency</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Previous: ฿{correlationData.efficiency.previousCostPerBooking}
                </span>
                <span className="text-sm text-gray-600">→</span>
                <span className="text-sm font-semibold">
                  Current: ฿{correlationData.efficiency.costPerBooking}
                </span>
                <Badge variant={correlationData.efficiency.change < 0 ? "default" : "destructive"}>
                  {correlationData.efficiency.change > 0 ? '+' : ''}{correlationData.efficiency.change.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCampaignInsights = () => {
    if (!analyticsData || analyticsData.type !== 'campaign_analytics') return null;

    // Take top 5 campaigns by spend
    const topCampaigns = analyticsData.data.slice(0, 5);

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-orange-600" />
            Campaign Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCampaigns.map((campaign, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm truncate max-w-xs">
                    {campaign.campaign_name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {campaign.campaign_type === '2' ? 'Search' : 
                     campaign.campaign_type === '10' ? 'Performance Max' : 
                     campaign.campaign_type === '9' ? 'Display' : 'Other'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">฿{campaign.cost_thb?.toFixed(0) || '0'}</div>
                  <div className="text-xs text-gray-600">{campaign.clicks || 0} clicks</div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-xs font-medium">{campaign.ctr}% CTR</div>
                  <div className="text-xs text-gray-600">฿{campaign.avg_cpc} CPC</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header - only show for non-pivot modes */}
      {viewMode !== 'pivot' && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Target className="h-7 w-7 text-blue-600" />
              Google Ads Strategic Dashboard
            </h2>
            <p className="text-gray-600 mt-1">Offline business attribution and correlation analysis</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <Select value={viewMode} onValueChange={(value: '14-day' | 'correlation' | 'campaigns' | 'pivot') => setViewMode(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pivot">Pivot Dashboard</SelectItem>
                <SelectItem value="14-day">Period Comparison</SelectItem>
                <SelectItem value="campaigns">Campaign Comparison</SelectItem>
                <SelectItem value="correlation">Correlation Analysis</SelectItem>
              </SelectContent>
            </Select>

            {/* Period Length (only show for comparison views) */}
            {(viewMode === '14-day' || viewMode === 'campaigns') && (
              <Select value={periodLength} onValueChange={(value: '14-day' | '30-day' | '90-day') => setPeriodLength(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="14-day">14 Days</SelectItem>
                  <SelectItem value="30-day">30 Days</SelectItem>
                  <SelectItem value="90-day">90 Days</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Refresh Button */}
            <Button
              onClick={refreshData}
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Universal View Mode Selector - always visible */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Dashboard View:</span>
        </div>
        <div className="flex items-center gap-3">
          <Select value={viewMode} onValueChange={(value: '14-day' | 'correlation' | 'campaigns' | 'pivot') => setViewMode(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pivot">🎯 Campaign Pivot Table</SelectItem>
              <SelectItem value="14-day">📊 Period Comparison</SelectItem>
              <SelectItem value="campaigns">🔀 Campaign Comparison</SelectItem>
              <SelectItem value="correlation">📈 Correlation Analysis</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Period selector for relevant views */}
          {(viewMode === '14-day' || viewMode === 'campaigns') && (
            <Select value={periodLength} onValueChange={(value: '14-day' | '30-day' | '90-day') => setPeriodLength(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="14-day">14 Days</SelectItem>
                <SelectItem value="30-day">30 Days</SelectItem>
                <SelectItem value="90-day">90 Days</SelectItem>
              </SelectContent>
            </Select>
          )}

          {viewMode !== 'pivot' && (
            <Button
              onClick={refreshData}
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-700">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading strategic dashboard data...</p>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Panels */}
      {!isLoading && (
        <>
          {viewMode === 'pivot' ? (
            // Pivot dashboard handles its own layout completely
            <GoogleAdsPivotDashboard />
          ) : (
            <>
              {renderExecutiveOverview()}
              {viewMode === '14-day' ? (
                <>
                  {renderPerformanceComparison()}
                  {renderCampaignBreakdown()}
                </>
              ) : viewMode === 'campaigns' ? (
                <>
                  {renderCampaignComparison()}
                </>
              ) : (
                <>
                  {renderBookingCorrelationPanel()}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* No Data State */}
      {!isLoading && viewMode !== 'pivot' &&
       ((viewMode === '14-day' && !comparisonData) || 
        (viewMode === 'campaigns' && !campaignComparison) || 
        (viewMode === 'correlation' && !correlationData)) && 
       !error && (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">
              {viewMode === '14-day' ? `No comparison data found for the ${periodLength} period.` :
               viewMode === 'campaigns' ? `No campaign comparison data found for the ${periodLength} period.` :
               'No correlation data found for the selected period.'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Ensure Google Ads data is synced and try refreshing.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}