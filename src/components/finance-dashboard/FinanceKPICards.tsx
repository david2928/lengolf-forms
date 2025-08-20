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
  change?: number;
  changeFormat?: 'percentage' | 'currency';
  icon: React.ReactNode;
  loading: boolean;
  runRateValue?: number;
  viewMode: 'actual' | 'runrate';
  badge?: string;
}

function KPICard({ 
  title, 
  value, 
  format, 
  change, 
  changeFormat = 'percentage',
  icon, 
  loading, 
  runRateValue, 
  viewMode,
  badge
}: KPICardProps) {
  if (loading) {
    return (
      <Card className="h-[140px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-16" />
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
    if (changeValue === undefined || changeValue === 0) return <Minus className="h-4 w-4" />;
    return changeValue > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const getChangeColor = (changeValue?: number) => {
    if (changeValue === undefined || changeValue === 0) return 'text-gray-500';
    return changeValue > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card className="h-[140px] transition-all duration-200 hover:shadow-md">
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
        
        {change !== undefined && (
          <div className={`flex items-center text-xs ${getChangeColor(change)}`}>
            {getChangeIcon(change)}
            <span className="ml-1">
              {formatValue(Math.abs(change), changeFormat)} vs last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FinanceKPICards({ data, loading, month, viewMode }: FinanceKPICardsProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = month === currentMonth;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Revenue */}
      <KPICard
        title="Total Revenue"
        value={data?.total_revenue || 0}
        format="currency"
        change={data?.mom_growth_pct}
        icon={<DollarSign className="h-4 w-4" />}
        loading={loading}
        runRateValue={data?.revenue_runrate}
        viewMode={viewMode}
        badge={viewMode === 'runrate' && isCurrentMonth ? 'Projected' : undefined}
      />

      {/* Gross Margin */}
      <KPICard
        title="Gross Margin"
        value={data?.gross_margin_pct || 0}
        format="percentage"
        icon={<PieChart className="h-4 w-4" />}
        loading={loading}
        runRateValue={undefined} // Margin doesn't change with run-rate
        viewMode={viewMode}
      />

      {/* EBITDA */}
      <KPICard
        title="EBITDA"
        value={data?.ebitda || 0}
        format="currency"
        icon={<BarChart3 className="h-4 w-4" />}
        loading={loading}
        runRateValue={data?.ebitda_runrate}
        viewMode={viewMode}
        badge={viewMode === 'runrate' && isCurrentMonth ? 'Projected' : undefined}
      />

      {/* Month-over-Month Growth */}
      <KPICard
        title="MoM Growth"
        value={data?.mom_growth_pct || 0}
        format="percentage"
        icon={data?.mom_growth_pct && data.mom_growth_pct > 0 ? 
          <TrendingUp className="h-4 w-4" /> : 
          <TrendingDown className="h-4 w-4" />
        }
        loading={loading}
        runRateValue={undefined} // Growth comparison doesn't apply to run-rate
        viewMode={viewMode}
      />
    </div>
  );
}