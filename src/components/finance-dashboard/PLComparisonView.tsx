import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Calculator,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { PLData } from '@/hooks/useFinanceDashboard';
import { cn } from '@/lib/utils';

interface PLComparisonViewProps {
  data: Record<string, PLData>;
  loading: boolean;
  selectedMonths: string[];
  onMonthsChange: (months: string[]) => void;
  currentMonth: string;
  showRunRate: boolean;
}

interface PLRowProps {
  label: string;
  level: number;
  isTotal?: boolean;
  isSection?: boolean;
  isExpandable?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  monthData: Record<string, PLData>;
  selectedMonths: string[];
  currentMonth: string;
  showRunRate: boolean;
  dataPath?: string;
  runRatePath?: string;
  historicalPath?: string;
  formatter?: (value: number) => string;
  customValues?: Record<string, number>;
  showVariance?: boolean;
  children?: React.ReactNode;
}

function PLRow({
  label,
  level,
  isTotal = false,
  isSection = false,
  isExpandable = false,
  isExpanded = false,
  onToggle,
  monthData,
  selectedMonths,
  currentMonth,
  showRunRate,
  dataPath,
  runRatePath,
  historicalPath,
  formatter = (value: number) => formatCurrency(value),
  customValues,
  showVariance = true,
  children
}: PLRowProps) {
  const getValue = (data: PLData, path: string, historicalPath?: string): number => {
    if (!path) return 0;
    
    // First try to get the regular value
    const keys = path.split('.');
    let value: any = data;
    for (const key of keys) {
      value = value?.[key];
    }
    
    // If the value is 0 or null and we have a historical path, try historical
    if ((typeof value !== 'number' || value === 0) && historicalPath) {
      const historicalKeys = historicalPath.split('.');
      let historicalValue: any = data;
      for (const key of historicalKeys) {
        historicalValue = historicalValue?.[key];
      }
      
      if (typeof historicalValue === 'number') {
        return historicalValue;
      }
    }
    
    return typeof value === 'number' ? value : 0;
  };

  const getVariance = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const getVarianceColor = (variance: number): string => {
    if (variance > 5) return 'text-green-600';
    if (variance < -5) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <>
      {/* Mobile: Simple metric card with section color indicators */}
      <div className="block sm:hidden mb-4">
        <Card className={cn(
          "shadow-sm border-l-4",
          // Revenue section - Blue
          (label.includes('Net Sales') || label.includes('Revenue')) && "border-l-blue-500",
          // COGS section - Red  
          label.includes('COGS') && "border-l-red-500",
          // Gross Profit section - Green
          label.includes('Gross Profit') && "border-l-green-500",
          // Operating Expenses section - Orange
          (label.includes('Operating Expenses') || (level === 1 && !label.includes('Marketing'))) && "border-l-orange-500",
          // Marketing Expenses section - Purple
          label.includes('Marketing') && "border-l-purple-500",
          // EBITDA - Dark green
          label.includes('EBITDA') && "border-l-emerald-600",
          // Default for other items
          !label.includes('Net Sales') && !label.includes('Revenue') && !label.includes('COGS') && 
          !label.includes('Gross Profit') && !label.includes('Operating Expenses') && 
          !label.includes('Marketing') && !label.includes('EBITDA') && "border-l-gray-300"
        )}>
          <CardContent className="p-4">
            {/* Metric name with color indicator */}
            <div className="flex items-center gap-2 mb-3">
              {/* Color dot indicator */}
              <div className={cn(
                "w-3 h-3 rounded-full flex-shrink-0",
                // Revenue section - Blue
                (label.includes('Net Sales') || label.includes('Revenue')) && "bg-blue-500",
                // COGS section - Red
                label.includes('COGS') && "bg-red-500",
                // Gross Profit section - Green
                label.includes('Gross Profit') && "bg-green-500",
                // Operating Expenses section - Orange
                (label.includes('Operating Expenses') || (level === 1 && !label.includes('Marketing'))) && "bg-orange-500",
                // Marketing Expenses section - Purple
                label.includes('Marketing') && "bg-purple-500",
                // EBITDA - Dark green
                label.includes('EBITDA') && "bg-emerald-600",
                // Default
                !label.includes('Net Sales') && !label.includes('Revenue') && !label.includes('COGS') && 
                !label.includes('Gross Profit') && !label.includes('Operating Expenses') && 
                !label.includes('Marketing') && !label.includes('EBITDA') && "bg-gray-400"
              )}></div>
              
              <div className={cn(
                "font-semibold text-base flex-1",
                // Revenue section - Blue text
                (label.includes('Net Sales') || label.includes('Revenue')) && "text-blue-800",
                // COGS section - Red text
                label.includes('COGS') && "text-red-800",
                // Gross Profit section - Green text
                label.includes('Gross Profit') && "text-green-800",
                // Operating Expenses section - Orange text
                (label.includes('Operating Expenses') || (level === 1 && !label.includes('Marketing'))) && "text-orange-800",
                // Marketing Expenses section - Purple text
                label.includes('Marketing') && "text-purple-800",
                // EBITDA - Dark green text
                label.includes('EBITDA') && "text-emerald-800",
                // Default
                !label.includes('Net Sales') && !label.includes('Revenue') && !label.includes('COGS') && 
                !label.includes('Gross Profit') && !label.includes('Operating Expenses') && 
                !label.includes('Marketing') && !label.includes('EBITDA') && "text-gray-800",
                isTotal && "font-bold"
              )}>
                {label}
              </div>
              
              {isExpandable && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={onToggle}
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
              )}
            </div>
            
            {/* Month values as rows */}
            <div className="space-y-2">
              {selectedMonths.map((month, monthIndex) => {
                const data = monthData[month];
                const isCurrentMonth = month === currentMonth;
                const date = new Date(month + '-01');
                const monthLabel = date.toLocaleDateString('en-US', { 
                  month: 'short',
                  year: '2-digit'
                });
                
                if (!data) {
                  return (
                    <div key={month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="text-sm font-medium text-gray-400">{monthLabel}</div>
                      <div className="text-sm text-gray-400">--</div>
                    </div>
                  );
                }

                // Use custom values if provided, otherwise get from data path
                const actualValue = customValues?.[month] ?? (dataPath ? getValue(data, dataPath, historicalPath) : 0);
                const runRateValue = runRatePath ? getValue(data, runRatePath) : undefined;
                
                // Determine display value
                const displayValue = isCurrentMonth && showRunRate && runRateValue !== undefined 
                  ? runRateValue 
                  : actualValue;

                // Calculate variance from previous month
                const previousMonth = selectedMonths[monthIndex - 1];
                const previousData = previousMonth ? monthData[previousMonth] : null;
                let previousValue = previousData ? (customValues?.[previousMonth] ?? (dataPath ? getValue(previousData, dataPath, historicalPath) : 0)) : 0;
                
                const variance = previousValue !== 0 ? getVariance(displayValue, previousValue) : 0;

                return (
                  <div key={month} className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    isCurrentMonth ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200",
                    isTotal && "bg-green-50 border-green-200"
                  )}>
                    {/* Month */}
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-700">{monthLabel}</div>
                      {isCurrentMonth && showRunRate && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">Run-rate</Badge>
                      )}
                    </div>
                    
                    {/* Value and change */}
                    <div className="text-right">
                      <div className={cn(
                        "font-semibold text-sm",
                        isTotal && "text-base font-bold"
                      )}>
                        {displayValue >= 1000000 ? 
                          `${(displayValue / 1000000).toFixed(1)}M` : 
                          displayValue >= 1000 ? 
                            `${(displayValue / 1000).toFixed(0)}K` : 
                            formatter(displayValue)
                        }
                      </div>
                      
                      {/* Variance */}
                      {showVariance && monthIndex > 0 && previousValue !== 0 && Math.abs(variance) > 1 && (
                        <div className={cn(
                          "text-xs font-medium",
                          getVarianceColor(variance)
                        )}>
                          {variance > 0 ? '+' : ''}{variance.toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Children for mobile (expanded content) */}
        {isExpandable && isExpanded && (
          <div className="ml-1 mb-4">
            {children}
          </div>
        )}
      </div>

      {/* Desktop Table Layout (preserved exactly) */}
      <div className="hidden sm:block">
        <div className={cn(
          "grid gap-2 py-2 px-4 border-b border-gray-100",
          isSection && "bg-gray-50 font-semibold",
          isTotal && "bg-gray-100 font-semibold",
          level > 0 && "pl-8",
          isExpandable && "hover:bg-gray-25 cursor-pointer"
        )} 
        style={{ gridTemplateColumns: `300px repeat(${selectedMonths.length}, 1fr)` }}
        onClick={isExpandable ? onToggle : undefined}>
          {/* Label Column */}
          <div className={cn(
            "flex items-center",
            isSection && "font-semibold text-gray-900",
            isTotal && "font-semibold",
            level > 0 && "text-gray-700 text-sm"
          )}>
            {isExpandable && (
              <span className="mr-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
            )}
            {label}
          </div>

          {/* Value Columns */}
          {selectedMonths.map((month, index) => {
            const data = monthData[month];
            const isCurrentMonth = month === currentMonth;
            
            if (!data) {
              return (
                <div key={month} className="text-center text-gray-400">
                  --
                </div>
              );
            }

            // Use custom values if provided, otherwise get from data path
            const actualValue = customValues?.[month] ?? (dataPath ? getValue(data, dataPath, historicalPath) : 0);
            const runRateValue = runRatePath ? getValue(data, runRatePath) : undefined;
            
            // Determine display value
            const displayValue = isCurrentMonth && showRunRate && runRateValue !== undefined 
              ? runRateValue 
              : actualValue;

            // Calculate variance from previous month
            const previousMonth = selectedMonths[index - 1];
            const previousData = previousMonth ? monthData[previousMonth] : null;
            let previousValue = previousData ? (customValues?.[previousMonth] ?? (dataPath ? getValue(previousData, dataPath, historicalPath) : 0)) : 0;
            
            // For MoM calculations, always use run-rate values for current month
            const currentValueForVariance = isCurrentMonth && runRateValue !== undefined ? runRateValue : actualValue;
            const isPreviousCurrentMonth = previousMonth === currentMonth;
            if (isPreviousCurrentMonth && previousData && runRatePath) {
              const previousRunRateValue = getValue(previousData, runRatePath);
              if (previousRunRateValue !== undefined) {
                previousValue = previousRunRateValue;
              }
            }
            
            const variance = previousValue !== 0 ? getVariance(currentValueForVariance, previousValue) : 0;

            return (
              <div key={month} className="text-right">
                <div className={cn(
                  "font-medium",
                  isTotal && "text-lg",
                  isSection && "text-lg"
                )}>
                  {formatter(displayValue)}
                </div>
                
                {/* Variance indicator */}
                {showVariance && index > 0 && previousValue !== 0 && Math.abs(variance) > 1 && (
                  <div className={cn("flex items-center justify-end text-xs mt-1", getVarianceColor(variance))}>
                    {variance > 5 ? <TrendingUp className="h-3 w-3" /> : 
                     variance < -5 ? <TrendingDown className="h-3 w-3" /> : null}
                    <span className="ml-1">{Math.abs(variance).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {isExpandable && isExpanded && children}
      </div>
    </>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function PLComparisonView({ 
  data, 
  loading, 
  selectedMonths, 
  onMonthsChange,
  currentMonth,
  showRunRate 
}: PLComparisonViewProps) {
  const [periodMonths, setPeriodMonths] = useState(6);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['operating', 'marketing']));

  // Generate month options from April 2024 to current month
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const startDate = new Date(2024, 3, 1); // April 2024 (month is 0-based)
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const date = new Date(startDate);
    while (date <= currentDate) {
      const monthStr = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      options.push({ value: monthStr, label });
      date.setMonth(date.getMonth() + 1);
    }
    
    return options.reverse(); // Show most recent first
  }, []);

  // Update selected months when period changes
  const handlePeriodChange = (months: number) => {
    setPeriodMonths(months);
    const latestMonths = monthOptions.slice(-months).map(m => m.value);
    onMonthsChange(latestMonths);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Helper to calculate totals for operating expenses
  const getOperatingExpensesTotalByMonth = (month: string, useRunRate: boolean = false): number => {
    const monthData = data[month];
    if (!monthData?.operating_expenses?.by_category) return 0;
    
    // Exclude Marketing Expenses from operating expenses total
    return Object.entries(monthData.operating_expenses.by_category)
      .filter(([categoryName]) => categoryName !== "Marketing Expenses")
      .reduce((total, [_, expenses]) => {
        return total + (expenses as any[]).reduce((sum, exp) => {
          // Use full_monthly_amount for current month when run-rate is enabled
          const isCurrentMonth = monthData.is_current_month;
          if (isCurrentMonth && useRunRate && exp.full_monthly_amount) {
            return sum + exp.full_monthly_amount;
          }
          return sum + exp.amount;
        }, 0);
      }, 0);
  };

  // Helper to calculate marketing expenses total (Google + Meta + Operating Marketing)
  const getMarketingExpensesTotalByMonth = (month: string, useRunRate: boolean = false): number => {
    const monthData = data[month];
    if (!monthData) return 0;
    
    // For Google and Meta ads, use run-rate projection when available and enabled
    let googleAds = monthData.marketing_expenses?.google_ads || 0;
    let metaAds = monthData.marketing_expenses?.meta_ads || 0;
    const historicalGoogleAds = monthData.historical_data?.["Google Ads"] || 0;
    const historicalMetaAds = monthData.historical_data?.["Meta Ads"] || 0;
    
    // Use historical data if API shows 0
    googleAds = googleAds > 0 ? googleAds : historicalGoogleAds;
    metaAds = metaAds > 0 ? metaAds : historicalMetaAds;
    
    // Apply run-rate projection for current month if enabled
    if (monthData.is_current_month && useRunRate) {
      const runRateGoogle = monthData.run_rate_projections?.google_ads;
      const runRateMeta = monthData.run_rate_projections?.meta_ads;
      if (runRateGoogle) googleAds = runRateGoogle;
      if (runRateMeta) metaAds = runRateMeta;
    }
    
    // Calculate operating marketing expenses with run-rate consideration
    const operatingMarketing = monthData.operating_expenses?.by_category?.["Marketing Expenses"]?.reduce((sum, exp) => {
      const isCurrentMonth = monthData.is_current_month;
      if (isCurrentMonth && useRunRate && exp.full_monthly_amount) {
        return sum + exp.full_monthly_amount;
      }
      return sum + exp.amount;
    }, 0) || 0;
    
    return googleAds + metaAds + operatingMarketing;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>P&L Comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="grid grid-cols-7 gap-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              P&L Monthly Comparison
            </CardTitle>
            
            <div className="flex items-center gap-4">
              {/* Period Selection */}
              <div className="flex items-center gap-2">
                <Label htmlFor="period-select" className="text-sm font-medium">
                  Period:
                </Label>
                <Select
                  value={periodMonths.toString()}
                  onValueChange={(value) => handlePeriodChange(parseInt(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="9">9 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Desktop Header Row */}
          <div 
            className="hidden sm:grid gap-2 py-3 px-4 bg-gray-100 font-semibold border-b-2 border-gray-300"
            style={{ gridTemplateColumns: `300px repeat(${selectedMonths.length}, 1fr)` }}
          >
            <div>Metric</div>
            {selectedMonths.map(month => {
              const monthData = data[month];
              const date = new Date(month + '-01');
              const monthLabel = date.toLocaleDateString('en-US', { 
                month: 'short',
                year: 'numeric'
              });
              const dayInfo = monthData ? 
                (monthData.is_current_month ? monthData.days_elapsed : monthData.days_in_month) :
                new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

              return (
                <div key={month} className="text-center">
                  <div>{monthLabel}</div>
                  <div className="text-xs font-normal text-gray-600">{dayInfo} days</div>
                </div>
              );
            })}
          </div>
          
          {/* Mobile: Simple metric-by-metric comparison */}
          <div className="block sm:hidden space-y-4">
            {/* Simple header */}
            <div className="text-center text-sm text-gray-600 mb-4">
              {selectedMonths.length} months comparison
            </div>
          </div>

          {/* === REVENUE SECTION === */}
          <div className="hidden sm:grid gap-2 py-3 px-4 bg-blue-50 border-b-2 border-blue-200" style={{ gridTemplateColumns: `300px repeat(${selectedMonths.length}, 1fr)` }}>
            <div className="font-bold text-blue-800 text-sm uppercase tracking-wide">Revenue</div>
            {selectedMonths.map(month => <div key={month}></div>)}
          </div>
          {/* Mobile: No section headers - just clean metric cards */}
          
          <PLRow
            label="Total Net Sales"
            level={0}
            isTotal
            isExpandable
            isExpanded={expandedSections.has('net-sales')}
            onToggle={() => toggleSection('net-sales')}
            monthData={data}
            selectedMonths={selectedMonths}
            currentMonth={currentMonth}
            showRunRate={showRunRate}
            showVariance={true}
            dataPath="revenue.combined_net"
            runRatePath="run_rate_projections.combined_net"
            historicalPath="revenue.historical_net_sales"
          >
            {expandedSections.has('net-sales') && (
              <>
                <PLRow
                  label="POS Net Sales"
                  level={1}
                  monthData={data}
                  selectedMonths={selectedMonths}
                  currentMonth={currentMonth}
                  showRunRate={showRunRate}
                  showVariance={false}
                  dataPath="revenue.net_sales"
                  runRatePath="run_rate_projections.net_sales"
                  historicalPath="revenue.historical_net_sales"
                />

                <PLRow
                  label="Events Revenue"
                  level={1}
                  monthData={data}
                  selectedMonths={selectedMonths}
                  currentMonth={currentMonth}
                  showRunRate={showRunRate}
                  showVariance={false}
                  customValues={selectedMonths.reduce((acc, month) => {
                    const monthData = data[month];
                    if (monthData) {
                      acc[month] = monthData.historical_data?.["Net Sales (Events)"] || 0;
                    }
                    return acc;
                  }, {} as Record<string, number>)}
                />

                <PLRow
                  label="ClassPass Revenue"
                  level={1}
                  monthData={data}
                  selectedMonths={selectedMonths}
                  currentMonth={currentMonth}
                  showRunRate={showRunRate}
                  showVariance={false}
                  customValues={selectedMonths.reduce((acc, month) => {
                    const monthData = data[month];
                    if (monthData) {
                      acc[month] = monthData.historical_data?.["Net Sales (ClassPass)"] || 0;
                    }
                    return acc;
                  }, {} as Record<string, number>)}
                />

                <PLRow
                  label="Gowabi Revenue"
                  level={1}
                  monthData={data}
                  selectedMonths={selectedMonths}
                  currentMonth={currentMonth}
                  showRunRate={showRunRate}
                  showVariance={false}
                  customValues={selectedMonths.reduce((acc, month) => {
                    const monthData = data[month];
                    if (monthData) {
                      acc[month] = monthData.historical_data?.["Net Sales (Gowabi)"] || 0;
                    }
                    return acc;
                  }, {} as Record<string, number>)}
                />
              </>
            )}
          </PLRow>

          <PLRow
            label="Net Sales/Day"
            level={0}
            monthData={data}
            selectedMonths={selectedMonths}
            currentMonth={currentMonth}
            showRunRate={showRunRate}
            showVariance={false}
            customValues={selectedMonths.reduce((acc, month) => {
              const monthData = data[month];
              if (monthData) {
                const days = monthData.is_current_month ? monthData.days_elapsed : monthData.days_in_month;
                // Use historical data when available, fallback to current data
                const netSales = monthData.revenue?.combined_net || monthData.revenue?.historical_net_sales || 0;
                acc[month] = netSales / Math.max(days, 1);
              }
              return acc;
            }, {} as Record<string, number>)}
          />

          {/* === COST OF GOODS SOLD === */}
          <div className="hidden sm:grid gap-2 py-3 px-4 bg-red-50 border-b-2 border-red-200 mt-4" style={{ gridTemplateColumns: `300px repeat(${selectedMonths.length}, 1fr)` }}>
            <div className="font-bold text-red-800 text-sm uppercase tracking-wide">Cost of Goods Sold</div>
            {selectedMonths.map(month => <div key={month}></div>)}
          </div>
          {/* Mobile: Clean separation */}
          
          <PLRow
            label="Cost of Goods Sold (COGS)"
            level={0}
            isSection
            monthData={data}
            selectedMonths={selectedMonths}
            currentMonth={currentMonth}
            showRunRate={showRunRate}
            dataPath="cogs.total_cogs"
            runRatePath="run_rate_projections.total_cogs"
            historicalPath="cogs.historical_cogs"
          />

          {/* === GROSS PROFIT === */}
          <div className="hidden sm:grid gap-2 py-3 px-4 bg-green-50 border-b-2 border-green-200 mt-4" style={{ gridTemplateColumns: `300px repeat(${selectedMonths.length}, 1fr)` }}>
            <div className="font-bold text-green-800 text-sm uppercase tracking-wide">Gross Profit</div>
            {selectedMonths.map(month => <div key={month}></div>)}
          </div>
          {/* Mobile: Clean separation */}

          <PLRow
            label="Gross Profit"
            level={0}
            isTotal
            monthData={data}
            selectedMonths={selectedMonths}
            currentMonth={currentMonth}
            showRunRate={showRunRate}
            dataPath="gross_profit.calculated"
            runRatePath="run_rate_projections.gross_profit"
            historicalPath="gross_profit.historical_gross_profit"
          />

          {/* === OPERATING EXPENSES === */}
          <div className="hidden sm:grid gap-2 py-3 px-4 bg-orange-50 border-b-2 border-orange-200 mt-4" style={{ gridTemplateColumns: `300px repeat(${selectedMonths.length}, 1fr)` }}>
            <div className="font-bold text-orange-800 text-sm uppercase tracking-wide">Operating Expenses</div>
            {selectedMonths.map(month => <div key={month}></div>)}
          </div>
          {/* Mobile: Clean separation */}

          <PLRow
            label="Operating Expenses"
            level={0}
            isSection
            isExpandable
            isExpanded={expandedSections.has('operating')}
            onToggle={() => toggleSection('operating')}
            monthData={data}
            selectedMonths={selectedMonths}
            currentMonth={currentMonth}
            showRunRate={showRunRate}
            showVariance={false}
            customValues={selectedMonths.reduce((acc, month) => {
              acc[month] = getOperatingExpensesTotalByMonth(month, showRunRate);
              return acc;
            }, {} as Record<string, number>)}
          >
            {/* Operating Expense Categories */}
            {expandedSections.has('operating') && selectedMonths.length > 0 && data[selectedMonths[0]]?.operating_expenses?.by_category && 
              (() => {
                // Get unique subcategories from Operating Expenses category
                const uniqueSubcategories = new Set<string>();
                const expenseTypesBySubcategory: Record<string, Set<string>> = {};
                
                // Collect all unique subcategories and expense types
                selectedMonths.forEach(month => {
                  const monthData = data[month];
                  if (monthData?.operating_expenses?.by_category?.["Operating Expenses"]) {
                    (monthData.operating_expenses.by_category["Operating Expenses"] as any[]).forEach(expense => {
                      const subcat = expense.subcategory_name || 'Other';
                      uniqueSubcategories.add(subcat);
                      
                      if (!expenseTypesBySubcategory[subcat]) {
                        expenseTypesBySubcategory[subcat] = new Set();
                      }
                      expenseTypesBySubcategory[subcat].add(expense.expense_type_name);
                    });
                  }
                });

                return Array.from(uniqueSubcategories).map(subcategoryName => (
                  <div key={`operating-${subcategoryName}`}>
                    <PLRow
                      label={subcategoryName}
                      level={1}
                      isExpandable
                      isExpanded={expandedSections.has(`operating-${subcategoryName}`)}
                      onToggle={() => toggleSection(`operating-${subcategoryName}`)}
                      monthData={data}
                      selectedMonths={selectedMonths}
                      currentMonth={currentMonth}
                      showRunRate={showRunRate}
                      customValues={selectedMonths.reduce((acc, month) => {
                        const monthData = data[month];
                        if (monthData?.operating_expenses?.by_category?.["Operating Expenses"]) {
                          acc[month] = (monthData.operating_expenses.by_category["Operating Expenses"] as any[])
                            .filter(exp => exp.subcategory_name === subcategoryName)
                            .reduce((sum, exp) => {
                              // Use full_monthly_amount for current month when run-rate is enabled
                              const isCurrentMonth = monthData.is_current_month;
                              if (isCurrentMonth && showRunRate && exp.full_monthly_amount) {
                                return sum + exp.full_monthly_amount;
                              }
                              return sum + exp.amount;
                            }, 0);
                        }
                        return acc;
                      }, {} as Record<string, number>)}
                    >
                      {/* Individual expense types */}
                      {expandedSections.has(`operating-${subcategoryName}`) && 
                        Array.from(expenseTypesBySubcategory[subcategoryName] || []).map(expenseTypeName => (
                          <PLRow
                            key={`${subcategoryName}-${expenseTypeName}`}
                            label={expenseTypeName}
                            level={2}
                            monthData={data}
                            selectedMonths={selectedMonths}
                            currentMonth={currentMonth}
                            showRunRate={showRunRate}
                            customValues={selectedMonths.reduce((acc, month) => {
                              const monthData = data[month];
                              if (monthData?.operating_expenses?.by_category?.["Operating Expenses"]) {
                                const expenseData = (monthData.operating_expenses.by_category["Operating Expenses"] as any[])
                                  .find(exp => exp.expense_type_name === expenseTypeName && exp.subcategory_name === subcategoryName);
                                if (expenseData) {
                                  // Use full_monthly_amount for current month when run-rate is enabled
                                  const isCurrentMonth = monthData.is_current_month;
                                  if (isCurrentMonth && showRunRate && expenseData.full_monthly_amount) {
                                    acc[month] = expenseData.full_monthly_amount;
                                  } else {
                                    acc[month] = expenseData.amount;
                                  }
                                } else {
                                  acc[month] = 0;
                                }
                              }
                              return acc;
                            }, {} as Record<string, number>)}
                          />
                        ))
                      }
                    </PLRow>
                  </div>
                ));
              })()
            }
          </PLRow>

          {/* === MARKETING EXPENSES === */}
          <div className="hidden sm:grid gap-2 py-3 px-4 bg-purple-50 border-b-2 border-purple-200 mt-4" style={{ gridTemplateColumns: `300px repeat(${selectedMonths.length}, 1fr)` }}>
            <div className="font-bold text-purple-800 text-sm uppercase tracking-wide">Marketing Expenses</div>
            {selectedMonths.map(month => <div key={month}></div>)}
          </div>
          {/* Mobile: Clean separation */}

          <PLRow
            label="Marketing Expenses"
            level={0}
            isSection
            isExpandable
            isExpanded={expandedSections.has('marketing')}
            onToggle={() => toggleSection('marketing')}
            monthData={data}
            selectedMonths={selectedMonths}
            currentMonth={currentMonth}
            showRunRate={showRunRate}
            customValues={selectedMonths.reduce((acc, month) => {
              acc[month] = getMarketingExpensesTotalByMonth(month, showRunRate);
              return acc;
            }, {} as Record<string, number>)}
          >
            {expandedSections.has('marketing') && (
              <>
                <PLRow
                  label="Online Marketing"
                  level={1}
                  isExpandable
                  isExpanded={expandedSections.has('online-marketing')}
                  onToggle={() => toggleSection('online-marketing')}
                  monthData={data}
                  selectedMonths={selectedMonths}
                  currentMonth={currentMonth}
                  showRunRate={showRunRate}
                  customValues={selectedMonths.reduce((acc, month) => {
                    const monthData = data[month];
                    if (monthData) {
                      // Use actual API data if available, otherwise historical data
                      let googleAds = monthData.marketing_expenses?.google_ads || 0;
                      let metaAds = monthData.marketing_expenses?.meta_ads || 0;
                      const historicalGoogleAds = monthData.historical_data?.["Google Ads"] || 0;
                      const historicalMetaAds = monthData.historical_data?.["Meta Ads"] || 0;
                      
                      // Use historical if API shows 0
                      googleAds = googleAds > 0 ? googleAds : historicalGoogleAds;
                      metaAds = metaAds > 0 ? metaAds : historicalMetaAds;
                      
                      // Apply run-rate for current month when enabled
                      const isCurrentMonth = monthData.is_current_month;
                      if (isCurrentMonth && showRunRate) {
                        const runRateGoogle = monthData.run_rate_projections?.google_ads;
                        const runRateMeta = monthData.run_rate_projections?.meta_ads;
                        if (runRateGoogle) googleAds = runRateGoogle;
                        if (runRateMeta) metaAds = runRateMeta;
                      }
                      
                      const onlineOperating = monthData.operating_expenses?.by_category?.["Marketing Expenses"]
                        ?.filter((exp: any) => exp.subcategory_name === "Online Marketing")
                        .reduce((sum: number, exp: any) => {
                          // Use run-rate for operating expenses when enabled
                          if (isCurrentMonth && showRunRate && exp.full_monthly_amount) {
                            return sum + exp.full_monthly_amount;
                          }
                          return sum + exp.amount;
                        }, 0) || 0;
                        
                      acc[month] = googleAds + metaAds + onlineOperating;
                    }
                    return acc;
                  }, {} as Record<string, number>)}
                >
                  {expandedSections.has('online-marketing') && (
                    <>
                      <PLRow
                        label="Google"
                        level={2}
                        monthData={data}
                        selectedMonths={selectedMonths}
                        currentMonth={currentMonth}
                        showRunRate={showRunRate}
                        dataPath="marketing_expenses.google_ads"
                        runRatePath="run_rate_projections.google_ads"
                        customValues={selectedMonths.reduce((acc, month) => {
                          const monthData = data[month];
                          if (monthData) {
                            // Use actual API data if available, otherwise historical data
                            let googleAds = monthData.marketing_expenses?.google_ads || 0;
                            const historicalGoogleAds = monthData.historical_data?.["Google Ads"] || 0;
                            
                            // Use historical if API shows 0
                            googleAds = googleAds > 0 ? googleAds : historicalGoogleAds;
                            
                            // Apply run-rate for current month when enabled
                            const isCurrentMonth = monthData.is_current_month;
                            if (isCurrentMonth && showRunRate) {
                              const runRateGoogle = monthData.run_rate_projections?.google_ads;
                              if (runRateGoogle) googleAds = runRateGoogle;
                            }
                            
                            acc[month] = googleAds;
                          }
                          return acc;
                        }, {} as Record<string, number>)}
                      />
                      
                      <PLRow
                        label="Meta"
                        level={2}
                        monthData={data}
                        selectedMonths={selectedMonths}
                        currentMonth={currentMonth}
                        showRunRate={showRunRate}
                        dataPath="marketing_expenses.meta_ads"
                        runRatePath="run_rate_projections.meta_ads"
                        customValues={selectedMonths.reduce((acc, month) => {
                          const monthData = data[month];
                          if (monthData) {
                            // Use actual API data if available, otherwise historical data
                            let metaAds = monthData.marketing_expenses?.meta_ads || 0;
                            const historicalMetaAds = monthData.historical_data?.["Meta Ads"] || 0;
                            
                            // Use historical if API shows 0
                            metaAds = metaAds > 0 ? metaAds : historicalMetaAds;
                            
                            // Apply run-rate for current month when enabled
                            const isCurrentMonth = monthData.is_current_month;
                            if (isCurrentMonth && showRunRate) {
                              const runRateMeta = monthData.run_rate_projections?.meta_ads;
                              if (runRateMeta) metaAds = runRateMeta;
                            }
                            
                            acc[month] = metaAds;
                          }
                          return acc;
                        }, {} as Record<string, number>)}
                      />

                      {/* Online Marketing Operating Expenses */}
                      {selectedMonths.length > 0 && data[selectedMonths[0]]?.operating_expenses?.by_category?.["Marketing Expenses"] &&
                        (() => {
                          const uniqueOnlineExpenses = new Set<string>();
                          selectedMonths.forEach(month => {
                            const monthData = data[month];
                            if (monthData?.operating_expenses?.by_category?.["Marketing Expenses"]) {
                              (monthData.operating_expenses.by_category["Marketing Expenses"] as any[])
                                .filter(exp => exp.subcategory_name === "Online Marketing")
                                .forEach(exp => uniqueOnlineExpenses.add(exp.expense_type_name));
                            }
                          });

                          return Array.from(uniqueOnlineExpenses).map(expenseTypeName => (
                            <PLRow
                              key={`online-${expenseTypeName}`}
                              label={expenseTypeName}
                              level={2}
                              monthData={data}
                              selectedMonths={selectedMonths}
                              currentMonth={currentMonth}
                              showRunRate={showRunRate}
                              customValues={selectedMonths.reduce((acc, month) => {
                                const monthData = data[month];
                                if (monthData?.operating_expenses?.by_category?.["Marketing Expenses"]) {
                                  const expenseData = (monthData.operating_expenses.by_category["Marketing Expenses"] as any[])
                                    .find(exp => exp.expense_type_name === expenseTypeName && exp.subcategory_name === "Online Marketing");
                                  acc[month] = expenseData?.amount || 0;
                                }
                                return acc;
                              }, {} as Record<string, number>)}
                            />
                          ));
                        })()
                      }
                    </>
                  )}
                </PLRow>

                {/* Offline Marketing */}
                {selectedMonths.length > 0 && 
                  selectedMonths.some(month => 
                    data[month]?.operating_expenses?.by_category?.["Marketing Expenses"] &&
                    (data[month].operating_expenses.by_category["Marketing Expenses"] as any[])
                      .some(exp => exp.subcategory_name === "Offline Marketing")
                  ) && (
                  <PLRow
                    label="Offline Marketing"
                    level={1}
                    isExpandable
                    isExpanded={expandedSections.has('offline-marketing')}
                    onToggle={() => toggleSection('offline-marketing')}
                    monthData={data}
                    selectedMonths={selectedMonths}
                    currentMonth={currentMonth}
                    showRunRate={showRunRate}
                    customValues={selectedMonths.reduce((acc, month) => {
                      const monthData = data[month];
                      if (monthData?.operating_expenses?.by_category?.["Marketing Expenses"]) {
                        acc[month] = (monthData.operating_expenses.by_category["Marketing Expenses"] as any[])
                          .filter(exp => exp.subcategory_name === "Offline Marketing")
                          .reduce((sum, exp) => {
                            // Use run-rate for current month when enabled
                            const isCurrentMonth = monthData.is_current_month;
                            if (isCurrentMonth && showRunRate && exp.full_monthly_amount) {
                              return sum + exp.full_monthly_amount;
                            }
                            return sum + exp.amount;
                          }, 0);
                      }
                      return acc;
                    }, {} as Record<string, number>)}
                  >
                    {expandedSections.has('offline-marketing') &&
                      (() => {
                        const uniqueOfflineExpenses = new Set<string>();
                        selectedMonths.forEach(month => {
                          const monthData = data[month];
                          if (monthData?.operating_expenses?.by_category?.["Marketing Expenses"]) {
                            (monthData.operating_expenses.by_category["Marketing Expenses"] as any[])
                              .filter(exp => exp.subcategory_name === "Offline Marketing")
                              .forEach(exp => uniqueOfflineExpenses.add(exp.expense_type_name));
                          }
                        });

                        return Array.from(uniqueOfflineExpenses).map(expenseTypeName => (
                          <PLRow
                            key={`offline-${expenseTypeName}`}
                            label={expenseTypeName}
                            level={2}
                            monthData={data}
                            selectedMonths={selectedMonths}
                            currentMonth={currentMonth}
                            showRunRate={showRunRate}
                            customValues={selectedMonths.reduce((acc, month) => {
                              const monthData = data[month];
                              if (monthData?.operating_expenses?.by_category?.["Marketing Expenses"]) {
                                const expenseData = (monthData.operating_expenses.by_category["Marketing Expenses"] as any[])
                                  .find(exp => exp.expense_type_name === expenseTypeName && exp.subcategory_name === "Offline Marketing");
                                if (expenseData) {
                                  // Use run-rate for current month when enabled
                                  const isCurrentMonth = monthData.is_current_month;
                                  if (isCurrentMonth && showRunRate && expenseData.full_monthly_amount) {
                                    acc[month] = expenseData.full_monthly_amount;
                                  } else {
                                    acc[month] = expenseData.amount;
                                  }
                                } else {
                                  acc[month] = 0;
                                }
                              }
                              return acc;
                            }, {} as Record<string, number>)}
                          />
                        ));
                      })()
                    }
                  </PLRow>
                )}
              </>
            )}
          </PLRow>

          <PLRow
            label="EBITDA"
            level={0}
            isTotal
            monthData={data}
            selectedMonths={selectedMonths}
            currentMonth={currentMonth}
            showRunRate={showRunRate}
            customValues={selectedMonths.reduce((acc, month) => {
              const monthData = data[month];
              if (monthData) {
                const hasLiveData = monthData.data_sources?.has_pos_data || monthData.data_sources?.has_marketing_data;
                
                if (hasLiveData || monthData.is_current_month) {
                  // Always calculate EBITDA = Gross Profit - Operating Expenses - Marketing Expenses
                  
                  // Get Gross Profit (use run-rate if enabled for current month, otherwise use actual/historical)
                  let grossProfit;
                  if (monthData.is_current_month && showRunRate && monthData.run_rate_projections?.gross_profit) {
                    grossProfit = monthData.run_rate_projections.gross_profit;
                  } else {
                    grossProfit = monthData.gross_profit?.calculated || monthData.gross_profit?.historical_gross_profit || 0;
                  }
                  
                  // Get Operating Expenses (with run-rate consideration)
                  const operatingExpenses = getOperatingExpensesTotalByMonth(month, showRunRate);
                  
                  // Get Marketing Expenses (with run-rate consideration)  
                  const marketingExpenses = getMarketingExpensesTotalByMonth(month, showRunRate);
                  
                  const ebitda = grossProfit - operatingExpenses - marketingExpenses;
                  acc[month] = ebitda;
                } else {
                  // Use historical EBITDA for months with no live data
                  acc[month] = monthData.ebitda?.historical_ebitda || 0;
                }
              }
              return acc;
            }, {} as Record<string, number>)}
          />
        </CardContent>
      </Card>

      {/* Data Sources Legend - Enhanced with Colors */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          {/* Desktop: Horizontal layout */}
          <div className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
            <span className="font-medium">Data Sources:</span>
            <div className="flex items-center gap-1">
              <Badge className="text-xs bg-green-100 text-green-800 border-green-200">POS</Badge>
              <span>Live POS data</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-200">API</Badge>
              <span>Marketing APIs</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-200">Manual</Badge>
              <span>Manual entries</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">CSV</Badge>
              <span>Historical data</span>
            </div>
            <div className="flex items-center gap-1">
              <Calculator className="h-3 w-3 text-indigo-500" />
              <span>Run-rate projections (current month only)</span>
            </div>
          </div>
          
          {/* Mobile: Vertical layout with color dots */}
          <div className="block sm:hidden">
            <div className="text-center text-sm font-medium text-gray-700 mb-3">Data Sources</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-green-800">POS</div>
                  <div className="text-gray-600">Live data</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-purple-800">API</div>
                  <div className="text-gray-600">Marketing</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-orange-800">Manual</div>
                  <div className="text-gray-600">Entries</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-blue-800">CSV</div>
                  <div className="text-gray-600">Historical</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-200">
              <Calculator className="h-3 w-3 text-indigo-500" />
              <span className="text-xs text-gray-600">Run-rate: Current month projections</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}