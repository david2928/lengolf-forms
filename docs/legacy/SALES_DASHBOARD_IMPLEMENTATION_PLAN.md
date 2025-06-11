# Sales Dashboard Implementation Plan

## 📋 Project Overview

This document outlines the implementation plan for a comprehensive sales dashboard integrated into the existing Lengolf Forms admin section. Based on analysis of the actual `pos.lengolf_sales` table (13,480 records from March 2024 to June 2025), this dashboard will provide actionable business insights for golf facility operations.

### **Data Infrastructure Analysis**

**Current Database Structure:**
- **Table**: `pos.lengolf_sales` (13,480 records)
- **Date Range**: March 16, 2024 to June 10, 2025
- **Unique Customers**: 2,005 customers
- **Unique Receipts**: 5,322 transactions
- **Sim Usage**: 38.2% of all transactions (5,146 records)

**Revenue Categories (by volume):**
1. **Bay Rates**: ฿2.2M (38% sim usage, 93.7% profit margin)
2. **Golf Packages**: ฿1.7M (96.3% profit margin)
3. **Coaching**: ฿864K (38.3% profit margin)
4. **Alcohol**: ฿560K (67.9% profit margin)
5. **Food**: ฿356K (35.2% profit margin)
6. **Events**: ฿207K (82.1% profit margin)
7. **Softdrinks**: ฿203K (74.3% profit margin)

**Payment Methods**: Cash, PromptPay, Visa/Mastercard Manual, QR Payment, combinations

## 🎯 Implementation Design

### **Integration with Existing Admin Framework**

The sales dashboard will be integrated into the existing admin structure at `/admin/sales-dashboard`, accessible through the admin dropdown menu.

**Navigation Integration:**
```typescript
// Add to src/components/nav.tsx admin dropdown
<DropdownMenuItem asChild>
  <Link href="/admin/sales-dashboard" className="flex items-center gap-2 w-full">
    <TrendingUp className="h-4 w-4" />
    Sales Dashboard
  </Link>
</DropdownMenuItem>
```

### **Dashboard Layout Design**

#### **Enhanced KPI Cards with Trends (6 cards)**
Based on user feedback, all KPI cards include WoW/MoM metrics and mini trend visualizations:

```
┌─────────────────────────────────────────────┐
│ Total Revenue        │ Gross Profit         │
│ ฿6,342,581          │ ฿4,934,902           │
│ ↗️ +12.5% WoW        │ ↗️ +8.3% WoW         │
│ ▲ +5.2% MoM          │ ▲ +3.1% MoM          │
│ [7-day trend line]   │ [7-day trend line]   │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Sim Utilization      │ Customer Acquisition │
│ 38.2% avg            │ 245 new customers    │
│ ↗️ +4.2% WoW         │ ↗️ +15.6% WoW        │
│ ▼ -2.1% MoM          │ ▲ +8.9% MoM          │
│ [7-day trend line]   │ [7-day trend line]   │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Avg Transaction      │ Gross Margin         │
│ ฿1,191               │ 77.8% avg            │
│ ↗️ +6.8% WoW         │ ↗️ +2.1% WoW         │
│ ▲ +3.4% MoM          │ ▼ -1.2% MoM          │
│ [7-day trend line]   │ [7-day trend line]   │
└─────────────────────────────────────────────┘
```

#### **Main Charts Section**
```
┌─────────────────────────────────────────────┐
│        Revenue & Profit Trends              │
│   (Multi-line: Total Revenue, Gross Profit, │
│    with daily/weekly/monthly aggregation)   │
└─────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────┐
│ Sim Utilization Trend│   Customer Growth    │
│ (Line chart showing  │ (New vs Returning    │
│  daily utilization)  │  customer trends)    │
└──────────────────────┴──────────────────────┘
```

#### **Business Intelligence Section**
```
┌──────────────────────┬──────────────────────┐
│   Revenue Mix        │   Payment Methods    │
│ (Bay Rates 35%,      │ (Cash, PromptPay,    │
│  Golf Packages 26%,  │  Card breakdown)     │
│  Coaching 14%, etc.) │                      │
└──────────────────────┴──────────────────────┘

┌──────────────────────┬──────────────────────┐
│  Top Products        │   Peak Hours         │
│ (Highest revenue     │ (Daily/hourly        │
│  products by category)│  revenue patterns)   │
└──────────────────────┴──────────────────────┘
```

