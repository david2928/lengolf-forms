'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Target,
  Mail,
  Crown,
  Clock
} from 'lucide-react';

interface CustomerRFMData {
  customer_id: string;
  customer_name: string;
  recency_days: number;
  frequency: number;
  monetary_value: number;
  rfm_score: string;
  customer_segment: string;
  value_tier: string;
  total_transactions: number;
  total_revenue: number;
  avg_transaction_value: number;
  last_purchase_date: string;
}

interface SegmentSummaryData {
  customer_segment: string;
  value_tier: string;
  customer_count: number;
  total_revenue: number;
  avg_revenue_per_customer: number;
  avg_frequency: number;
  avg_recency_days: number;
  revenue_percentage: number;
}

interface AtRiskCustomerData {
  customer_id: string;
  customer_name: string;
  customer_segment: string;
  value_tier: string;
  recency_days: number;
  total_revenue: number;
  risk_score: number;
  recommended_action: string;
  contact_priority: number;
}

interface CustomerSegmentationData {
  customerRFM: CustomerRFMData[];
  segmentSummary: SegmentSummaryData[];
  atRiskCustomers: AtRiskCustomerData[];
  summary: {
    totalCustomers: number;
    championsCount: number;
    atRiskCount: number;
    lostCount: number;
    newCustomersCount: number;
    avgCustomerValue: number;
    totalAtRiskValue: number;
    segmentDistribution: { [key: string]: number };
    reactivationOpportunity: number;
  };
}

