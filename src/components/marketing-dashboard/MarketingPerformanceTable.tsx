import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Filter
} from 'lucide-react';

// Import the interface from the hook
interface WeeklyPerformance {
  period: string;
  weekStart: string;
  weekEnd: string;
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  googleImpressions: number;
  metaImpressions: number;
  totalImpressions: number;
  googleClicks: number;
  metaClicks: number;
  totalClicks: number;
  googleCtr: number;
  metaCtr: number;
  averageCtr: number;
  googleConversions: number;
  metaConversions: number;
  totalConversions: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  cac: number;
  roas: number;
  weekOverWeekSpendChange: number;
  weekOverWeekConversionsChange: number;
  weekOverWeekNewCustomersChange: number;
}

interface Rolling7DayPerformance {
  period: string;
  periodStart: string;
  periodEnd: string;
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  googleImpressions: number;
  metaImpressions: number;
  totalImpressions: number;
  googleClicks: number;
  metaClicks: number;
  totalClicks: number;
  googleCtr: number;
  metaCtr: number;
  averageCtr: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  cac: number;
  roas: number;
  periodOverPeriodSpendChange: number;
  periodOverPeriodNewCustomersChange: number;
}

interface PerformanceData {
  currentWeek: WeekData;
  previousWeek: WeekData;
  fourWeekAverage: WeekData;
  threeWeeksAgo: WeekData;
  fourWeeksAgo: WeekData;
  fiveWeeksAgo: WeekData;
  mtd: MonthData;
  monthMinus1: MonthData;
  monthMinus2: MonthData;
}

interface WeekData {
  period: string;
  weekStart: string;
  weekEnd: string;
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  googleImpressions: number;
  metaImpressions: number;
  totalImpressions: number;
  googleClicks: number;
  metaClicks: number;
  totalClicks: number;
  googleCtr: number;
  metaCtr: number;
  averageCtr: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  cac: number;
  roas: number;
  weekOverWeekSpendChange?: number;
  weekOverWeekNewCustomersChange?: number;
}

interface MonthData {
  period: string;
  monthStart: string;
  monthEnd: string;
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  googleImpressions: number;
  metaImpressions: number;
  totalImpressions: number;
  googleClicks: number;
  metaClicks: number;
  totalClicks: number;
  googleCtr: number;
  metaCtr: number;
  averageCtr: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  cac: number;
  roas: number;
}

interface MonthlyPerformance {
  period: string;
  monthStart: string;
  monthEnd: string;
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  googleImpressions: number;
  metaImpressions: number;
  totalImpressions: number;
  googleClicks: number;
  metaClicks: number;
  totalClicks: number;
  googleCtr: number;
  metaCtr: number;
  averageCtr: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  cac: number;
  roas: number;
}

interface MarketingPerformanceTableProps {
  data: (WeeklyPerformance | Rolling7DayPerformance)[];
  monthlyData?: MonthlyPerformance[];
  isLoading?: boolean;
  onExport?: () => void;
}