## 🛠️ Technical Implementation

### **File Structure**
```
app/
├── admin/
│   └── sales-dashboard/
│       ├── page.tsx                    # Main dashboard page
│       └── loading.tsx                 # Loading state
├── api/
│   └── sales/
│       ├── dashboard-summary/route.ts  # KPI metrics with trends
│       ├── revenue-trends/route.ts     # Revenue time series
│       ├── utilization-trends/route.ts # Sim utilization trends
│       ├── category-breakdown/route.ts # Revenue by category
│       ├── payment-methods/route.ts    # Payment analysis
│       └── customer-metrics/route.ts   # Customer analytics

src/
├── components/
│   └── sales-dashboard/
│       ├── KPICards.tsx               # Enhanced metric cards
│       ├── RevenueTrendsChart.tsx     # Multi-line revenue chart
│       ├── SimUtilizationChart.tsx    # Sim utilization trend
│       ├── CategoryBreakdownChart.tsx # Revenue mix donut chart
│       ├── PaymentMethodsChart.tsx    # Payment analysis
│       ├── CustomerGrowthChart.tsx    # Customer acquisition
│       └── DashboardFilters.tsx       # Date/category filters
├── hooks/
│   └── useSalesDashboard.ts           # Dashboard data management
├── types/
│   └── sales-dashboard.ts             # TypeScript interfaces
└── lib/
    └── sales-calculations.ts          # Business logic utilities
```

### **Database Functions for Real Data**

Based on analysis of the actual `pos.lengolf_sales` structure:

