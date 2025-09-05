import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';

interface PerformanceChartData {
  dates: string[];
  spend: number[];
  bookings: number[];
  impressions: number[];
  clicks: number[];
}

interface MetaAdsPerformanceChartProps {
  timeRange: string;
  referenceDate: string;
  isLoading: boolean;
}

const MetaAdsPerformanceChart: React.FC<MetaAdsPerformanceChartProps> = ({
  timeRange,
  referenceDate,
  isLoading
}) => {
  const [chartData, setChartData] = useState<PerformanceChartData | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<string[]>(['spend', 'bookings']);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  const fetchChartData = async () => {
    try {
      setIsLoadingChart(true);
      const metricsParam = activeMetrics.join(',');
      const response = await fetch(`/api/meta-ads/performance-chart?days=${timeRange}&referenceDate=${referenceDate}&metrics=${metricsParam}`);
      
      if (!response.ok) {
        throw new Error(`Chart data fetch failed: ${response.status}`);
      }
      
      const data = await response.json();
      setChartData(data);
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    } finally {
      setIsLoadingChart(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      fetchChartData();
    }
  }, [timeRange, referenceDate, activeMetrics, isLoading]);

  const toggleMetric = (metric: string) => {
    setActiveMetrics(prev => 
      prev.includes(metric) 
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  const formatChartData = () => {
    if (!chartData || !chartData.dates) return [];
    
    return chartData.dates.map((date, index) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: date,
      spend: chartData.spend?.[index] || 0,
      bookings: chartData.bookings?.[index] || 0,
      impressions: chartData.impressions?.[index] || 0,
      clicks: chartData.clicks?.[index] || 0
    }));
  };

  const formatCurrency = (value: number) => `฿${Math.round(value).toLocaleString('th-TH')}`;
  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const metricOptions = [
    { key: 'spend', label: 'Spend', color: '#3B82F6', format: formatCurrency },
    { key: 'bookings', label: 'Bookings', color: '#10B981', format: (v: number) => v.toString() },
    { key: 'impressions', label: 'Impressions', color: '#8B5CF6', format: formatNumber },
    { key: 'clicks', label: 'Clicks', color: '#F59E0B', format: formatNumber }
  ];

  const formattedData = formatChartData();

  if (isLoading || isLoadingChart) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Trends
          </CardTitle>
          
          {/* Metric Toggles */}
          <div className="flex flex-wrap gap-2">
            {metricOptions.map(option => (
              <Button
                key={option.key}
                variant={activeMetrics.includes(option.key) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleMetric(option.key)}
                className="flex items-center gap-2"
                style={{
                  backgroundColor: activeMetrics.includes(option.key) ? option.color : undefined,
                  borderColor: option.color
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: option.color }}
                />
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {formattedData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                />
                
                {/* Primary Y-axis for Spend */}
                {activeMetrics.includes('spend') && (
                  <YAxis 
                    yAxisId="spend"
                    orientation="left"
                    stroke="#3B82F6"
                    fontSize={12}
                    tickFormatter={formatCurrency}
                    tickLine={false}
                  />
                )}
                
                {/* Secondary Y-axis for other metrics */}
                {activeMetrics.some(m => m !== 'spend') && (
                  <YAxis 
                    yAxisId="other"
                    orientation="right"
                    stroke="#10B981"
                    fontSize={12}
                    tickFormatter={formatNumber}
                    tickLine={false}
                  />
                )}
                
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number, name: string) => {
                    const option = metricOptions.find(o => o.key === name);
                    return [option?.format(value) || value, option?.label || name];
                  }}
                  labelFormatter={(date: string) => `Date: ${date}`}
                />
                
                {/* Render spend as bars */}
                {activeMetrics.includes('spend') && (
                  <Bar 
                    yAxisId="spend"
                    dataKey="spend" 
                    fill="#3B82F6" 
                    opacity={0.7}
                    radius={[2, 2, 0, 0]}
                  />
                )}
                
                {/* Render other metrics as lines */}
                {activeMetrics.filter(m => m !== 'spend').map(metric => {
                  const option = metricOptions.find(o => o.key === metric);
                  return (
                    <Line
                      key={metric}
                      yAxisId="other"
                      type="monotone"
                      dataKey={metric}
                      stroke={option?.color || '#666'}
                      strokeWidth={2}
                      dot={{ fill: option?.color || '#666', strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, fill: option?.color || '#666' }}
                    />
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No performance data available for the selected period</p>
              <p className="text-sm">Try adjusting the date range or check back later</p>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {formattedData.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6 mt-6 pt-6 border-t border-gray-100">
            {activeMetrics.map(metric => {
              const option = metricOptions.find(o => o.key === metric);
              const total = formattedData.reduce((sum, day) => sum + (day[metric as keyof typeof day] as number), 0);
              const average = total / formattedData.length;
              
              return (
                <div key={metric} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: option?.color }}
                    />
                    <span className="text-sm font-medium text-gray-600">{option?.label}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {option?.format(total) || total}
                  </div>
                  <div className="text-xs text-gray-500">
                    Avg: {metric === 'bookings' ? Math.round(average * 10) / 10 : (option?.format(average) || Math.round(average))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetaAdsPerformanceChart;