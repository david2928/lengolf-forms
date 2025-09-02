'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  RefreshCw,
  Download,
  AlertTriangle,
  Target
} from 'lucide-react';

interface CohortRetentionData {
  cohort_month: string;
  cohort_size: number;
  retention_1: number;
  retention_3: number;
  retention_6: number;
  retention_12: number;
}

interface RevenueRetentionData {
  cohort_month: string;
  cohort_revenue: number;
  revenue_retention_1: number;
  revenue_retention_3: number;
  revenue_retention_6: number;
  revenue_retention_12: number;
}

interface RetentionByChannelData {
  referral_source: string;
  cohort_month: string;
  cohort_size: number;
  retention_1: number;
  retention_3: number;
  retention_6: number;
  avg_revenue_per_customer: number;
}

interface RetentionAnalysisData {
  cohortRetention: CohortRetentionData[];
  revenueRetention: RevenueRetentionData[];
  channelRetention: RetentionByChannelData[];
  summary: {
    totalCustomers: number;
    avgRetentionMonth1: number;
    avgRetentionMonth3: number;
    avgRetentionMonth6: number;
    avgRevenueRetention: number;
    bestPerformingChannel: string;
    dateRange: string;
  };
}

interface RetentionAnalysisProps {
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function RetentionAnalysis({ isLoading = false, onRefresh }: RetentionAnalysisProps) {
  const [data, setData] = useState<RetentionAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('12');
  const [selectedView, setSelectedView] = useState<string>('cohort');

  const fetchRetentionData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/marketing/retention?months=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch retention data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchRetentionData();
  }, [timeRange, fetchRetentionData]);

  const handleRefresh = () => {
    fetchRetentionData();
    onRefresh?.();
  };

  const getRetentionColor = (retention: number) => {
    if (retention >= 30) return 'bg-green-500';
    if (retention >= 20) return 'bg-yellow-500';
    if (retention >= 10) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getRetentionTextColor = (retention: number) => {
    if (retention >= 30) return 'text-green-700';
    if (retention >= 20) return 'text-yellow-700';
    if (retention >= 10) return 'text-orange-700';
    return 'text-red-700';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading || isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Retention Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Retention Analysis</h2>
          <p className="text-gray-600">{data.summary.dateRange}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 Months</SelectItem>
              <SelectItem value="12">12 Months</SelectItem>
              <SelectItem value="18">18 Months</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedView} onValueChange={setSelectedView}>
            <SelectTrigger className="w-40">
              <Target className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cohort">Cohort View</SelectItem>
              <SelectItem value="revenue">Revenue View</SelectItem>
              <SelectItem value="channel">By Channel</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-gray-600">In cohort period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Month 1 Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRetentionTextColor(data.summary.avgRetentionMonth1)}`}>
              {data.summary.avgRetentionMonth1.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600">Average across cohorts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Month 3 Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRetentionTextColor(data.summary.avgRetentionMonth3)}`}>
              {data.summary.avgRetentionMonth3.toFixed(1)}%
            </div>
            <Badge variant="outline" className="text-xs">
              {data.summary.avgRetentionMonth3 > data.summary.avgRetentionMonth1 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              )}
              vs Month 1
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Best Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {data.summary.bestPerformingChannel}
            </div>
            <p className="text-xs text-gray-600">Highest retention rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis View */}
      {selectedView === 'cohort' && (
        <Card>
          <CardHeader>
            <CardTitle>Cohort Retention Analysis</CardTitle>
            <p className="text-sm text-gray-600">
              Customer retention percentage by months since first purchase
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Cohort</th>
                    <th className="text-center py-2 px-3">Size</th>
                    <th className="text-center py-2 px-3">Month 1</th>
                    <th className="text-center py-2 px-3">Month 3</th>
                    <th className="text-center py-2 px-3">Month 6</th>
                    <th className="text-center py-2 px-3">Month 12</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cohortRetention.map((cohort) => (
                    <tr key={cohort.cohort_month} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium">{cohort.cohort_month}</td>
                      <td className="text-center py-3 px-3">{cohort.cohort_size.toLocaleString()}</td>
                      <td className="text-center py-3 px-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          cohort.retention_1 >= 30 ? 'bg-green-100 text-green-800' :
                          cohort.retention_1 >= 20 ? 'bg-yellow-100 text-yellow-800' :
                          cohort.retention_1 >= 10 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {cohort.retention_1.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          cohort.retention_3 >= 30 ? 'bg-green-100 text-green-800' :
                          cohort.retention_3 >= 20 ? 'bg-yellow-100 text-yellow-800' :
                          cohort.retention_3 >= 10 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {cohort.retention_3.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          cohort.retention_6 >= 30 ? 'bg-green-100 text-green-800' :
                          cohort.retention_6 >= 20 ? 'bg-yellow-100 text-yellow-800' :
                          cohort.retention_6 >= 10 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {cohort.retention_6.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          cohort.retention_12 >= 30 ? 'bg-green-100 text-green-800' :
                          cohort.retention_12 >= 20 ? 'bg-yellow-100 text-yellow-800' :
                          cohort.retention_12 >= 10 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {cohort.retention_12.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedView === 'revenue' && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Retention Analysis</CardTitle>
            <p className="text-sm text-gray-600">
              Revenue retention percentage by cohort over time
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Cohort</th>
                    <th className="text-right py-2 px-3">Initial Revenue</th>
                    <th className="text-center py-2 px-3">Month 1</th>
                    <th className="text-center py-2 px-3">Month 3</th>
                    <th className="text-center py-2 px-3">Month 6</th>
                    <th className="text-center py-2 px-3">Month 12</th>
                  </tr>
                </thead>
                <tbody>
                  {data.revenueRetention.map((cohort) => (
                    <tr key={cohort.cohort_month} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium">{cohort.cohort_month}</td>
                      <td className="text-right py-3 px-3 font-mono">
                        {formatCurrency(cohort.cohort_revenue)}
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          cohort.revenue_retention_1 >= 50 ? 'bg-green-100 text-green-800' :
                          cohort.revenue_retention_1 >= 30 ? 'bg-yellow-100 text-yellow-800' :
                          cohort.revenue_retention_1 >= 15 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {cohort.revenue_retention_1.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          cohort.revenue_retention_3 >= 50 ? 'bg-green-100 text-green-800' :
                          cohort.revenue_retention_3 >= 30 ? 'bg-yellow-100 text-yellow-800' :
                          cohort.revenue_retention_3 >= 15 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {cohort.revenue_retention_3.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          cohort.revenue_retention_6 >= 50 ? 'bg-green-100 text-green-800' :
                          cohort.revenue_retention_6 >= 30 ? 'bg-yellow-100 text-yellow-800' :
                          cohort.revenue_retention_6 >= 15 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {cohort.revenue_retention_6.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          cohort.revenue_retention_12 >= 50 ? 'bg-green-100 text-green-800' :
                          cohort.revenue_retention_12 >= 30 ? 'bg-yellow-100 text-yellow-800' :
                          cohort.revenue_retention_12 >= 15 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {cohort.revenue_retention_12.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedView === 'channel' && (
        <Card>
          <CardHeader>
            <CardTitle>Retention by Acquisition Channel</CardTitle>
            <p className="text-sm text-gray-600">
              Customer retention rates by marketing channel
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {Object.entries(
                data.channelRetention.reduce((acc: Record<string, RetentionByChannelData[]>, item) => {
                  if (!acc[item.referral_source]) {
                    acc[item.referral_source] = [];
                  }
                  acc[item.referral_source].push(item);
                  return acc;
                }, {} as Record<string, RetentionByChannelData[]>)
              ).map(([source, items]: [string, RetentionByChannelData[]]) => {
                const avgRetention3 = items.reduce((sum, item) => sum + item.retention_3, 0) / items.length;
                const avgRevenue = items.reduce((sum, item) => sum + item.avg_revenue_per_customer, 0) / items.length;
                const totalCustomers = items.reduce((sum, item) => sum + item.cohort_size, 0);
                
                return (
                  <div key={source} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold">{source}</h4>
                      <Badge variant="outline">
                        {totalCustomers} customers
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">3-Month Retention</p>
                        <p className={`font-semibold ${getRetentionTextColor(avgRetention3)}`}>
                          {avgRetention3.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Revenue/Customer</p>
                        <p className="font-semibold">{formatCurrency(avgRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Performance</p>
                        <Badge 
                          variant={avgRetention3 >= 25 ? "default" : avgRetention3 >= 15 ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {avgRetention3 >= 25 ? "Excellent" : avgRetention3 >= 15 ? "Good" : "Needs Improvement"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Key Insights & Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <h4 className="font-semibold text-blue-900 mb-2">Overall Performance</h4>
              <p className="text-sm text-blue-800">
                {data.summary.avgRetentionMonth1 >= 20 ? 
                  "✅ Strong 1-month retention indicates good initial customer experience" :
                  "⚠️ Low 1-month retention suggests need to improve onboarding and early engagement"
                }
              </p>
            </div>
            
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <h4 className="font-semibold text-green-900 mb-2">Channel Performance</h4>
              <p className="text-sm text-green-800">
                📈 Focus marketing spend on &quot;{data.summary.bestPerformingChannel}&quot; - highest retention channel
              </p>
            </div>
            
            <div className="p-3 bg-orange-50 border border-orange-200 rounded">
              <h4 className="font-semibold text-orange-900 mb-2">Improvement Opportunities</h4>
              <p className="text-sm text-orange-800">
                {data.summary.avgRetentionMonth3 < 15 ? 
                  "💡 Consider package incentives and loyalty programs to improve 3-month retention" :
                  "💡 Explore upselling opportunities for retained customers"
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}