const MarketingPerformanceTable: React.FC<MarketingPerformanceTableProps> = ({
  data,
  monthlyData,
  isLoading = false,
  onExport
}) => {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');

  // Helper functions to handle both data types
  const getStartDate = (item: WeeklyPerformance | Rolling7DayPerformance): string => {
    return 'weekStart' in item ? item.weekStart : item.periodStart;
  };

  const getEndDate = (item: WeeklyPerformance | Rolling7DayPerformance): string => {
    return 'weekEnd' in item ? item.weekEnd : item.periodEnd;
  };

  const getChangeValues = (item: WeeklyPerformance | Rolling7DayPerformance) => {
    if ('weekOverWeekSpendChange' in item) {
      return {
        spendChange: item.weekOverWeekSpendChange,
        newCustomersChange: item.weekOverWeekNewCustomersChange
      };
    } else {
      return {
        spendChange: item.periodOverPeriodSpendChange,
        newCustomersChange: item.periodOverPeriodNewCustomersChange
      };
    }
  };
  
  // Determine if we're using rolling periods or weekly periods
  const isRollingPeriods = data && data.length > 0 && 'periodStart' in data[0];

  // Transform the WeeklyPerformance[] data into the required structure
  const transformedData = React.useMemo(() => {
    if (!data || data.length === 0) return null;
    
    // Sort data by period (most recent first)
    const sortedData = [...data].sort((a, b) => new Date(getEndDate(b)).getTime() - new Date(getEndDate(a)).getTime());
    
    // Calculate 4-week average for the current period
    const recentFourWeeks = sortedData.slice(0, 4);
    const fourWeekAverage = recentFourWeeks.reduce((acc, week) => ({
      totalSpend: acc.totalSpend + week.totalSpend,
      googleSpend: acc.googleSpend + week.googleSpend,
      metaSpend: acc.metaSpend + week.metaSpend,
      totalImpressions: acc.totalImpressions + week.totalImpressions,
      googleImpressions: acc.googleImpressions + week.googleImpressions,
      metaImpressions: acc.metaImpressions + week.metaImpressions,
      totalClicks: acc.totalClicks + week.totalClicks,
      googleClicks: acc.googleClicks + week.googleClicks,
      metaClicks: acc.metaClicks + week.metaClicks,
      totalNewCustomers: acc.totalNewCustomers + week.totalNewCustomers,
      googleNewCustomers: acc.googleNewCustomers + week.googleNewCustomers,
      metaNewCustomers: acc.metaNewCustomers + week.metaNewCustomers,
      cac: acc.cac + week.cac,
      roas: acc.roas + week.roas,
    }), {
      totalSpend: 0, googleSpend: 0, metaSpend: 0,
      totalImpressions: 0, googleImpressions: 0, metaImpressions: 0,
      totalClicks: 0, googleClicks: 0, metaClicks: 0,
      totalNewCustomers: 0, googleNewCustomers: 0, metaNewCustomers: 0,
      cac: 0, roas: 0
    });
    
    // Average the 4-week totals
    const avgDivisor = recentFourWeeks.length;
    Object.keys(fourWeekAverage).forEach(key => {
      fourWeekAverage[key as keyof typeof fourWeekAverage] = fourWeekAverage[key as keyof typeof fourWeekAverage] / avgDivisor;
    });
    
    // Note: Monthly data will be fetched separately from the monthly API
    // For now, we'll use placeholder monthly data that will be replaced
    // when the component is enhanced to support both weekly and monthly views

    return {
      currentWeek: sortedData[0] || null,
      previousWeek: sortedData[1] || null,
      fourWeekAverage,
      threeWeeksAgo: sortedData[2] || null,
      fourWeeksAgo: sortedData[3] || null,
      fiveWeeksAgo: sortedData[4] || null,
      // Use actual monthly data if available
      mtd: monthlyData && monthlyData[0] ? monthlyData[0] : null,
      monthMinus1: monthlyData && monthlyData[1] ? monthlyData[1] : null,
      monthMinus2: monthlyData && monthlyData[2] ? monthlyData[2] : null,
    };
  }, [data, monthlyData]);

  const formatCurrency = (value: number | undefined | null) => {
    if (value == null || isNaN(value)) {
      return '฿0';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number | undefined | null, decimals: number = 0) => {
    if (value == null || isNaN(value)) {
      return '0';
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(decimals);
  };

  const formatPercentage = (value: number | undefined | null, decimals: number = 2) => {
    if (value == null || isNaN(value)) {
      return '0%';
    }
    return `${value.toFixed(decimals)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="h-3 w-3 text-green-600" />;
    } else if (change < 0) {
      return <TrendingDown className="h-3 w-3 text-red-600" />;
    }
    return null;
  };

  const getTrendColor = (change: number, inverse: boolean = false) => {
    if (inverse) {
      if (change > 0) return 'text-red-600';
      if (change < 0) return 'text-green-600';
    } else {
      if (change > 0) return 'text-green-600';
      if (change < 0) return 'text-red-600';
    }
    return 'text-gray-500';
  };

  const calculatePercentageChange = (current: number | undefined, average: number | undefined) => {
    if (!current || !average || average === 0) return 0;
    return ((current - average) / average) * 100;
  };

  const formatPercentageChange = (current: number | undefined, average: number | undefined) => {
    const change = calculatePercentageChange(current, average);
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
        <div className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableHead className="font-semibold text-gray-700 py-4 px-6 text-left w-[200px]">
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  {Array.from({ length: 9 }).map((_, index) => (
                    <TableHead key={index} className="font-semibold text-gray-700 py-4 px-2 text-center min-w-20">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-16 mx-auto" />
                        <Skeleton className="h-3 w-20 mx-auto" />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Create skeleton rows for each metric group */}
                {['Spend', 'Impressions', 'Clicks', 'New Customers', 'CAC', 'ROAS'].map((metric, metricIndex) => (
                  <React.Fragment key={metric}>
                    {/* Main metric row */}
                    <TableRow className="border-b border-gray-100">
                      <TableCell className="py-4 px-6 bg-gray-50/30">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      {Array.from({ length: 9 }).map((_, weekIndex) => (
                        <TableCell key={weekIndex} className="py-4 px-2 text-center">
                          <Skeleton className="h-4 w-16 mx-auto" />
                        </TableCell>
                      ))}
                    </TableRow>
                    {/* Platform rows for metrics that have them */}
                    {['Spend', 'Impressions', 'Clicks', 'New Customers'].includes(metric) && (
                      <>
                        <TableRow className="border-b border-gray-100">
                          <TableCell className="py-3 px-6 pl-12">
                            <Skeleton className="h-3 w-12" />
                          </TableCell>
                          {Array.from({ length: 9 }).map((_, weekIndex) => (
                            <TableCell key={weekIndex} className="py-3 px-2 text-center">
                              <Skeleton className="h-3 w-12 mx-auto" />
                            </TableCell>
                          ))}
                        </TableRow>
                        {metric !== 'Impressions' && (
                          <TableRow className="border-b border-gray-100">
                            <TableCell className="py-3 px-6 pl-12">
                              <Skeleton className="h-3 w-8" />
                            </TableCell>
                            {Array.from({ length: 9 }).map((_, weekIndex) => (
                              <TableCell key={weekIndex} className="py-3 px-2 text-center">
                                <Skeleton className="h-3 w-12 mx-auto" />
                              </TableCell>
                            ))}
                          </TableRow>
                        )}
                      </>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Performance Breakdown</h3>
            <p className="text-sm text-gray-600 mt-1">
              Weekly performance comparison across platforms
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={viewMode} onValueChange={(value: 'weekly' | 'monthly') => setViewMode(value)}>
              <SelectTrigger className="w-32 border-gray-200">
                <Filter className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {onExport && (
              <Button
                onClick={onExport}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-gray-200 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                <TableHead className="font-semibold text-gray-700 py-3 px-4 text-left w-[180px]">Metric</TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[130px]">
                  <div className="text-xs">Current</div>
                  <div className="text-[10px] text-gray-500 font-normal">{isRollingPeriods ? 'This Period' : 'This Week'}</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[130px]">
                  <div className="text-xs">Previous</div>
                  <div className="text-[10px] text-gray-500 font-normal">{isRollingPeriods ? 'Last Period' : 'Last Week'}</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">{isRollingPeriods ? 'vs 4P Avg' : 'vs 4W Avg'}</div>
                  <div className="text-[10px] text-gray-500 font-normal">% Change</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">{isRollingPeriods ? '3P Ago' : '3W Ago'}</div>
                  <div className="text-[10px] text-gray-500 font-normal">{isRollingPeriods ? '3 Periods' : '3 Weeks'}</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">{isRollingPeriods ? '4P Ago' : '4W Ago'}</div>
                  <div className="text-[10px] text-gray-500 font-normal">{isRollingPeriods ? '4 Periods' : '4 Weeks'}</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">{isRollingPeriods ? '5P Ago' : '5W Ago'}</div>
                  <div className="text-[10px] text-gray-500 font-normal">{isRollingPeriods ? '5 Periods' : '5 Weeks'}</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[140px]">
                  <div className="text-xs">MTD</div>
                  <div className="text-[10px] text-gray-500 font-normal">Current Month</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[140px]">
                  <div className="text-xs">M-1</div>
                  <div className="text-[10px] text-gray-500 font-normal">Last Month</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[140px]">
                  <div className="text-xs">M-2</div>
                  <div className="text-[10px] text-gray-500 font-normal">2 Months Ago</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transformedData && (
                <>
                  {/* Spend Section */}
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">Spend</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className="font-medium text-gray-900 text-xs">{formatCurrency(transformedData.currentWeek?.totalSpend)}</div>
                      {transformedData.currentWeek && (() => {
                        const changes = getChangeValues(transformedData.currentWeek);
                        return (changes.spendChange || 0) !== 0 && (
                          <div className={`flex items-center justify-center gap-1 text-[10px] mt-1 ${getTrendColor(changes.spendChange || 0)}`}>
                            {getTrendIcon(changes.spendChange || 0)}
                            {(changes.spendChange || 0) > 0 ? '+' : ''}{formatPercentage(changes.spendChange, 1)}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.previousWeek?.totalSpend)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.totalSpend, transformedData.fourWeekAverage?.totalSpend))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.totalSpend, transformedData.fourWeekAverage?.totalSpend)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.threeWeeksAgo?.totalSpend)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.fourWeeksAgo?.totalSpend)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.fiveWeeksAgo?.totalSpend)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.mtd?.totalSpend)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.monthMinus1?.totalSpend)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.monthMinus2?.totalSpend)}</TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-blue-700 font-medium text-xs">Google</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.currentWeek?.googleSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.previousWeek?.googleSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.googleSpend, transformedData.fourWeekAverage?.googleSpend))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.googleSpend, transformedData.fourWeekAverage?.googleSpend)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.threeWeeksAgo?.googleSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.fourWeeksAgo?.googleSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.fiveWeeksAgo?.googleSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.mtd?.googleSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.monthMinus1?.googleSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.monthMinus2?.googleSpend)}</TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-purple-700 font-medium text-xs">Meta</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.currentWeek?.metaSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.previousWeek?.metaSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.metaSpend, transformedData.fourWeekAverage?.metaSpend))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.metaSpend, transformedData.fourWeekAverage?.metaSpend)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.threeWeeksAgo?.metaSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.fourWeeksAgo?.metaSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.fiveWeeksAgo?.metaSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.mtd?.metaSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.monthMinus1?.metaSpend)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.monthMinus2?.metaSpend)}</TableCell>
                  </TableRow>

                  {/* Impressions Section */}
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">Impressions</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.currentWeek?.totalImpressions)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.previousWeek?.totalImpressions)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.totalImpressions, transformedData.fourWeekAverage?.totalImpressions))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.totalImpressions, transformedData.fourWeekAverage?.totalImpressions)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.threeWeeksAgo?.totalImpressions)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.fourWeeksAgo?.totalImpressions)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.fiveWeeksAgo?.totalImpressions)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.mtd?.totalImpressions)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.monthMinus1?.totalImpressions)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.monthMinus2?.totalImpressions)}</TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-purple-700 font-medium text-xs">Meta</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.currentWeek?.metaImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.previousWeek?.metaImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.metaImpressions, transformedData.fourWeekAverage?.metaImpressions))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.metaImpressions, transformedData.fourWeekAverage?.metaImpressions)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.threeWeeksAgo?.metaImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.fourWeeksAgo?.metaImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.fiveWeeksAgo?.metaImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.mtd?.metaImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.monthMinus1?.metaImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.monthMinus2?.metaImpressions)}</TableCell>
                  </TableRow>

                  {/* Clicks Section */}
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">Clicks</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.currentWeek?.totalClicks)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.previousWeek?.totalClicks)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.totalClicks, transformedData.fourWeekAverage?.totalClicks))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.totalClicks, transformedData.fourWeekAverage?.totalClicks)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.threeWeeksAgo?.totalClicks)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.fourWeeksAgo?.totalClicks)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.fiveWeeksAgo?.totalClicks)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.mtd?.totalClicks)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.monthMinus1?.totalClicks)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.monthMinus2?.totalClicks)}</TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-blue-700 font-medium text-xs">Google</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.currentWeek?.googleClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.previousWeek?.googleClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.googleClicks, transformedData.fourWeekAverage?.googleClicks))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.googleClicks, transformedData.fourWeekAverage?.googleClicks)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.threeWeeksAgo?.googleClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.fourWeeksAgo?.googleClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.fiveWeeksAgo?.googleClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.mtd?.googleClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.monthMinus1?.googleClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.monthMinus2?.googleClicks)}</TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-purple-700 font-medium text-xs">Meta</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.currentWeek?.metaClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.previousWeek?.metaClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.metaClicks, transformedData.fourWeekAverage?.metaClicks))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.metaClicks, transformedData.fourWeekAverage?.metaClicks)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.threeWeeksAgo?.metaClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.fourWeeksAgo?.metaClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.fiveWeeksAgo?.metaClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.mtd?.metaClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.monthMinus1?.metaClicks)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatNumber(transformedData.monthMinus2?.metaClicks)}</TableCell>
                  </TableRow>

                  {/* New Customers Section */}
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">New Customers</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className="font-medium text-gray-900 text-xs">{transformedData.currentWeek?.totalNewCustomers || 0}</div>
                      {transformedData.currentWeek && (() => {
                        const changes = getChangeValues(transformedData.currentWeek);
                        return (changes.newCustomersChange || 0) !== 0 && (
                          <div className={`flex items-center justify-center gap-1 text-[10px] mt-1 ${getTrendColor(changes.newCustomersChange || 0)}`}>
                            {getTrendIcon(changes.newCustomersChange || 0)}
                            {(changes.newCustomersChange || 0) > 0 ? '+' : ''}{formatPercentage(changes.newCustomersChange, 1)}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.previousWeek?.totalNewCustomers || 0}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.totalNewCustomers, transformedData.fourWeekAverage?.totalNewCustomers))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.totalNewCustomers, transformedData.fourWeekAverage?.totalNewCustomers)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.threeWeeksAgo?.totalNewCustomers || 0}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.fourWeeksAgo?.totalNewCustomers || 0}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.fiveWeeksAgo?.totalNewCustomers || 0}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.mtd?.totalNewCustomers || 0}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.monthMinus1?.totalNewCustomers || 0}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.monthMinus2?.totalNewCustomers || 0}</TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-blue-700 font-medium text-xs">Google</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{transformedData.currentWeek?.googleNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{transformedData.previousWeek?.googleNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.googleNewCustomers, transformedData.fourWeekAverage?.googleNewCustomers))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.googleNewCustomers, transformedData.fourWeekAverage?.googleNewCustomers)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{transformedData.threeWeeksAgo?.googleNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{transformedData.fourWeeksAgo?.googleNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{transformedData.fiveWeeksAgo?.googleNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{transformedData.mtd?.googleNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{transformedData.monthMinus1?.googleNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{transformedData.monthMinus2?.googleNewCustomers || 0}</TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-purple-700 font-medium text-xs">Meta</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{transformedData.currentWeek?.metaNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{transformedData.previousWeek?.metaNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.metaNewCustomers, transformedData.fourWeekAverage?.metaNewCustomers))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.metaNewCustomers, transformedData.fourWeekAverage?.metaNewCustomers)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{transformedData.threeWeeksAgo?.metaNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{transformedData.fourWeeksAgo?.metaNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{transformedData.fiveWeeksAgo?.metaNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{transformedData.mtd?.metaNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{transformedData.monthMinus1?.metaNewCustomers || 0}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{transformedData.monthMinus2?.metaNewCustomers || 0}</TableCell>
                  </TableRow>

                  {/* CAC Section */}
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">CAC</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.currentWeek?.cac)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.previousWeek?.cac)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.cac, transformedData.fourWeekAverage?.cac), true)}`}>
                        {formatPercentageChange(transformedData.currentWeek?.cac, transformedData.fourWeekAverage?.cac)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.threeWeeksAgo?.cac)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.fourWeeksAgo?.cac)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.fiveWeeksAgo?.cac)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.mtd?.cac)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.monthMinus1?.cac)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.monthMinus2?.cac)}</TableCell>
                  </TableRow>

                  {/* ROAS Section */}
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">ROAS</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.currentWeek?.roas != null && !isNaN(transformedData.currentWeek?.roas) ? transformedData.currentWeek.roas.toFixed(1) : '0.0'}x</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.previousWeek?.roas != null && !isNaN(transformedData.previousWeek?.roas) ? transformedData.previousWeek.roas.toFixed(1) : '0.0'}x</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.roas, transformedData.fourWeekAverage?.roas))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.roas, transformedData.fourWeekAverage?.roas)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.threeWeeksAgo?.roas != null && !isNaN(transformedData.threeWeeksAgo?.roas) ? transformedData.threeWeeksAgo.roas.toFixed(1) : '0.0'}x</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.fourWeeksAgo?.roas != null && !isNaN(transformedData.fourWeeksAgo?.roas) ? transformedData.fourWeeksAgo.roas.toFixed(1) : '0.0'}x</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.fiveWeeksAgo?.roas != null && !isNaN(transformedData.fiveWeeksAgo?.roas) ? transformedData.fiveWeeksAgo.roas.toFixed(1) : '0.0'}x</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.mtd?.roas != null && !isNaN(transformedData.mtd?.roas) ? transformedData.mtd.roas.toFixed(1) : '0.0'}x</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.monthMinus1?.roas != null && !isNaN(transformedData.monthMinus1?.roas) ? transformedData.monthMinus1.roas.toFixed(1) : '0.0'}x</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{transformedData.monthMinus2?.roas != null && !isNaN(transformedData.monthMinus2?.roas) ? transformedData.monthMinus2.roas.toFixed(1) : '0.0'}x</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {!data && !isLoading && (
          <div className="text-center py-12 px-6">
            <div className="text-gray-500 mb-2 font-medium">No performance data available</div>
            <div className="text-sm text-gray-400">
              Performance data will appear here once campaigns are running
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketingPerformanceTable;