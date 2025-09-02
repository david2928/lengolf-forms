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
  googleCpm: number;
  metaCpm: number;
  totalCpm: number;
  googleCpc: number;
  metaCpc: number;
  totalCpc: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  metaLeads: number;
  grossProfit: number;
  lengolfLineFollowers: number;
  fairwayLineFollowers: number;
  cac: number;
  roas: number;
  weekOverWeekSpendChange: number;
  weekOverWeekNewCustomersChange: number;
  // Traffic data
  totalSessions?: number;
  paidSessions?: number;
  paidSocialSessions?: number;
  paidSearchSessions?: number;
  organicSearchSessions?: number;
  directSessions?: number;
  emailSessions?: number;
  referralSessions?: number;
  otherSessions?: number;
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
  googleCpm: number;
  metaCpm: number;
  totalCpm: number;
  googleCpc: number;
  metaCpc: number;
  totalCpc: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  metaLeads: number;
  grossProfit: number;
  lengolfLineFollowers: number;
  fairwayLineFollowers: number;
  cac: number;
  roas: number;
  periodOverPeriodSpendChange: number;
  periodOverPeriodNewCustomersChange: number;
  // Traffic data
  totalSessions?: number;
  paidSessions?: number;
  paidSocialSessions?: number;
  paidSearchSessions?: number;
  organicSearchSessions?: number;
  directSessions?: number;
  emailSessions?: number;
  referralSessions?: number;
  otherSessions?: number;
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
  googleCpm?: number;
  metaCpm?: number;
  totalCpm?: number;
  googleCpc?: number;
  metaCpc?: number;
  totalCpc?: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  metaLeads?: number;
  grossProfit?: number;
  lengolfLineFollowers?: number;
  fairwayLineFollowers?: number;
  cac: number;
  roas: number;
  weekOverWeekSpendChange?: number;
  weekOverWeekNewCustomersChange?: number;
  // Traffic data
  totalSessions?: number;
  paidSessions?: number;
  paidSocialSessions?: number;
  paidSearchSessions?: number;
  organicSearchSessions?: number;
  directSessions?: number;
  emailSessions?: number;
  referralSessions?: number;
  otherSessions?: number;
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
  googleCpm?: number;
  metaCpm?: number;
  totalCpm?: number;
  googleCpc?: number;
  metaCpc?: number;
  totalCpc?: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  metaLeads?: number;
  grossProfit?: number;
  lengolfLineFollowers?: number;
  fairwayLineFollowers?: number;
  cac: number;
  roas: number;
  // Traffic data
  totalSessions?: number;
  paidSessions?: number;
  paidSocialSessions?: number;
  paidSearchSessions?: number;
  organicSearchSessions?: number;
  directSessions?: number;
  emailSessions?: number;
  referralSessions?: number;
  otherSessions?: number;
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
  googleCpm: number;
  metaCpm: number;
  totalCpm: number;
  googleCpc: number;
  metaCpc: number;
  totalCpc: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  metaLeads: number;
  grossProfit: number;
  lengolfLineFollowers: number;
  fairwayLineFollowers: number;
  cac: number;
  roas: number;
  // Traffic data
  totalSessions?: number;
  paidSessions?: number;
  paidSocialSessions?: number;
  paidSearchSessions?: number;
  organicSearchSessions?: number;
  directSessions?: number;
  emailSessions?: number;
  referralSessions?: number;
  otherSessions?: number;
}

