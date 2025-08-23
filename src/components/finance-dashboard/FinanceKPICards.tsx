import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { KPIData } from '@/hooks/useFinanceDashboard';

interface FinanceKPICardsProps {
  data: KPIData | null;
  loading: boolean;
  month: string;
  viewMode: 'actual' | 'runrate';
}

interface KPICardProps {
  title: string;
  value: number;
  format: 'currency' | 'percentage';
  momChange?: number;
  yoyChange?: number | null;
  icon: React.ReactNode;
  loading: boolean;
  runRateValue?: number;
  viewMode: 'actual' | 'runrate';
  badge?: string;
  isExpense?: boolean; // New prop to indicate if this is an expense metric
  yoyIsAbsolute?: boolean; // New prop to indicate YoY is absolute difference, not percentage
}

function KPICard({ 
  title, 
  value, 
  format, 
  momChange,
  yoyChange,
  icon, 
  loading, 
  runRateValue, 
  viewMode,
  badge,
  isExpense = false,
  yoyIsAbsolute = false
}: KPICardProps) {
  if (loading) {
    return (
      <Card className="h-[220px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-3" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const displayValue = viewMode === 'runrate' && runRateValue !== undefined ? runRateValue : value;
  
  const formatValue = (val: number, fmt: 'currency' | 'percentage') => {
    if (fmt === 'currency') {
      return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    } else {
      return `${val.toFixed(1)}%`;
    }
  };

  const getChangeIcon = (changeValue?: number) => {
    if (changeValue === undefined || changeValue === 0) return <Minus className="h-3 w-3" />;
    return changeValue > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const getChangeColor = (changeValue?: number) => {
    if (changeValue === undefined || changeValue === 0) return 'text-gray-500';
    
    // For expense metrics, higher is bad (red), lower is good (green)
    if (isExpense) {
      return changeValue > 0 ? 'text-red-600' : 'text-green-600';
    }
    
    // For revenue/profit metrics, higher is good (green), lower is bad (red)
    return changeValue > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card className="h-[220px] transition-all duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            {title}
          </CardTitle>
          {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        </div>
        <div className="text-gray-400">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">
          {formatValue(displayValue, format)}
        </div>
        
        {viewMode === 'runrate' && runRateValue !== undefined && (
          <div className="text-xs text-blue-600 mb-1">
            Run-rate projection
          </div>
        )}
        
        {/* Enhanced MoM and YoY Display */}
        <div className="grid grid-cols-1 gap-2 mt-2">
          {/* MoM Change - More Prominent */}
          {momChange !== undefined && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
              momChange === 0 ? 'border-gray-200 bg-gray-50' :
              getChangeColor(momChange) === 'text-green-600' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-full ${
                  momChange === 0 ? 'bg-gray-200' :
                  getChangeColor(momChange) === 'text-green-600' ? 'bg-green-200' : 'bg-red-200'
                }`}>
                  {getChangeIcon(momChange)}
                </div>
                <span className="text-xs font-medium text-gray-600">MoM</span>
              </div>
              <span className={`text-sm font-semibold ${getChangeColor(momChange)}`}>
                {momChange > 0 ? '+' : ''}{momChange.toFixed(1)}%
              </span>
            </div>
          )}
          
          {/* YoY Change - More Prominent */}
          {yoyChange !== undefined && yoyChange !== null && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
              yoyChange === 0 ? 'border-gray-200 bg-gray-50' :
              getChangeColor(yoyChange) === 'text-green-600' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-full ${
                  yoyChange === 0 ? 'bg-gray-200' :
                  getChangeColor(yoyChange) === 'text-green-600' ? 'bg-green-200' : 'bg-red-200'
                }`}>
                  {getChangeIcon(yoyChange)}
                </div>
                <span className="text-xs font-medium text-gray-600">YoY</span>
              </div>
              <span className={`text-sm font-semibold ${getChangeColor(yoyChange)}`}>
                {yoyIsAbsolute ? (
                  // Display absolute difference with currency formatting
                  <>
                    {yoyChange > 0 ? '+' : ''}
                    {new Intl.NumberFormat('th-TH', {
                      style: 'currency',
                      currency: 'THB',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                      notation: 'compact',
                      compactDisplay: 'short'
                    }).format(yoyChange)}
                  </>
                ) : (
                  // Display percentage as normal
                  `${yoyChange > 0 ? '+' : ''}${yoyChange.toFixed(1)}%`
                )}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinanceKPICards({ data, loading, month, viewMode }: FinanceKPICardsProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = month === currentMonth;

  // Detect if EBITDA YoY is absolute value (when > 1000, it's likely absolute not percentage)
  const ebitdaYoyIsAbsolute = data?.ebitda_yoy_pct !== null && data?.ebitda_yoy_pct !== undefined && Math.abs(data.ebitda_yoy_pct) > 1000;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Net Sales */}
      <KPICard
        title="Net Sales"
        value={data?.net_sales || 0}
        format="currency"
        momChange={data?.net_sales_mom_pct}
        yoyChange={data?.net_sales_yoy_pct}
        icon={<DollarSign className="h-4 w-4" />}
        loading={loading}
        runRateValue={undefined} // Net sales run-rate handled by API
        viewMode={viewMode}
        badge={viewMode === 'runrate' && isCurrentMonth ? 'Projected' : undefined}
      />

      {/* Gross Profit */}
      <KPICard
        title="Gross Profit"
        value={data?.gross_profit || 0}
        format="currency"
        momChange={data?.gross_profit_mom_pct}
        yoyChange={data?.gross_profit_yoy_pct}
        icon={<BarChart3 className="h-4 w-4" />}
        loading={loading}
        runRateValue={undefined} // Gross profit run-rate handled by API
        viewMode={viewMode}
        badge={viewMode === 'runrate' && isCurrentMonth ? 'Projected' : undefined}
      />

      {/* Marketing Expenses */}
      <KPICard
        title="Marketing Expenses"
        value={data?.marketing_expenses || 0}
        format="currency"
        momChange={data?.marketing_expenses_mom_pct}
        yoyChange={data?.marketing_expenses_yoy_pct}
        icon={<PieChart className="h-4 w-4" />}
        loading={loading}
        runRateValue={undefined} // Marketing expenses run-rate handled by API
        viewMode={viewMode}
        badge={viewMode === 'runrate' && isCurrentMonth ? 'Projected' : undefined}
        isExpense={true} // Marketing expenses are costs - higher is bad
      />

      {/* EBITDA */}
      <KPICard
        title="EBITDA"
        value={data?.ebitda || 0}
        format="currency"
        momChange={data?.ebitda_mom_pct}
        yoyChange={data?.ebitda_yoy_pct}
        icon={<TrendingUp className="h-4 w-4" />}
        loading={loading}
        runRateValue={undefined} // EBITDA run-rate handled by API
        viewMode={viewMode}
        badge={viewMode === 'runrate' && isCurrentMonth ? 'Projected' : undefined}
        yoyIsAbsolute={ebitdaYoyIsAbsolute}
      />
    </div>
  );
}