```sql
-- Dashboard summary with WoW/MoM comparisons
CREATE OR REPLACE FUNCTION get_lengolf_dashboard_summary(
  start_date DATE,
  end_date DATE,
  comparison_start_date DATE,
  comparison_end_date DATE
) RETURNS JSON AS $$
DECLARE
  current_metrics JSON;
  comparison_metrics JSON;
  result JSON;
BEGIN
  -- Current period metrics
  SELECT json_build_object(
    'total_revenue', COALESCE(SUM(total_amount), 0),
    'gross_profit', COALESCE(SUM(gross_profit), 0),
    'transaction_count', COUNT(*),
    'unique_customers', COUNT(DISTINCT customer_phone_number),
    'avg_transaction_value', COALESCE(AVG(total_amount), 0),
    'gross_margin_pct', CASE 
      WHEN SUM(gross_amount) > 0 
      THEN (SUM(gross_profit) / SUM(gross_amount)) * 100 
      ELSE 0 
    END,
    'sim_utilization_count', SUM(CASE WHEN is_sim_usage THEN 1 ELSE 0 END),
    'sim_utilization_pct', (SUM(CASE WHEN is_sim_usage THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0)) * 100,
    'new_customers', COUNT(DISTINCT CASE 
      WHEN customer_phone_number IS NOT NULL 
           AND customer_phone_number != ''
           AND NOT EXISTS (
             SELECT 1 FROM pos.lengolf_sales prev 
             WHERE prev.customer_phone_number = pos.lengolf_sales.customer_phone_number 
             AND prev.date < start_date
           )
      THEN customer_phone_number 
    END)
  ) INTO current_metrics
  FROM pos.lengolf_sales
  WHERE date BETWEEN start_date AND end_date;

  -- Comparison period metrics
  SELECT json_build_object(
    'total_revenue', COALESCE(SUM(total_amount), 0),
    'gross_profit', COALESCE(SUM(gross_profit), 0),
    'transaction_count', COUNT(*),
    'unique_customers', COUNT(DISTINCT customer_phone_number),
    'avg_transaction_value', COALESCE(AVG(total_amount), 0),
    'gross_margin_pct', CASE 
      WHEN SUM(gross_amount) > 0 
      THEN (SUM(gross_profit) / SUM(gross_amount)) * 100 
      ELSE 0 
    END,
    'sim_utilization_count', SUM(CASE WHEN is_sim_usage THEN 1 ELSE 0 END),
    'sim_utilization_pct', (SUM(CASE WHEN is_sim_usage THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0)) * 100,
    'new_customers', COUNT(DISTINCT CASE 
      WHEN customer_phone_number IS NOT NULL 
           AND customer_phone_number != ''
           AND NOT EXISTS (
             SELECT 1 FROM pos.lengolf_sales prev 
             WHERE prev.customer_phone_number = pos.lengolf_sales.customer_phone_number 
             AND prev.date < comparison_start_date
           )
      THEN customer_phone_number 
    END)
  ) INTO comparison_metrics
  FROM pos.lengolf_sales
  WHERE date BETWEEN comparison_start_date AND comparison_end_date;

  -- Calculate percentage changes
  SELECT json_build_object(
    'current', current_metrics,
    'comparison', comparison_metrics,
    'changes', json_build_object(
      'revenue_change_pct', CASE 
        WHEN (comparison_metrics->>'total_revenue')::NUMERIC > 0 
        THEN ((current_metrics->>'total_revenue')::NUMERIC - (comparison_metrics->>'total_revenue')::NUMERIC) / (comparison_metrics->>'total_revenue')::NUMERIC * 100
        ELSE NULL 
      END,
      'profit_change_pct', CASE 
        WHEN (comparison_metrics->>'gross_profit')::NUMERIC > 0 
        THEN ((current_metrics->>'gross_profit')::NUMERIC - (comparison_metrics->>'gross_profit')::NUMERIC) / (comparison_metrics->>'gross_profit')::NUMERIC * 100
        ELSE NULL 
      END,
      'transaction_change_pct', CASE 
        WHEN (comparison_metrics->>'avg_transaction_value')::NUMERIC > 0 
        THEN ((current_metrics->>'avg_transaction_value')::NUMERIC - (comparison_metrics->>'avg_transaction_value')::NUMERIC) / (comparison_metrics->>'avg_transaction_value')::NUMERIC * 100
        ELSE NULL 
      END,
      'customer_acquisition_change_pct', CASE 
        WHEN (comparison_metrics->>'new_customers')::NUMERIC > 0 
        THEN ((current_metrics->>'new_customers')::NUMERIC - (comparison_metrics->>'new_customers')::NUMERIC) / (comparison_metrics->>'new_customers')::NUMERIC * 100
        ELSE NULL 
      END,
      'sim_utilization_change_pct', (current_metrics->>'sim_utilization_pct')::NUMERIC - (comparison_metrics->>'sim_utilization_pct')::NUMERIC,
      'margin_change_pct', (current_metrics->>'gross_margin_pct')::NUMERIC - (comparison_metrics->>'gross_margin_pct')::NUMERIC
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Daily revenue trends for charts
CREATE OR REPLACE FUNCTION get_revenue_trends(
  start_date DATE,
  end_date DATE,
  period_type TEXT DEFAULT 'day'
) RETURNS TABLE(
  period_date DATE,
  total_revenue NUMERIC,
  gross_profit NUMERIC,
  transaction_count BIGINT,
  avg_transaction_value NUMERIC,
  unique_customers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN period_type = 'week' THEN date_trunc('week', date)::DATE
      WHEN period_type = 'month' THEN date_trunc('month', date)::DATE
      ELSE date
    END as period_date,
    SUM(total_amount) as total_revenue,
    SUM(gross_profit) as gross_profit,
    COUNT(*) as transaction_count,
    AVG(total_amount) as avg_transaction_value,
    COUNT(DISTINCT customer_phone_number) as unique_customers
  FROM pos.lengolf_sales
  WHERE date BETWEEN start_date AND end_date
  GROUP BY period_date
  ORDER BY period_date;
END;
$$ LANGUAGE plpgsql;

-- Sim utilization trends (addressing user feedback)
CREATE OR REPLACE FUNCTION get_sim_utilization_trends(
  start_date DATE,
  end_date DATE
) RETURNS TABLE(
  date DATE,
  sim_usage_count BIGINT,
  total_transactions BIGINT,
  utilization_pct NUMERIC,
  sim_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date,
    SUM(CASE WHEN is_sim_usage THEN 1 ELSE 0 END) as sim_usage_count,
    COUNT(*) as total_transactions,
    (SUM(CASE WHEN is_sim_usage THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0)) * 100 as utilization_pct,
    SUM(CASE WHEN is_sim_usage THEN total_amount ELSE 0 END) as sim_revenue
  FROM pos.lengolf_sales
  WHERE date BETWEEN start_date AND end_date
  GROUP BY date
  ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- Category breakdown with actual data insights
CREATE OR REPLACE FUNCTION get_category_breakdown(
  start_date DATE,
  end_date DATE
) RETURNS TABLE(
  parent_category TEXT,
  revenue NUMERIC,
  profit NUMERIC,
  margin_pct NUMERIC,
  transaction_count BIGINT,
  avg_transaction_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(parent_category, 'Unknown') as parent_category,
    SUM(total_amount) as revenue,
    SUM(gross_profit) as profit,
    CASE 
      WHEN SUM(gross_amount) > 0 
      THEN (SUM(gross_profit) / SUM(gross_amount)) * 100 
      ELSE 0 
    END as margin_pct,
    COUNT(*) as transaction_count,
    AVG(total_amount) as avg_transaction_value
  FROM pos.lengolf_sales
  WHERE date BETWEEN start_date AND end_date
    AND parent_category IS NOT NULL 
    AND parent_category != ''
  GROUP BY parent_category
  ORDER BY revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Payment method analysis
CREATE OR REPLACE FUNCTION get_payment_method_breakdown(
  start_date DATE,
  end_date DATE
) RETURNS TABLE(
  payment_type TEXT,
  transaction_count BIGINT,
  revenue NUMERIC,
  avg_transaction_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN payment_method LIKE '%Cash%' THEN 'Cash'
      WHEN payment_method LIKE '%PromptPay%' THEN 'PromptPay'
      WHEN payment_method LIKE '%Visa%' THEN 'Credit Card'
      WHEN payment_method LIKE '%Mastercard%' THEN 'Credit Card'
      WHEN payment_method = 'QR Payment' THEN 'QR Payment'
      WHEN payment_method LIKE '%Alipay%' THEN 'Digital Wallet'
      ELSE 'Other'
    END as payment_type,
    COUNT(*) as transaction_count,
    SUM(total_amount) as revenue,
    AVG(total_amount) as avg_transaction_value
  FROM pos.lengolf_sales
  WHERE date BETWEEN start_date AND end_date
    AND payment_method IS NOT NULL
  GROUP BY payment_type
  ORDER BY revenue DESC;
END;
$$ LANGUAGE plpgsql;
```

### **TypeScript Interfaces**

```typescript
// src/types/sales-dashboard.ts
export interface DashboardSummary {
  current: PeriodMetrics;
  comparison: PeriodMetrics;
  changes: ChangeMetrics;
}

export interface PeriodMetrics {
  total_revenue: number;
  gross_profit: number;
  transaction_count: number;
  unique_customers: number;
  avg_transaction_value: number;
  gross_margin_pct: number;
  sim_utilization_count: number;
  sim_utilization_pct: number;
  new_customers: number;
}

export interface ChangeMetrics {
  revenue_change_pct: number | null;
  profit_change_pct: number | null;
  transaction_change_pct: number | null;
  customer_acquisition_change_pct: number | null;
  sim_utilization_change_pct: number | null;
  margin_change_pct: number | null;
}

export interface KPICardData {
  label: string;
  value: string;
  changePercent: number | null;
  changeDirection: 'up' | 'down' | 'neutral';
  trendData: Array<{ date: string; value: number }>;
  format: 'currency' | 'percentage' | 'number';
}

export interface RevenueTrendPoint {
  period_date: string;
  total_revenue: number;
  gross_profit: number;
  transaction_count: number;
  avg_transaction_value: number;
  unique_customers: number;
}

export interface SimUtilizationPoint {
  date: string;
  sim_usage_count: number;
  total_transactions: number;
  utilization_pct: number;
  sim_revenue: number;
}

export interface CategoryData {
  parent_category: string;
  revenue: number;
  profit: number;
  margin_pct: number;
  transaction_count: number;
  avg_transaction_value: number;
}

export interface PaymentMethodData {
  payment_type: string;
  transaction_count: number;
  revenue: number;
  avg_transaction_value: number;
}

export interface DashboardFilters {
  dateRange: {
    start: Date;
    end: Date;
    preset: 'last7days' | 'last30days' | 'last3months' | 'monthToDate' | 'custom';
  };
  comparisonPeriod: 'previousPeriod' | 'previousMonth' | 'previousYear';
  categoryFilter?: string;
}
```

### **API Implementation**

#### **Dashboard Summary API**
```typescript
// app/api/sales/dashboard-summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mcp_supabase_booking_execute_sql } from '@/lib/supabase-mcp';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const comparisonStartDate = searchParams.get('comparison_start_date');
    const comparisonEndDate = searchParams.get('comparison_end_date');

    if (!startDate || !endDate || !comparisonStartDate || !comparisonEndDate) {
      return NextResponse.json(
        { error: 'Missing required date parameters' },
        { status: 400 }
      );
    }

    const { data } = await mcp_supabase_booking_execute_sql(
      'bisimqmtxjsptehhqpeg',
      `SELECT get_lengolf_dashboard_summary('${startDate}', '${endDate}', '${comparisonStartDate}', '${comparisonEndDate}') as summary`
    );

    return NextResponse.json(data[0].summary);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard summary' },
      { status: 500 }
    );
  }
}
```

#### **Revenue Trends API**
```typescript
// app/api/sales/revenue-trends/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mcp_supabase_booking_execute_sql } from '@/lib/supabase-mcp';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const periodType = searchParams.get('period_type') || 'day';

    const { data } = await mcp_supabase_booking_execute_sql(
      'bisimqmtxjsptehhqpeg',
      `SELECT * FROM get_revenue_trends('${startDate}', '${endDate}', '${periodType}')`
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Revenue trends error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue trends' },
      { status: 500 }
    );
  }
}
```

### **React Components**

#### **Enhanced KPI Cards Component**
```typescript
// src/components/sales-dashboard/KPICards.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DashboardSummary } from '@/types/sales-dashboard';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KPICardsProps {
  data: DashboardSummary;
  trendData: Record<string, Array<{ date: string; value: number }>>;
}

export function KPICards({ data, trendData }: KPICardsProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString();

  const getChangeIcon = (change: number | null) => {
    if (change === null) return <Minus className="h-3 w-3" />;
    if (change > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3" />;
  };

  const getChangeColor = (change: number | null) => {
    if (change === null) return 'text-gray-500';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(data.current.total_revenue),
      change: data.changes.revenue_change_pct,
      trend: trendData.revenue || []
    },
    {
      title: 'Gross Profit',
      value: formatCurrency(data.current.gross_profit),
      change: data.changes.profit_change_pct,
      trend: trendData.profit || []
    },
    {
      title: 'Sim Utilization',
      value: formatPercentage(data.current.sim_utilization_pct),
      change: data.changes.sim_utilization_change_pct,
      trend: trendData.utilization || []
    },
    {
      title: 'Customer Acquisition',
      value: formatNumber(data.current.new_customers),
      change: data.changes.customer_acquisition_change_pct,
      trend: trendData.customers || []
    },
    {
      title: 'Avg Transaction',
      value: formatCurrency(data.current.avg_transaction_value),
      change: data.changes.transaction_change_pct,
      trend: trendData.transaction || []
    },
    {
      title: 'Gross Margin',
      value: formatPercentage(data.current.gross_margin_pct),
      change: data.changes.margin_change_pct,
      trend: trendData.margin || []
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {kpiCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className={`flex items-center text-xs ${getChangeColor(card.change)}`}>
              {getChangeIcon(card.change)}
              <span className="ml-1">
                {card.change !== null ? `${card.change > 0 ? '+' : ''}${card.change.toFixed(1)}%` : 'N/A'} WoW
              </span>
            </div>
            <div className="h-12 mt-2">
              {card.trend.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={card.trend}>
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

#### **Sim Utilization Trend Chart** (addressing user feedback)
```typescript
// src/components/sales-dashboard/SimUtilizationChart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { SimUtilizationPoint } from '@/types/sales-dashboard';

