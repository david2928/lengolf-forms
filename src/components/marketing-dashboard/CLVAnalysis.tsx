'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  RefreshCw,
  Users,
  AlertTriangle,
  Target,
  Crown,
  Award,
  BarChart3
} from 'lucide-react';

interface HistoricalCLVData {
  customer_id: string;
  customer_name: string;
  historical_clv: number;
  total_revenue: number;
  total_gross_profit: number;
  total_transactions: number;
  avg_transaction_value: number;
  customer_lifespan_days: number;
  monthly_avg_revenue: number;
  clv_tier: string;
  customer_segment: string;
}

interface PredictiveCLVData {
  customer_id: string;
  customer_name: string;
  current_clv: number;
  predicted_clv: number;
  predicted_additional_value: number;
  retention_probability: number;
  churn_risk_score: number;
  customer_segment: string;
  clv_growth_potential: string;
  recommended_investment: number;
}

interface PackageCLVData {
  product_category: string;
  customer_count: number;
  avg_package_value: number;
  avg_customer_clv: number;
  renewal_rate: number;
  cross_sell_rate: number;
  total_category_clv: number;
  category_ranking: number;
}

interface CLVBySourceData {
  acquisition_source: string;
  customer_count: number;
  avg_clv: number;
  total_clv: number;
  avg_cac: number;
  clv_to_cac_ratio: number;
  payback_period_months: number;
  source_roi_percent: number;
}

interface CLVAnalysisData {
  historicalCLV: HistoricalCLVData[];
  predictiveCLV: PredictiveCLVData[];
  packageCLV: PackageCLVData[];
  clvBySource: CLVBySourceData[];
  summary: {
    totalCustomers: number;
    avgHistoricalCLV: number;
    avgPredictedCLV: number;
    totalCLV: number;
    highValueCustomers: number;
    atRiskValue: number;
    topPerformingPackage: string;
    bestAcquisitionSource: string;
    overallCLVGrowth: number;
    dateRange: string;
  };
}