interface TrafficAnalytics {
  totalSessions: number;
  totalUsers: number;
  channelPerformance: Array<{
    channel: string;
    sessions: number;
    users: number;
    bookingConversions: number;
    conversionRate: number;
    sessionsChange: number;
    conversionRateChange: number;
  }>;
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
      totalCpm: acc.totalCpm + (week.totalCpm || 0),
      googleCpm: acc.googleCpm + (week.googleCpm || 0),
      metaCpm: acc.metaCpm + (week.metaCpm || 0),
      totalCpc: acc.totalCpc + (week.totalCpc || 0),
      googleCpc: acc.googleCpc + (week.googleCpc || 0),
      metaCpc: acc.metaCpc + (week.metaCpc || 0),
      totalNewCustomers: acc.totalNewCustomers + week.totalNewCustomers,
      googleNewCustomers: acc.googleNewCustomers + week.googleNewCustomers,
      metaNewCustomers: acc.metaNewCustomers + week.metaNewCustomers,
      metaLeads: acc.metaLeads + (week.metaLeads || 0),
      grossProfit: acc.grossProfit + (week.grossProfit || 0),
      lengolfLineFollowers: acc.lengolfLineFollowers + (week.lengolfLineFollowers || 0),
      fairwayLineFollowers: acc.fairwayLineFollowers + (week.fairwayLineFollowers || 0),
      cac: acc.cac + week.cac,
      roas: acc.roas + week.roas,
      // Traffic data
      totalSessions: acc.totalSessions + (week.totalSessions || 0),
      paidSessions: acc.paidSessions + (week.paidSessions || 0),
      paidSocialSessions: acc.paidSocialSessions + (week.paidSocialSessions || 0),
      paidSearchSessions: acc.paidSearchSessions + (week.paidSearchSessions || 0),
      organicSearchSessions: acc.organicSearchSessions + (week.organicSearchSessions || 0),
      directSessions: acc.directSessions + (week.directSessions || 0),
      emailSessions: acc.emailSessions + (week.emailSessions || 0),
      referralSessions: acc.referralSessions + (week.referralSessions || 0),
      otherSessions: acc.otherSessions + (week.otherSessions || 0),
    }), {
      totalSpend: 0, googleSpend: 0, metaSpend: 0,
      totalImpressions: 0, googleImpressions: 0, metaImpressions: 0,
      totalClicks: 0, googleClicks: 0, metaClicks: 0,
      totalCpm: 0, googleCpm: 0, metaCpm: 0,
      totalCpc: 0, googleCpc: 0, metaCpc: 0,
      totalNewCustomers: 0, googleNewCustomers: 0, metaNewCustomers: 0,
      metaLeads: 0, grossProfit: 0, lengolfLineFollowers: 0, fairwayLineFollowers: 0,
      cac: 0, roas: 0,
      // Traffic data initial values
      totalSessions: 0, paidSessions: 0, paidSocialSessions: 0, paidSearchSessions: 0,
      organicSearchSessions: 0, directSessions: 0, emailSessions: 0, referralSessions: 0, otherSessions: 0
    });
    
    // Average the 4-week totals (except LINE followers which should use latest values)
    const avgDivisor = recentFourWeeks.length;
    Object.keys(fourWeekAverage).forEach(key => {
      // LINE followers should not be averaged - they represent point-in-time metrics
      if (key !== 'lengolfLineFollowers' && key !== 'fairwayLineFollowers') {
        fourWeekAverage[key as keyof typeof fourWeekAverage] = fourWeekAverage[key as keyof typeof fourWeekAverage] / avgDivisor;
      }
    });

    // For LINE followers, use the most recent available value instead of average
    fourWeekAverage.lengolfLineFollowers = recentFourWeeks[0]?.lengolfLineFollowers || 0;
    fourWeekAverage.fairwayLineFollowers = recentFourWeeks[0]?.fairwayLineFollowers || 0;
    
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

  const formatFullNumber = (value: number | undefined | null) => {
    if (value == null || isNaN(value)) {
      return '0';
    }
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  };

  const formatCPC = (value: number | undefined | null) => {
    if (value == null || isNaN(value)) {
      return '฿0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value).replace('THB', '฿');
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

  // Helper functions to calculate platform-specific CAC
  const calculateGoogleCAC = (data: any) => {
    if (!data?.googleSpend || !data?.googleNewCustomers || data.googleNewCustomers === 0) {
      return 0;
    }
    return data.googleSpend / data.googleNewCustomers;
  };

  const calculateMetaCAC = (data: any) => {
    if (!data?.metaSpend || !data?.metaNewCustomers || data.metaNewCustomers === 0) {
      return 0;
    }
    return data.metaSpend / data.metaNewCustomers;
  };

  // Helper function to get month names for column headers
  const getMonthNames = () => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const lastMonthName = lastMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2);
    const twoMonthsAgoName = twoMonthsAgo.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return {
      current: currentMonth,
      lastMonth: lastMonthName, 
      twoMonthsAgo: twoMonthsAgoName
    };
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
    // Convert to numbers to handle potential string values
    const currentNum = Number(current);
    const averageNum = Number(average);
    
    // Check for null/undefined or invalid numbers
    if (current == null || average == null || isNaN(currentNum) || isNaN(averageNum) || averageNum === 0) {
      return 0;
    }
    
    return ((currentNum - averageNum) / averageNum) * 100;
  };

  const formatPercentageChange = (current: number | undefined, average: number | undefined) => {
    const change = calculatePercentageChange(current, average);
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  // Get month names for headers
  const monthNames = getMonthNames();

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
                  <div className="text-[10px] text-gray-500 font-normal">
                    {transformedData?.currentWeek && 'weekStart' in transformedData.currentWeek 
                      ? `${new Date(transformedData.currentWeek.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(transformedData.currentWeek.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : transformedData?.currentWeek && 'periodStart' in transformedData.currentWeek
                        ? `${new Date(transformedData.currentWeek.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(transformedData.currentWeek.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : isRollingPeriods ? 'This Period' : 'This Week'
                    }
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[130px]">
                  <div className="text-xs">Previous</div>
                  <div className="text-[10px] text-gray-500 font-normal">
                    {transformedData?.previousWeek && 'weekStart' in transformedData.previousWeek 
                      ? `${new Date(transformedData.previousWeek.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(transformedData.previousWeek.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : transformedData?.previousWeek && 'periodStart' in transformedData.previousWeek
                        ? `${new Date(transformedData.previousWeek.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(transformedData.previousWeek.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : isRollingPeriods ? 'Last Period' : 'Last Week'
                    }
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">{isRollingPeriods ? 'vs 4P Avg' : 'vs 4W Avg'}</div>
                  <div className="text-[10px] text-gray-500 font-normal">% Change</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">{isRollingPeriods ? '3P Ago' : '3W Ago'}</div>
                  <div className="text-[10px] text-gray-500 font-normal">
                    {transformedData?.threeWeeksAgo && 'weekStart' in transformedData.threeWeeksAgo 
                      ? `${new Date(transformedData.threeWeeksAgo.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(transformedData.threeWeeksAgo.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : transformedData?.threeWeeksAgo && 'periodStart' in transformedData.threeWeeksAgo
                        ? `${new Date(transformedData.threeWeeksAgo.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(transformedData.threeWeeksAgo.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : isRollingPeriods ? '3 Periods' : '3 Weeks'
                    }
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">{isRollingPeriods ? '4P Ago' : '4W Ago'}</div>
                  <div className="text-[10px] text-gray-500 font-normal">
                    {transformedData?.fourWeeksAgo && 'weekStart' in transformedData.fourWeeksAgo 
                      ? `${new Date(transformedData.fourWeeksAgo.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(transformedData.fourWeeksAgo.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : transformedData?.fourWeeksAgo && 'periodStart' in transformedData.fourWeeksAgo
                        ? `${new Date(transformedData.fourWeeksAgo.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(transformedData.fourWeeksAgo.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : isRollingPeriods ? '4 Periods' : '4 Weeks'
                    }
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">{isRollingPeriods ? '5P Ago' : '5W Ago'}</div>
                  <div className="text-[10px] text-gray-500 font-normal">
                    {transformedData?.fiveWeeksAgo && 'weekStart' in transformedData.fiveWeeksAgo 
                      ? `${new Date(transformedData.fiveWeeksAgo.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(transformedData.fiveWeeksAgo.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : transformedData?.fiveWeeksAgo && 'periodStart' in transformedData.fiveWeeksAgo
                        ? `${new Date(transformedData.fiveWeeksAgo.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(transformedData.fiveWeeksAgo.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : isRollingPeriods ? '5 Periods' : '5 Weeks'
                    }
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[140px]">
                  <div className="text-xs">{monthNames.current}</div>
                  <div className="text-[10px] text-gray-500 font-normal">MTD</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[140px]">
                  <div className="text-xs">{monthNames.lastMonth}</div>
                  <div className="text-[10px] text-gray-500 font-normal">Full Month</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[140px]">
                  <div className="text-xs">{monthNames.twoMonthsAgo}</div>
                  <div className="text-[10px] text-gray-500 font-normal">Full Month</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">M-1 vs M-2</div>
                  <div className="text-[10px] text-gray-500 font-normal">% Change</div>
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
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.totalSpend, transformedData.monthMinus2?.totalSpend), true)}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.totalSpend, transformedData.monthMinus2?.totalSpend)}
                      </div>
                    </TableCell>
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
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.googleSpend, transformedData.monthMinus2?.googleSpend), true)}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.googleSpend, transformedData.monthMinus2?.googleSpend)}
                      </div>
                    </TableCell>
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
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.metaSpend, transformedData.monthMinus2?.metaSpend), true)}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.metaSpend, transformedData.monthMinus2?.metaSpend)}
                      </div>
                    </TableCell>
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
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.totalImpressions, transformedData.monthMinus2?.totalImpressions))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.totalImpressions, transformedData.monthMinus2?.totalImpressions)}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-blue-700 font-medium text-xs">Google</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.currentWeek?.googleImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.previousWeek?.googleImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.googleImpressions, transformedData.fourWeekAverage?.googleImpressions))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.googleImpressions, transformedData.fourWeekAverage?.googleImpressions)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.threeWeeksAgo?.googleImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.fourWeeksAgo?.googleImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.fiveWeeksAgo?.googleImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.mtd?.googleImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.monthMinus1?.googleImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatNumber(transformedData.monthMinus2?.googleImpressions)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.googleImpressions, transformedData.monthMinus2?.googleImpressions))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.googleImpressions, transformedData.monthMinus2?.googleImpressions)}
                      </div>
                    </TableCell>
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
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.metaImpressions, transformedData.monthMinus2?.metaImpressions))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.metaImpressions, transformedData.monthMinus2?.metaImpressions)}
                      </div>
                    </TableCell>
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
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.totalClicks, transformedData.monthMinus2?.totalClicks))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.totalClicks, transformedData.monthMinus2?.totalClicks)}
                      </div>
                    </TableCell>
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
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.googleClicks, transformedData.monthMinus2?.googleClicks))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.googleClicks, transformedData.monthMinus2?.googleClicks)}
                      </div>
                    </TableCell>
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
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.metaClicks, transformedData.monthMinus2?.metaClicks))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.metaClicks, transformedData.monthMinus2?.metaClicks)}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* CPM Section */}
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">CPM</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.currentWeek?.totalCpm)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.previousWeek?.totalCpm)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.totalCpm, transformedData.fourWeekAverage?.totalCpm), true)}`}>
                        {formatPercentageChange(transformedData.currentWeek?.totalCpm, transformedData.fourWeekAverage?.totalCpm)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.threeWeeksAgo?.totalCpm)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.fourWeeksAgo?.totalCpm)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.fiveWeeksAgo?.totalCpm)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.mtd?.totalCpm)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.monthMinus1?.totalCpm)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.monthMinus2?.totalCpm)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.totalCpm, transformedData.monthMinus2?.totalCpm), true)}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.totalCpm, transformedData.monthMinus2?.totalCpm)}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* CPM Platform Breakdown */}
                  <TableRow className="border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-blue-700 font-medium text-xs">Google</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.currentWeek?.googleCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.previousWeek?.googleCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.googleCpm, transformedData.fourWeekAverage?.googleCpm), true)}`}>
                        {formatPercentageChange(transformedData.currentWeek?.googleCpm, transformedData.fourWeekAverage?.googleCpm)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.threeWeeksAgo?.googleCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.fourWeeksAgo?.googleCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.fiveWeeksAgo?.googleCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.mtd?.googleCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.monthMinus1?.googleCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(transformedData.monthMinus2?.googleCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.googleCpm, transformedData.monthMinus2?.googleCpm), true)}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.googleCpm, transformedData.monthMinus2?.googleCpm)}
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-purple-700 font-medium text-xs">Meta</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.currentWeek?.metaCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.previousWeek?.metaCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.metaCpm, transformedData.fourWeekAverage?.metaCpm), true)}`}>
                        {formatPercentageChange(transformedData.currentWeek?.metaCpm, transformedData.fourWeekAverage?.metaCpm)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.threeWeeksAgo?.metaCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.fourWeeksAgo?.metaCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.fiveWeeksAgo?.metaCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.mtd?.metaCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.monthMinus1?.metaCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(transformedData.monthMinus2?.metaCpm)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.metaCpm, transformedData.monthMinus2?.metaCpm), true)}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.metaCpm, transformedData.monthMinus2?.metaCpm)}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* CPC Section */}
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">CPC</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCPC(transformedData.currentWeek?.totalCpc)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCPC(transformedData.previousWeek?.totalCpc)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.totalCpc, transformedData.fourWeekAverage?.totalCpc), true)}`}>
                        {formatPercentageChange(transformedData.currentWeek?.totalCpc, transformedData.fourWeekAverage?.totalCpc)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCPC(transformedData.threeWeeksAgo?.totalCpc)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCPC(transformedData.fourWeeksAgo?.totalCpc)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCPC(transformedData.fiveWeeksAgo?.totalCpc)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCPC(transformedData.mtd?.totalCpc)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCPC(transformedData.monthMinus1?.totalCpc)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCPC(transformedData.monthMinus2?.totalCpc)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.totalCpc, transformedData.monthMinus2?.totalCpc), true)}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.totalCpc, transformedData.monthMinus2?.totalCpc)}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* CPC Platform Breakdown */}
                  <TableRow className="border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-blue-700 font-medium text-xs">Google</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCPC(transformedData.currentWeek?.googleCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCPC(transformedData.previousWeek?.googleCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.googleCpc, transformedData.fourWeekAverage?.googleCpc), true)}`}>
                        {formatPercentageChange(transformedData.currentWeek?.googleCpc, transformedData.fourWeekAverage?.googleCpc)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCPC(transformedData.threeWeeksAgo?.googleCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCPC(transformedData.fourWeeksAgo?.googleCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCPC(transformedData.fiveWeeksAgo?.googleCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCPC(transformedData.mtd?.googleCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCPC(transformedData.monthMinus1?.googleCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCPC(transformedData.monthMinus2?.googleCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.googleCpc, transformedData.monthMinus2?.googleCpc), true)}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.googleCpc, transformedData.monthMinus2?.googleCpc)}
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-purple-700 font-medium text-xs">Meta</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCPC(transformedData.currentWeek?.metaCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCPC(transformedData.previousWeek?.metaCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.metaCpc, transformedData.fourWeekAverage?.metaCpc), true)}`}>
                        {formatPercentageChange(transformedData.currentWeek?.metaCpc, transformedData.fourWeekAverage?.metaCpc)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCPC(transformedData.threeWeeksAgo?.metaCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCPC(transformedData.fourWeeksAgo?.metaCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCPC(transformedData.fiveWeeksAgo?.metaCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCPC(transformedData.mtd?.metaCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCPC(transformedData.monthMinus1?.metaCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCPC(transformedData.monthMinus2?.metaCpc)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.metaCpc, transformedData.monthMinus2?.metaCpc), true)}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.metaCpc, transformedData.monthMinus2?.metaCpc)}
                      </div>
                    </TableCell>
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
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.totalNewCustomers, transformedData.monthMinus2?.totalNewCustomers))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.totalNewCustomers, transformedData.monthMinus2?.totalNewCustomers)}
                      </div>
                    </TableCell>
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
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.googleNewCustomers, transformedData.monthMinus2?.googleNewCustomers))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.googleNewCustomers, transformedData.monthMinus2?.googleNewCustomers)}
                      </div>
                    </TableCell>
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
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.metaNewCustomers, transformedData.monthMinus2?.metaNewCustomers))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.metaNewCustomers, transformedData.monthMinus2?.metaNewCustomers)}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Meta Leads Section */}
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">Meta Leads</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.currentWeek?.metaLeads)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.previousWeek?.metaLeads)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.metaLeads, transformedData.fourWeekAverage?.metaLeads))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.metaLeads, transformedData.fourWeekAverage?.metaLeads)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.threeWeeksAgo?.metaLeads)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.fourWeeksAgo?.metaLeads)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.fiveWeeksAgo?.metaLeads)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.mtd?.metaLeads)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.monthMinus1?.metaLeads)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(transformedData.monthMinus2?.metaLeads)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.metaLeads, transformedData.monthMinus2?.metaLeads))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.metaLeads, transformedData.monthMinus2?.metaLeads)}
                      </div>
                    </TableCell>
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
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.cac, transformedData.monthMinus2?.cac), true)}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.cac, transformedData.monthMinus2?.cac)}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* CAC Platform Breakdown */}
                  <TableRow className="border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-blue-700 font-medium text-xs">Google</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(calculateGoogleCAC(transformedData.currentWeek))}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(calculateGoogleCAC(transformedData.previousWeek))}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(calculateGoogleCAC(transformedData.currentWeek), calculateGoogleCAC(transformedData.fourWeekAverage)), true)}`}>
                        {formatPercentageChange(calculateGoogleCAC(transformedData.currentWeek), calculateGoogleCAC(transformedData.fourWeekAverage))}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(calculateGoogleCAC(transformedData.threeWeeksAgo))}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(calculateGoogleCAC(transformedData.fourWeeksAgo))}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(calculateGoogleCAC(transformedData.fiveWeeksAgo))}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(calculateGoogleCAC(transformedData.mtd))}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(calculateGoogleCAC(transformedData.monthMinus1))}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatCurrency(calculateGoogleCAC(transformedData.monthMinus2))}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(calculateGoogleCAC(transformedData.monthMinus1), calculateGoogleCAC(transformedData.monthMinus2)), true)}`}>
                        {formatPercentageChange(calculateGoogleCAC(transformedData.monthMinus1), calculateGoogleCAC(transformedData.monthMinus2))}
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-purple-700 font-medium text-xs">Meta</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(calculateMetaCAC(transformedData.currentWeek))}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(calculateMetaCAC(transformedData.previousWeek))}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(calculateMetaCAC(transformedData.currentWeek), calculateMetaCAC(transformedData.fourWeekAverage)), true)}`}>
                        {formatPercentageChange(calculateMetaCAC(transformedData.currentWeek), calculateMetaCAC(transformedData.fourWeekAverage))}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(calculateMetaCAC(transformedData.threeWeeksAgo))}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(calculateMetaCAC(transformedData.fourWeeksAgo))}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(calculateMetaCAC(transformedData.fiveWeeksAgo))}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(calculateMetaCAC(transformedData.mtd))}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(calculateMetaCAC(transformedData.monthMinus1))}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatCurrency(calculateMetaCAC(transformedData.monthMinus2))}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(calculateMetaCAC(transformedData.monthMinus1), calculateMetaCAC(transformedData.monthMinus2)), true)}`}>
                        {formatPercentageChange(calculateMetaCAC(transformedData.monthMinus1), calculateMetaCAC(transformedData.monthMinus2))}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Gross Profit Section */}
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">Gross Profit</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.currentWeek?.grossProfit)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.previousWeek?.grossProfit)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.grossProfit, transformedData.fourWeekAverage?.grossProfit))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.grossProfit, transformedData.fourWeekAverage?.grossProfit)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.threeWeeksAgo?.grossProfit)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.fourWeeksAgo?.grossProfit)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.fiveWeeksAgo?.grossProfit)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.mtd?.grossProfit)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.monthMinus1?.grossProfit)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(transformedData.monthMinus2?.grossProfit)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.grossProfit, transformedData.monthMinus2?.grossProfit))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.grossProfit, transformedData.monthMinus2?.grossProfit)}
                      </div>
                    </TableCell>
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
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.roas, transformedData.monthMinus2?.roas))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.roas, transformedData.monthMinus2?.roas)}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* LINE Followers Section */}
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">LINE Followers</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">-</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">-</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">-</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">-</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">-</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">-</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">-</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">-</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">-</TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-green-700 font-medium text-xs">LENGOLF</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.currentWeek?.lengolfLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.previousWeek?.lengolfLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.lengolfLineFollowers, transformedData.previousWeek?.lengolfLineFollowers))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.lengolfLineFollowers, transformedData.previousWeek?.lengolfLineFollowers)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.threeWeeksAgo?.lengolfLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.fourWeeksAgo?.lengolfLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.fiveWeeksAgo?.lengolfLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.mtd?.lengolfLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus1?.lengolfLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus2?.lengolfLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.lengolfLineFollowers, transformedData.monthMinus2?.lengolfLineFollowers))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.lengolfLineFollowers, transformedData.monthMinus2?.lengolfLineFollowers)}
                      </div>
                    </TableCell>
                  </TableRow>

                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-orange-700 font-medium text-xs">FAIRWAY</TableCell>
                    <TableCell className="py-2 px-2 text-center text-orange-700 font-medium text-xs">{formatFullNumber(transformedData.currentWeek?.fairwayLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-orange-700 font-medium text-xs">{formatFullNumber(transformedData.previousWeek?.fairwayLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.fairwayLineFollowers, transformedData.previousWeek?.fairwayLineFollowers))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.fairwayLineFollowers, transformedData.previousWeek?.fairwayLineFollowers)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-orange-700 font-medium text-xs">{formatFullNumber(transformedData.threeWeeksAgo?.fairwayLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-orange-700 font-medium text-xs">{formatFullNumber(transformedData.fourWeeksAgo?.fairwayLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-orange-700 font-medium text-xs">{formatFullNumber(transformedData.fiveWeeksAgo?.fairwayLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-orange-700 font-medium text-xs">{formatFullNumber(transformedData.mtd?.fairwayLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-orange-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus1?.fairwayLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-orange-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus2?.fairwayLineFollowers)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.fairwayLineFollowers, transformedData.monthMinus2?.fairwayLineFollowers))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.fairwayLineFollowers, transformedData.monthMinus2?.fairwayLineFollowers)}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Website Traffic Section */}
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">Website Traffic (Sessions)</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatFullNumber(transformedData.currentWeek?.totalSessions || 0)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatFullNumber(transformedData.previousWeek?.totalSessions || 0)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.totalSessions, transformedData.previousWeek?.totalSessions))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.totalSessions, transformedData.previousWeek?.totalSessions)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatFullNumber(transformedData.threeWeeksAgo?.totalSessions || 0)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatFullNumber(transformedData.fourWeeksAgo?.totalSessions || 0)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatFullNumber(transformedData.fiveWeeksAgo?.totalSessions || 0)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatFullNumber(transformedData.mtd?.totalSessions || 0)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatFullNumber(transformedData.monthMinus1?.totalSessions || 0)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatFullNumber(transformedData.monthMinus2?.totalSessions || 0)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.totalSessions, transformedData.monthMinus2?.totalSessions))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.totalSessions, transformedData.monthMinus2?.totalSessions)}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-green-700 font-medium text-xs">Paid</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.currentWeek?.paidSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.previousWeek?.paidSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.paidSessions, transformedData.previousWeek?.paidSessions))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.paidSessions, transformedData.previousWeek?.paidSessions)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.threeWeeksAgo?.paidSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.fourWeeksAgo?.paidSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.fiveWeeksAgo?.paidSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.mtd?.paidSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus1?.paidSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-green-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus2?.paidSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.paidSessions, transformedData.monthMinus2?.paidSessions))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.paidSessions, transformedData.monthMinus2?.paidSessions)}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-purple-700 font-medium text-xs">Paid Social</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatFullNumber(transformedData.currentWeek?.paidSocialSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatFullNumber(transformedData.previousWeek?.paidSocialSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.paidSocialSessions, transformedData.previousWeek?.paidSocialSessions))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.paidSocialSessions, transformedData.previousWeek?.paidSocialSessions)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatFullNumber(transformedData.threeWeeksAgo?.paidSocialSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatFullNumber(transformedData.fourWeeksAgo?.paidSocialSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatFullNumber(transformedData.fiveWeeksAgo?.paidSocialSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatFullNumber(transformedData.mtd?.paidSocialSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus1?.paidSocialSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-purple-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus2?.paidSocialSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.paidSocialSessions, transformedData.monthMinus2?.paidSocialSessions))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.paidSocialSessions, transformedData.monthMinus2?.paidSocialSessions)}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-blue-700 font-medium text-xs">Paid Search</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatFullNumber(transformedData.currentWeek?.paidSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatFullNumber(transformedData.previousWeek?.paidSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.paidSearchSessions, transformedData.previousWeek?.paidSearchSessions))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.paidSearchSessions, transformedData.previousWeek?.paidSearchSessions)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatFullNumber(transformedData.threeWeeksAgo?.paidSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatFullNumber(transformedData.fourWeeksAgo?.paidSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatFullNumber(transformedData.fiveWeeksAgo?.paidSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatFullNumber(transformedData.mtd?.paidSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus1?.paidSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-blue-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus2?.paidSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.paidSearchSessions, transformedData.monthMinus2?.paidSearchSessions))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.paidSearchSessions, transformedData.monthMinus2?.paidSearchSessions)}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-emerald-700 font-medium text-xs">Organic</TableCell>
                    <TableCell className="py-2 px-2 text-center text-emerald-700 font-medium text-xs">{formatFullNumber(transformedData.currentWeek?.organicSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-emerald-700 font-medium text-xs">{formatFullNumber(transformedData.previousWeek?.organicSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.organicSearchSessions, transformedData.previousWeek?.organicSearchSessions))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.organicSearchSessions, transformedData.previousWeek?.organicSearchSessions)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-emerald-700 font-medium text-xs">{formatFullNumber(transformedData.threeWeeksAgo?.organicSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-emerald-700 font-medium text-xs">{formatFullNumber(transformedData.fourWeeksAgo?.organicSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-emerald-700 font-medium text-xs">{formatFullNumber(transformedData.fiveWeeksAgo?.organicSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-emerald-700 font-medium text-xs">{formatFullNumber(transformedData.mtd?.organicSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-emerald-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus1?.organicSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-emerald-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus2?.organicSearchSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.organicSearchSessions, transformedData.monthMinus2?.organicSearchSessions))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.organicSearchSessions, transformedData.monthMinus2?.organicSearchSessions)}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-2 px-4 pl-8 text-amber-700 font-medium text-xs">Direct</TableCell>
                    <TableCell className="py-2 px-2 text-center text-amber-700 font-medium text-xs">{formatFullNumber(transformedData.currentWeek?.directSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-amber-700 font-medium text-xs">{formatFullNumber(transformedData.previousWeek?.directSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.currentWeek?.directSessions, transformedData.previousWeek?.directSessions))}`}>
                        {formatPercentageChange(transformedData.currentWeek?.directSessions, transformedData.previousWeek?.directSessions)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center text-amber-700 font-medium text-xs">{formatFullNumber(transformedData.threeWeeksAgo?.directSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-amber-700 font-medium text-xs">{formatFullNumber(transformedData.fourWeeksAgo?.directSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-amber-700 font-medium text-xs">{formatFullNumber(transformedData.fiveWeeksAgo?.directSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-amber-700 font-medium text-xs">{formatFullNumber(transformedData.mtd?.directSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-amber-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus1?.directSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center text-amber-700 font-medium text-xs">{formatFullNumber(transformedData.monthMinus2?.directSessions || 0)}</TableCell>
                    <TableCell className="py-2 px-2 text-center">
                      <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(transformedData.monthMinus1?.directSessions, transformedData.monthMinus2?.directSessions))}`}>
                        {formatPercentageChange(transformedData.monthMinus1?.directSessions, transformedData.monthMinus2?.directSessions)}
                      </div>
                    </TableCell>
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