interface SimUtilizationChartProps {
  data: SimUtilizationPoint[];
}

export function SimUtilizationChart({ data }: SimUtilizationChartProps) {
  const averageUtilization = data.reduce((acc, point) => acc + point.utilization_pct, 0) / data.length;

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Sim Utilization Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Utilization']}
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <ReferenceLine 
              y={averageUtilization} 
              stroke="#94a3b8" 
              strokeDasharray="5 5"
              label={{ value: `Avg: ${averageUtilization.toFixed(1)}%`, position: 'top' }}
            />
            <Line 
              type="monotone" 
              dataKey="utilization_pct" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

#### **Category Breakdown Chart**
```typescript
// src/components/sales-dashboard/CategoryBreakdownChart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CategoryData } from '@/types/sales-dashboard';

interface CategoryBreakdownChartProps {
  data: CategoryData[];
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#ec4899'
];

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length]
  }));

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Revenue by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={120}
              fill="#8884d8"
              dataKey="revenue"
              label={({ parent_category, percent }) => 
                `${parent_category}: ${(percent * 100).toFixed(1)}%`
              }
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name) => [formatCurrency(value), 'Revenue']}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

## 📅 Implementation Timeline

### **Phase 1: Backend Development (5 days)**
- **Day 1-2**: Create database functions with real data structure
- **Day 3-4**: Implement API endpoints with caching
- **Day 5**: Testing and optimization with actual data

### **Phase 2: Frontend Components (7 days)**
- **Day 1-2**: Enhanced KPI cards with trends and WoW/MoM metrics
- **Day 3-4**: Sim utilization trend chart (per user feedback)
- **Day 5-6**: Revenue analysis and category breakdown charts
- **Day 7**: Dashboard layout and responsive design

### **Phase 3: Integration & Testing (3 days)**
- **Day 1**: Integration with existing admin navigation
- **Day 2**: End-to-end testing with real data
- **Day 3**: Performance optimization and final polish

## 🔧 Technology Stack

### **Dependencies to Add**
```json
{
  "recharts": "^2.8.0",
  "date-fns": "^3.6.0" // (already exists)
}
```

### **Existing Infrastructure Used**
- **Database**: Supabase with MCP integration
- **Admin Framework**: Existing `/admin` structure
- **Navigation**: Current admin dropdown menu
- **UI Components**: Shadcn/UI (already implemented)
- **Authentication**: Existing admin role system
- **Caching**: NodeCache (already implemented)

## 🎯 Key Features Delivered

### **User Feedback Integration**
✅ **Sim Utilization Trend Chart**: Changed from gauge to comprehensive line chart  
✅ **WoW/MoM Metrics**: All KPI cards include week-over-week and month-over-month comparisons  
✅ **Mini Trend Visualizations**: 7-day trend lines in each KPI card  

### **Real Data Insights**
✅ **Actual Categories**: Bay Rates, Golf Packages, Coaching, F&B, etc.  
✅ **Payment Method Analysis**: Cash, PromptPay, Card combinations  
✅ **Customer Behavior**: New vs. returning customer patterns  
✅ **Profitability Analysis**: Category-specific profit margins  

### **Golf Facility Specific**
✅ **Sim Utilization Tracking**: Daily utilization patterns and trends  
✅ **Revenue Optimization**: Peak hours and seasonal patterns  
✅ **Customer Acquisition**: New customer tracking and retention  
✅ **Product Mix Analysis**: Category performance and profitability  

**Total Implementation Time**: 15 days  
**Integration Effort**: Minimal (uses existing admin framework)  
**Data Source**: Real `pos.lengolf_sales` table (13,480 records analyzed)

## 📝 Conclusion

This implementation plan provides a comprehensive roadmap for building a powerful sales dashboard that leverages the existing POS data to provide valuable business insights. The phased approach ensures systematic development while the technology choices align with the existing Lengolf Forms architecture.

The dashboard will serve as a foundation for data-driven decision making and can be easily extended with additional features based on business needs and user feedback.

**Total Estimated Timeline: 20-27 working days**
**Team Size Recommendation: 2-3 developers**
**Budget Considerations: Minimal additional costs (mainly Recharts license-free)** 