interface CLVAnalysisProps {
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function CLVAnalysis({ isLoading = false, onRefresh }: CLVAnalysisProps) {
  const [data, setData] = useState<CLVAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState<string>('overview');

  const fetchCLVData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/marketing/clv?type=${analysisType}`);
      if (!response.ok) {
        throw new Error('Failed to fetch CLV data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [analysisType]);

  useEffect(() => {
    fetchCLVData();
  }, [analysisType, fetchCLVData]);

  const handleRefresh = () => {
    fetchCLVData();
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

  const getCLVTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Silver': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Bronze': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getGrowthPotentialColor = (potential: string) => {
    switch (potential) {
      case 'High Growth': return 'bg-green-100 text-green-800';
      case 'Moderate Growth': return 'bg-yellow-100 text-yellow-800';
      case 'Low Growth': return 'bg-orange-100 text-orange-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 8) return 'text-red-600';
    if (score >= 6) return 'text-orange-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-green-600';
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
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load CLV Data</h3>
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
          <h2 className="text-2xl font-bold text-gray-900">Customer Lifetime Value Analysis</h2>
          <p className="text-gray-600">{data.summary.dateRange || 'Current Analysis'}</p>
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
            <p className="text-xs text-gray-600">With transaction history</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Avg Historical CLV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(data.summary.avgHistoricalCLV)}
            </div>
            <p className="text-xs text-gray-600">Per customer realized</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Predicted CLV Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.summary.overallCLVGrowth > 0 ? 'text-green-700' : 'text-red-700'}`}>
              {data.summary.overallCLVGrowth > 0 ? '+' : ''}{data.summary.overallCLVGrowth.toFixed(1)}%
            </div>
            <Badge variant="outline" className="text-xs">
              {data.summary.overallCLVGrowth > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              )}
              Growth Potential
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-600" />
              High Value Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {data.summary.highValueCustomers}
            </div>
            <p className="text-xs text-gray-600">
              {data.summary.totalCustomers > 0 ? 
                ((data.summary.highValueCustomers / data.summary.totalCustomers) * 100).toFixed(1) : 0
              }% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="predictive">Predictive</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Historical CLV Customers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-gold-600" />
                  Top CLV Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.historicalCLV.slice(0, 10).map((customer, index) => (
                    <div key={customer.customer_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{customer.customer_name}</span>
                          <Badge variant="outline" className={getCLVTierColor(customer.clv_tier)}>
                            {customer.clv_tier}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {customer.total_transactions} transactions • {customer.customer_segment}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-700">
                          {formatCurrency(customer.historical_clv)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatCurrency(customer.monthly_avg_revenue)}/mo avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CLV Distribution by Tier */}
            <Card>
              <CardHeader>
                <CardTitle>CLV Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    data.historicalCLV.reduce((acc: any, customer) => {
                      acc[customer.clv_tier] = (acc[customer.clv_tier] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([tier, count]: [string, any]) => {
                    const percentage = (count / data.historicalCLV.length) * 100;
                    return (
                      <div key={tier}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{tier}</span>
                          <span className="text-sm text-gray-600">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              tier === 'Platinum' ? 'bg-purple-600' :
                              tier === 'Gold' ? 'bg-yellow-600' :
                              tier === 'Silver' ? 'bg-gray-600' :
                              tier === 'Bronze' ? 'bg-orange-600' :
                              'bg-blue-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* At Risk Value Alert */}
          {data.summary.atRiskValue > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-5 w-5" />
                  At-Risk Customer Value Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-orange-700 mb-1">Total Value at Risk</p>
                    <p className="text-2xl font-bold text-orange-800">
                      {formatCurrency(data.summary.atRiskValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-700 mb-1">Recommended Action</p>
                    <p className="text-sm font-medium">Immediate retention campaigns</p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-700 mb-1">Potential Impact</p>
                    <p className="text-sm">
                      {((data.summary.atRiskValue / data.summary.totalCLV) * 100).toFixed(1)}% of total CLV
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Predictive CLV & Growth Potential</CardTitle>
              <p className="text-sm text-gray-600">
                Future value predictions based on customer behavior patterns
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Customer</th>
                      <th className="text-right py-2 px-3">Current CLV</th>
                      <th className="text-right py-2 px-3">Predicted CLV</th>
                      <th className="text-center py-2 px-3">Growth Potential</th>
                      <th className="text-center py-2 px-3">Churn Risk</th>
                      <th className="text-right py-2 px-3">Investment Rec.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.predictiveCLV.slice(0, 15).map((customer) => (
                      <tr key={customer.customer_id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-3">
                          <div>
                            <p className="font-medium text-sm">{customer.customer_name}</p>
                            <p className="text-xs text-gray-600">{customer.customer_segment}</p>
                          </div>
                        </td>
                        <td className="text-right py-3 px-3 font-mono text-sm">
                          {formatCurrency(customer.current_clv)}
                        </td>
                        <td className="text-right py-3 px-3 font-mono text-sm font-bold">
                          {formatCurrency(customer.predicted_clv)}
                        </td>
                        <td className="text-center py-3 px-3">
                          <Badge className={getGrowthPotentialColor(customer.clv_growth_potential)}>
                            {customer.clv_growth_potential}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-3">
                          <span className={`font-semibold ${getRiskColor(customer.churn_risk_score)}`}>
                            {customer.churn_risk_score.toFixed(1)}
                          </span>
                        </td>
                        <td className="text-right py-3 px-3 font-mono text-sm">
                          {formatCurrency(customer.recommended_investment)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CLV Analysis by Package Type</CardTitle>
              <p className="text-sm text-gray-600">
                Customer lifetime value performance by product category
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {data.packageCLV.map((pkg) => (
                  <div key={pkg.product_category} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold">{pkg.product_category}</h4>
                      <Badge variant="outline">
                        Rank #{pkg.category_ranking}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Customers</p>
                        <p className="font-semibold">{pkg.customer_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Package Value</p>
                        <p className="font-semibold">{formatCurrency(pkg.avg_package_value)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Customer CLV</p>
                        <p className="font-semibold">{formatCurrency(pkg.avg_customer_clv)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Renewal Rate</p>
                        <p className="font-semibold">{(pkg.renewal_rate * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Category CLV</span>
                        <span className="font-bold text-lg">{formatCurrency(pkg.total_category_clv)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CLV by Acquisition Source</CardTitle>
              <p className="text-sm text-gray-600">
                Customer lifetime value and ROI by marketing channel
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {data.clvBySource.map((source) => (
                  <div key={source.acquisition_source} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold">{source.acquisition_source}</h4>
                      <div className="flex items-center gap-2">
                        {source.clv_to_cac_ratio > 0 && (
                          <Badge variant={source.clv_to_cac_ratio >= 3 ? "default" : source.clv_to_cac_ratio >= 2 ? "secondary" : "destructive"}>
                            {source.clv_to_cac_ratio.toFixed(1)}:1 CLV:CAC
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {source.customer_count} customers
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Avg CLV</p>
                        <p className="font-semibold">{formatCurrency(source.avg_clv)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg CAC</p>
                        <p className="font-semibold">{source.avg_cac > 0 ? formatCurrency(source.avg_cac) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Payback Period</p>
                        <p className="font-semibold">
                          {source.payback_period_months > 0 ? `${source.payback_period_months.toFixed(1)} mo` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">ROI</p>
                        <p className={`font-semibold ${source.source_roi_percent > 100 ? 'text-green-600' : source.source_roi_percent > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {source.source_roi_percent > 0 ? `${source.source_roi_percent.toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Source CLV</span>
                        <span className="font-bold text-lg">{formatCurrency(source.total_clv)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            CLV Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <h4 className="font-semibold text-green-900 mb-2">Top Performing Package</h4>
              <p className="text-sm text-green-800">
                📈 &quot;{data.summary.topPerformingPackage}&quot; generates highest CLV - focus marketing efforts here
              </p>
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <h4 className="font-semibold text-blue-900 mb-2">Best Acquisition Channel</h4>
              <p className="text-sm text-blue-800">
                🎯 &quot;{data.summary.bestAcquisitionSource}&quot; has best CLV:CAC ratio - increase investment
              </p>
            </div>
            
            {data.summary.atRiskValue > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                <h4 className="font-semibold text-orange-900 mb-2">Retention Priority</h4>
                <p className="text-sm text-orange-800">
                  ⚠️ {formatCurrency(data.summary.atRiskValue)} in CLV at risk - implement targeted retention campaigns
                </p>
              </div>
            )}
            
            <div className="p-3 bg-purple-50 border border-purple-200 rounded">
              <h4 className="font-semibold text-purple-900 mb-2">Growth Opportunity</h4>
              <p className="text-sm text-purple-800">
                💡 {data.summary.overallCLVGrowth > 0 ? 'Positive' : 'Challenge'} CLV growth trend - 
                {data.summary.overallCLVGrowth > 0 
                  ? ' capitalize on high-potential customers' 
                  : ' focus on customer experience improvements'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}