interface CustomerSegmentationProps {
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function CustomerSegmentation({ isLoading = false, onRefresh }: CustomerSegmentationProps) {
  const [data, setData] = useState<CustomerSegmentationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('overview');

  const fetchSegmentationData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/marketing/segments');
      if (!response.ok) {
        throw new Error('Failed to fetch customer segmentation data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegmentationData();
  }, []);

  const handleRefresh = () => {
    fetchSegmentationData();
    onRefresh?.();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getSegmentColor = (segment: string) => {
    const colors = {
      'Champions': 'bg-purple-100 text-purple-800 border-purple-200',
      'Loyal Customers': 'bg-blue-100 text-blue-800 border-blue-200',
      'Potential Loyalists': 'bg-green-100 text-green-800 border-green-200',
      'New Customers': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'At Risk': 'bg-orange-100 text-orange-800 border-orange-200',
      'Cant Lose Them': 'bg-red-100 text-red-800 border-red-200',
      'Lost': 'bg-gray-100 text-gray-800 border-gray-200',
      'Others': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[segment as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getValueTierColor = (tier: string) => {
    switch (tier) {
      case 'High Value': return 'bg-green-100 text-green-800';
      case 'Medium Value': return 'bg-yellow-100 text-yellow-800';
      case 'Low Value': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || isLoading) {
    return (
      <div className="space-y-6">
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
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Segmentation Data</h3>
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
          <h2 className="text-2xl font-bold text-gray-900">Customer Segmentation</h2>
          <p className="text-gray-600">RFM Analysis & Behavioral Segments</p>
        </div>
        
        <div className="flex items-center gap-3">
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
            <p className="text-xs text-gray-600">Active in analysis period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-600" />
              Champions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{data.summary.championsCount}</div>
            <p className="text-xs text-gray-600">
              {((data.summary.championsCount / data.summary.totalCustomers) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{data.summary.atRiskCount}</div>
            <div className="text-xs text-orange-600 font-medium">
              {formatCurrency(data.summary.totalAtRiskValue)} value
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              Reactivation Opportunity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(data.summary.reactivationOpportunity)}
            </div>
            <p className="text-xs text-gray-600">High-value lost customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="at-risk">At Risk</TabsTrigger>
          <TabsTrigger value="segments">All Segments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Segment Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Segment Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {Object.entries(data.summary.segmentDistribution).map(([segment, count]) => {
                  const percentage = (count / data.summary.totalCustomers) * 100;
                  const segmentData = data.segmentSummary.find(s => s.customer_segment === segment);
                  const avgRevenue = segmentData ? 
                    segmentData.total_revenue / segmentData.customer_count : 0;
                  
                  return (
                    <div key={segment} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={getSegmentColor(segment)}>
                          {segment}
                        </Badge>
                        <div>
                          <p className="font-medium">{count} customers</p>
                          <p className="text-xs text-gray-600">
                            {percentage.toFixed(1)}% of total • Avg: {formatCurrency(avgRevenue)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Segments by Revenue */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Segment & Value Tier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Segment</th>
                      <th className="text-left py-2 px-3">Value Tier</th>
                      <th className="text-center py-2 px-3">Customers</th>
                      <th className="text-right py-2 px-3">Total Revenue</th>
                      <th className="text-right py-2 px-3">Avg Revenue</th>
                      <th className="text-center py-2 px-3">Revenue %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.segmentSummary
                      .sort((a, b) => b.total_revenue - a.total_revenue)
                      .slice(0, 10)
                      .map((segment, index) => (
                        <tr key={`${segment.customer_segment}-${segment.value_tier}`} 
                            className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <Badge variant="outline" className={getSegmentColor(segment.customer_segment)}>
                              {segment.customer_segment}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Badge className={getValueTierColor(segment.value_tier)}>
                              {segment.value_tier}
                            </Badge>
                          </td>
                          <td className="text-center py-3 px-3">{segment.customer_count}</td>
                          <td className="text-right py-3 px-3 font-mono">
                            {formatCurrency(segment.total_revenue)}
                          </td>
                          <td className="text-right py-3 px-3 font-mono">
                            {formatCurrency(segment.avg_revenue_per_customer)}
                          </td>
                          <td className="text-center py-3 px-3">
                            <div className="flex items-center justify-center">
                              <span className="font-semibold">{segment.revenue_percentage.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="at-risk" className="space-y-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                High-Priority At-Risk Customers
              </CardTitle>
              <p className="text-sm text-orange-700">
                Customers requiring immediate attention to prevent churn
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.atRiskCustomers.slice(0, 15).map((customer) => (
                  <div key={customer.customer_id} 
                       className="flex items-center justify-between p-4 bg-white border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={getPriorityColor(customer.contact_priority)}>
                        Priority {customer.contact_priority}
                      </Badge>
                      <div>
                        <p className="font-medium">{customer.customer_name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          <Badge variant="outline" className={getSegmentColor(customer.customer_segment)}>
                            {customer.customer_segment}
                          </Badge>
                          <Badge className={getValueTierColor(customer.value_tier)}>
                            {customer.value_tier}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {customer.recency_days} days ago
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {formatCurrency(customer.total_revenue)}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        Risk Score: {customer.risk_score.toFixed(1)}/10
                      </div>
                      <Button size="sm" variant="outline" className="text-xs">
                        <Mail className="h-3 w-3 mr-1" />
                        {customer.recommended_action}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {data.atRiskCustomers.length > 15 && (
                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Showing top 15 of {data.atRiskCustomers.length} at-risk customers
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    View All At-Risk Customers
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Customer Segments</CardTitle>
              <p className="text-sm text-gray-600">
                Complete RFM analysis with segment behavioral patterns
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Customer</th>
                      <th className="text-center py-2 px-3">Segment</th>
                      <th className="text-center py-2 px-3">Value Tier</th>
                      <th className="text-center py-2 px-3">RFM Score</th>
                      <th className="text-right py-2 px-3">Total Revenue</th>
                      <th className="text-center py-2 px-3">Frequency</th>
                      <th className="text-center py-2 px-3">Recency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customerRFM.slice(0, 20).map((customer) => (
                      <tr key={customer.customer_id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-3">
                          <div>
                            <p className="font-medium text-sm">{customer.customer_name}</p>
                            <p className="text-xs text-gray-600">
                              {customer.total_transactions} transactions
                            </p>
                          </div>
                        </td>
                        <td className="text-center py-3 px-3">
                          <Badge variant="outline" className={getSegmentColor(customer.customer_segment)}>
                            {customer.customer_segment}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-3">
                          <Badge className={getValueTierColor(customer.value_tier)}>
                            {customer.value_tier}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-3 font-mono text-sm">
                          {customer.rfm_score}
                        </td>
                        <td className="text-right py-3 px-3 font-mono">
                          {formatCurrency(customer.total_revenue)}
                        </td>
                        <td className="text-center py-3 px-3">
                          {customer.frequency} months
                        </td>
                        <td className="text-center py-3 px-3">
                          <span className={`font-medium ${
                            customer.recency_days <= 30 ? 'text-green-600' :
                            customer.recency_days <= 90 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {customer.recency_days}d
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {data.customerRFM.length > 20 && (
                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">
                    Showing top 20 of {data.customerRFM.length} customers
                  </p>
                  <Button variant="outline" size="sm">
                    View All Customers
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Segmentation Insights & Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded">
              <h4 className="font-semibold text-purple-900 mb-2">Champions Focus</h4>
              <p className="text-sm text-purple-800">
                {data.summary.championsCount} Champions generate premium value - create VIP experiences and referral programs
              </p>
            </div>
            
            <div className="p-3 bg-orange-50 border border-orange-200 rounded">
              <h4 className="font-semibold text-orange-900 mb-2">Urgent Intervention</h4>
              <p className="text-sm text-orange-800">
                {data.summary.atRiskCount} customers at risk with {formatCurrency(data.summary.totalAtRiskValue)} in value - launch retention campaigns
              </p>
            </div>
            
            {data.summary.reactivationOpportunity > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <h4 className="font-semibold text-green-900 mb-2">Win-Back Opportunity</h4>
                <p className="text-sm text-green-800">
                  {formatCurrency(data.summary.reactivationOpportunity)} potential from reactivating high-value lost customers
                </p>
              </div>
            )}
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <h4 className="font-semibold text-blue-900 mb-2">Growth Strategy</h4>
              <p className="text-sm text-blue-800">
                Focus on converting &quot;Potential Loyalists&quot; to &quot;Loyal Customers&quot; through targeted package offers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}