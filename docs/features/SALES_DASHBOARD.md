# Sales Dashboard Documentation

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [KPI Metrics](#kpi-metrics)
5. [Charts & Visualizations](#charts--visualizations)
6. [Data Sources](#data-sources)
7. [Filtering & Date Ranges](#filtering--date-ranges)
8. [API Endpoints](#api-endpoints)
9. [Component Structure](#component-structure)
10. [Usage Guide](#usage-guide)
11. [Performance Considerations](#performance-considerations)
12. [Future Enhancements](#future-enhancements)

## Overview

The Sales Dashboard is a comprehensive business intelligence tool that provides real-time insights into the golf academy's performance. Built with React and Recharts, it offers interactive visualizations, key performance indicators (KPIs), and detailed analytics to help make data-driven decisions.

### Key Capabilities
- **Real-time Analytics**: Live business metrics with automatic updates
- **Interactive Charts**: Multiple chart types with drill-down capabilities and hoverable data points
- **Flexible Filtering**: Date range selection and comparison periods
- **Export Functionality**: Data export for reporting and analysis
- **Mobile Responsive**: Optimized for desktop and mobile viewing
- **Performance Optimized**: Efficient data loading and caching
- **Data Source Transparency**: Clear indication of data freshness and source

## Features

### Core Features
1. **KPI Cards**: Essential business metrics at a glance with hoverable trend lines
2. **Revenue Trends**: Historical revenue analysis with growth tracking
3. **Bay Utilization**: Simulator usage statistics across all golf bays
4. **Category Breakdown**: Analysis of different booking types and packages
5. **Customer Growth**: New customer acquisition and retention metrics
6. **Payment Methods**: Payment preference analysis and trends
7. **Data Source Indicator**: Real-time display of latest data timestamp and source

### Dashboard Controls
- **Date Range Selector**: Today, Yesterday, Last 7/30 days, Month/Year to Date
- **Comparison Periods**: Previous period, month, or year comparisons
- **Refresh Control**: Manual data refresh with loading indicators
- **Section Collapse**: Collapsible sections for focused viewing
- **Export Options**: Data export functionality

### Enhanced User Experience
- **Clean Interface**: Admin header is hidden for distraction-free viewing
- **Interactive KPI Charts**: Hover over trend lines to see detailed data points with tooltips
- **Period-Based Data Points**: Trend charts automatically show appropriate number of data points based on selected period (e.g., 30 points for "last 30 days")
- **Visible Data Points**: KPI trend lines now show individual data point markers (r=3) with enhanced active markers (r=5)
- **Smart Comparison Labels**: Intelligent comparison period labels that adapt to the selected timeframe
  - "Last 30 Days" shows "vs Previous 30 Days" instead of generic "WoW"
  - Each period gets contextually appropriate comparison labels
- **Real-time Data Timestamps**: Integration with MCP Supabase function to display actual latest booking data
- **Database Function Integration**: Custom PostgreSQL function `get_latest_data_timestamp()` for precise data freshness tracking
- **Improved Performance**: Optimized data fetching with proper error handling and fallbacks

## Architecture

### Technology Stack
- **Frontend**: React with TypeScript
- **Charts**: Recharts library for data visualization
- **Data Fetching**: Custom hooks with SWR for caching
- **State Management**: React hooks with context API
- **Styling**: Tailwind CSS with responsive design

### Component Hierarchy
```
SalesDashboardPage
├── Dashboard Header
│   ├── Title & Timestamp
│   ├── Date Range Controls
│   └── Refresh Button
├── KPI Cards Section
│   ├── Revenue KPIs
│   ├── Booking KPIs
│   └── Customer KPIs
├── Charts Section
│   ├── Revenue Trends Chart
│   ├── Bay Utilization Chart
│   ├── Category Breakdown Chart
│   ├── Customer Growth Chart
│   └── Payment Methods Chart
└── Flexible Analytics
    └── Custom Chart Builder
```

## KPI Metrics

### Revenue Metrics
```typescript
interface RevenueKPIs {
  totalRevenue: number;
  revenueGrowth: number;
  averageBookingValue: number;
  revenuePerCustomer: number;
}
```

#### Total Revenue
- **Description**: Sum of all revenue for the selected period
- **Calculation**: `SUM(booking_amount)` for confirmed bookings
- **Display**: Currency format with growth percentage
- **Comparison**: Previous period, month, or year

#### Revenue Growth
- **Description**: Percentage change in revenue compared to previous period
- **Calculation**: `((current_revenue - previous_revenue) / previous_revenue) * 100`
- **Display**: Percentage with up/down indicator
- **Color Coding**: Green for positive, red for negative growth

#### Average Booking Value
- **Description**: Average revenue per booking
- **Calculation**: `total_revenue / total_bookings`
- **Display**: Currency format with trend indicator
- **Insights**: Helps identify pricing effectiveness

### Booking Metrics
```typescript
interface BookingKPIs {
  totalBookings: number;
  bookingGrowth: number;
  averageBookingsPerDay: number;
  cancellationRate: number;
}
```

#### Total Bookings
- **Description**: Count of all confirmed bookings
- **Calculation**: `COUNT(*)` where status = 'confirmed'
- **Display**: Number with growth comparison
- **Breakdown**: By bay type and booking category

#### Cancellation Rate
- **Description**: Percentage of bookings that were cancelled
- **Calculation**: `(cancelled_bookings / total_bookings) * 100`
- **Display**: Percentage with trend analysis
- **Target**: Lower cancellation rates indicate better service

### Customer Metrics
```typescript
interface CustomerKPIs {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerRetentionRate: number;
}
```

#### Customer Acquisition
- **Description**: New customers acquired in the period
- **Calculation**: Count of first-time customers
- **Display**: Number with growth trend
- **Insights**: Marketing effectiveness indicator

#### Customer Retention
- **Description**: Percentage of customers who made repeat bookings
- **Calculation**: `(returning_customers / total_customers) * 100`
- **Display**: Percentage with monthly trends
- **Target**: Higher retention indicates customer satisfaction

## Charts & Visualizations

### 1. Revenue Trends Chart
**Type**: Line Chart with Area Fill
**Data**: Daily/Weekly/Monthly revenue over time
**Features**:
- Multiple time series (current vs. previous period)
- Hover tooltips with detailed information
- Zoom and pan capabilities
- Trend line indicators

```typescript
interface RevenueTrendData {
  date: string;
  revenue: number;
  previousPeriodRevenue: number;
  bookingCount: number;
}
```

### 2. Bay Utilization Chart
**Type**: Horizontal Bar Chart
**Data**: Usage statistics for each golf bay
**Features**:
- Bay-specific utilization percentages
- Color coding by utilization level
- Time slot breakdown
- Capacity analysis

```typescript
interface BayUtilizationData {
  bayName: string;
  utilizationRate: number;
  totalHours: number;
  bookedHours: number;
  peakHours: string[];
}
```

### 3. Category Breakdown Chart
**Type**: Pie Chart with Donut Display
**Data**: Revenue/bookings by category
**Features**:
- Interactive segments with drill-down
- Percentage and absolute values
- Legend with color coding
- Animation effects

```typescript
interface CategoryData {
  category: string;
  value: number;
  percentage: number;
  color: string;
  bookingCount: number;
}
```

### 4. Customer Growth Chart
**Type**: Stacked Area Chart
**Data**: New vs. returning customers over time
**Features**:
- Stacked visualization of customer types
- Growth rate indicators
- Cohort analysis capability
- Retention tracking

### 5. Payment Methods Chart
**Type**: Vertical Bar Chart
**Data**: Payment method preferences and trends
**Features**:
- Payment method comparison
- Trend analysis over time
- Transaction value breakdown
- Success rate tracking

## Data Sources

### Primary Database Source

The Sales Dashboard uses POS transaction data from the `pos` schema.

#### **Primary Data Table: `pos.lengolf_sales`**
```sql
-- Main POS transaction data (processed from Qashier POS system)
SELECT 
  s.id,
  s.date,
  s.receipt_number,
  s.invoice_number,
  s.customer_name,
  s.product_name,
  s.product_category,
  s.is_sim_usage,        -- INTEGER field (0/1) for easy summing
  s.item_cnt,
  s.sales_total,         -- Including VAT
  s.sales_net,           -- Excluding VAT  
  s.sales_cost,
  s.gross_profit,
  s.sales_timestamp
FROM pos.lengolf_sales s
WHERE s.date BETWEEN ? AND ?
  AND s.is_voided = FALSE;
```

#### **Supporting Tables (pos schema)**
```sql
-- Product dimension data
pos.dim_product (product categorization, costs, SIM usage flags)

-- Customer data enhancements  
pos.lengolf_sales_modifications (manual customer corrections)

-- ETL process logs
pos.sales_sync_logs (processing history and monitoring)
```

### Schema Architecture for Dashboard Functions

#### **`pos` Schema - Core Business Logic**
Contains the actual business logic and data processing functions:

##### **`pos.get_dashboard_summary_enhanced(start_date, end_date, comparison_start_date, comparison_end_date)`**
- **Purpose**: Primary dashboard function with comprehensive business calculations
- **Data Source**: `pos.lengolf_sales` table (POS transaction data)
- **Business Logic**: Complete revenue, profit, and utilization calculations
- **SIM Utilization**: Uses `pos.lengolf_sales.is_sim_usage` INTEGER field for efficient aggregation
- **VAT Handling**: Date-based VAT calculations (pre/post September 2024 regulatory change)
- **Customer Analytics**: New vs returning customer analysis
- **Returns**: Complete JSON with current period, comparison period, and trend data

**Example Response Structure:**
```json
{
  "current_period": {
    "total_revenue": 241048.60,
    "gross_profit": 190018.05,
    "transaction_count": 166,
    "unique_customers": 116,
    "avg_transaction_value": 1452.10,
    "gross_margin_pct": 78.83,
    "sim_utilization_pct": 53.03,
    "sim_utilization_count": 210,
    "new_customers": 63
  },
  "comparison_period": { /* similar structure */ },
  "trend_data": {
    "revenue": [/* daily revenue data */],
    "profit": [/* daily profit data */],
    "utilization": [/* daily SIM utilization */]
  }
}
```

##### **Other pos Schema Functions:**
- `pos.get_dashboard_summary_enhanced_with_time()` - Time-aware comparisons
- `pos.get_dashboard_calculations_documentation()` - Documentation of calculations

#### **`public` Schema - API Interface Layer**
Contains wrapper functions for backwards compatibility and external API access:

##### **`public.get_dashboard_summary_enhanced(start_date, end_date, comparison_start_date, comparison_end_date)`**
- **Purpose**: Interface wrapper for dashboard API calls
- **Implementation**: Simple wrapper that calls `pos.get_dashboard_summary_enhanced()`
- **Usage**: Used by Sales Dashboard frontend for backwards compatibility
- **Data Flow**: `Frontend → public function → pos function → pos.lengolf_sales`

```sql
-- public schema wrapper function
CREATE OR REPLACE FUNCTION public.get_dashboard_summary_enhanced(...)
RETURNS json AS $$
BEGIN
  -- Direct call to pos function containing business logic
  RETURN pos.get_dashboard_summary_enhanced(start_date, end_date, comparison_start_date, comparison_end_date);
END;
$$ LANGUAGE plpgsql;
```

##### **Other public Schema Functions:**
- `public.get_dashboard_charts()` - Chart data preparation
- `public.get_dashboard_summary()` - Basic dashboard metrics
- `public.get_dashboard_summary_with_daily_trends()` - Trend analysis

### Data Source Verification

**Data Usage (June 2025 Test):**
```sql
-- Test query shows dashboard functions use pos.lengolf_sales
SELECT pos.get_dashboard_summary_enhanced('2025-06-01', '2025-06-12', '2025-05-01', '2025-05-12');
-- Returns: 241,048.60 THB revenue from 166 POS transactions
-- Data source: pos.lengolf_sales (POS system data)
```

### Key Business Calculations

#### **SIM Utilization Logic**
```sql
-- SIM utilization calculation using INTEGER field for efficiency
SUM(is_sim_usage) / (COUNT(DISTINCT date) * 3 * 12) * 100
-- Where: 
--   is_sim_usage = 1 for SIM usage, 0 for other products (INTEGER for easy summing)
--   3 = number of golf bays
--   12 = operating hours per day
```

#### **VAT-Aware Revenue Calculations**
```sql
-- Revenue calculations handle VAT regulatory change (Sep 2024)
CASE 
  WHEN date < '2024-09-01' THEN sales_total  -- VAT calculated differently pre-Sep 2024
  ELSE sales_net * 1.07                      -- Post-Sep 2024 VAT handling
END
```

#### **Profit Margin Analysis**
```sql
-- Gross profit calculation using product costs
gross_profit = sales_net - sales_cost
gross_margin_pct = (gross_profit / sales_net) * 100
```

### Dashboard Data Aggregation

The dashboard uses optimized PostgreSQL functions for efficient data aggregation:

```sql
-- Revenue summary aggregation (within pos schema functions)
SELECT 
  SUM(sales_total) as total_revenue,
  SUM(gross_profit) as total_profit,
  COUNT(*) as transaction_count,
  COUNT(DISTINCT customer_name) as unique_customers,
  AVG(sales_total) as avg_transaction_value,
  SUM(is_sim_usage) as sim_usage_count,  -- INTEGER field allows efficient SUM()
  (SUM(is_sim_usage)::DECIMAL / (DATE_RANGE_DAYS * 3 * 12)) * 100 as sim_utilization_pct
FROM pos.lengolf_sales
WHERE date BETWEEN start_date AND end_date
  AND is_voided = FALSE;
```

### **Data Source Summary**

**Dashboard Data Sources:**
- `pos.lengolf_sales` - POS transaction data from Qashier system
- `pos.dim_product` - Product dimensions and costs
- `pos.lengolf_sales_modifications` - Customer data corrections

The Sales Dashboard shows Point of Sale (POS) analytics from the Qashier transaction system, displaying revenue from purchases of drinks, food, equipment, and simulator usage.

## Filtering & Date Ranges

### Date Preset Options
```typescript
type DatePreset = 
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'last3months'
  | 'monthToDate'
  | 'yearToDate'
  | 'custom';
```

### Date Range Implementation
```typescript
export function getDateRangeForPreset(preset: DatePreset): {
  start: Date;
  end: Date;
} {
  const now = new Date();
  const today = startOfDay(now);
  
  switch (preset) {
    case 'today':
      return { start: today, end: endOfDay(now) };
    case 'yesterday':
      const yesterday = subDays(today, 1);
      return { start: yesterday, end: endOfDay(yesterday) };
    case 'last7days':
      return { start: subDays(today, 7), end: endOfDay(now) };
    case 'last30days':
      return { start: subDays(today, 30), end: endOfDay(now) };
    case 'monthToDate':
      return { start: startOfMonth(now), end: endOfDay(now) };
    case 'yearToDate':
      return { start: startOfYear(now), end: endOfDay(now) };
    default:
      return { start: subDays(today, 30), end: endOfDay(now) };
  }
}
```

### Comparison Periods
- **Previous Period**: Same duration before the selected period
- **Previous Month**: Same date range in the previous month  
- **Previous Year**: Same date range in the previous year

## API Endpoints

### Dashboard Summary API

#### **Primary Endpoint (Recommended)**
```
POST /api/sales/dashboard-summary
```

**Function Called**: `public.get_dashboard_summary_enhanced()` → `pos.get_dashboard_summary_enhanced()`  
**Data Source**: `pos.lengolf_sales` (POS transaction data)

**Request Body**:
```json
{
  "startDate": "2025-06-01",
  "endDate": "2025-06-12", 
  "compareStartDate": "2025-05-01",
  "compareEndDate": "2025-05-12"
}
```

**Response Structure**:
```typescript
interface DashboardSummaryResponse {
  current_period: {
    total_revenue: number;           // Total POS sales revenue
    gross_profit: number;            // Revenue minus product costs
    transaction_count: number;       // Number of POS transactions
    unique_customers: number;        // Distinct customers
    avg_transaction_value: number;   // Average transaction amount
    gross_margin_pct: number;        // Profit margin percentage
    sim_utilization_pct: number;     // Golf simulator utilization
    sim_utilization_count: number;   // Number of SIM usage transactions
    new_customers: number;           // First-time customers
  };
  comparison_period: {
    // Same structure as current_period
  };
  trend_data: {
    revenue: Array<{date: string, value: number}>;
    profit: Array<{date: string, value: number}>;
    utilization: Array<{date: string, value: number}>;
  };
}
```

#### **Chart Data API**
```
POST /api/sales/dashboard-charts
```

**Function Called**: `public.get_dashboard_charts()` → (calls various pos functions)  
**Data Source**: `pos.lengolf_sales`

**Request Body**:
```json
{
  "startDate": "2025-06-01",
  "endDate": "2025-06-12",
  "chartType": "revenue" | "utilization" | "categories" | "customers" | "payments"
}
```

### Backend Function Architecture

#### **Frontend API Layer**
```typescript
// Frontend calls public schema functions for backwards compatibility
const response = await fetch('/api/sales/dashboard-summary', {
  method: 'POST',
  body: JSON.stringify({
    startDate: '2025-06-01',
    endDate: '2025-06-12',
    compareStartDate: '2025-05-01', 
    compareEndDate: '2025-05-12'
  })
});
```

#### **Backend Implementation**
```sql
-- Backend calls public function which wraps pos function
SELECT public.get_dashboard_summary_enhanced(
  '2025-06-01'::DATE,
  '2025-06-12'::DATE, 
  '2025-05-01'::DATE,
  '2025-05-12'::DATE
);

-- Which internally calls:
SELECT pos.get_dashboard_summary_enhanced(
  '2025-06-01'::DATE,
  '2025-06-12'::DATE,
  '2025-05-01'::DATE, 
  '2025-05-12'::DATE
);
```

#### **Database Function Flow**
```
Frontend Request
    ↓
Next.js API Route (/api/sales/dashboard-summary)
    ↓
Supabase Client Call
    ↓
public.get_dashboard_summary_enhanced() [wrapper function]
    ↓
pos.get_dashboard_summary_enhanced() [business logic function]
    ↓  
Query pos.lengolf_sales table [POS transaction data]
    ↓
Return aggregated JSON response
```

### Data Processing Functions

#### **ETL Functions (pos schema)**
- `pos.transform_sales_data()` - Primary ETL transformation
- `pos.sync_sales_data()` - ETL orchestration with logging
- `pos.api_sync_sales_data()` - API wrapper for ETL

#### **Dashboard Functions (pos schema)** 
- `pos.get_dashboard_summary_enhanced()` - Main dashboard calculations
- `pos.get_dashboard_summary_enhanced_with_time()` - Time-aware comparisons
- `pos.get_dashboard_calculations_documentation()` - Calculation documentation

#### **Interface Functions (public schema)**
- `public.get_dashboard_summary_enhanced()` - Wrapper for pos function
- `public.get_dashboard_charts()` - Chart data preparation  
- `public.get_dashboard_summary()` - Basic dashboard function

### Performance Optimization

#### **Function Call Optimization**
```sql
-- Optimized single call for dashboard data
SELECT public.get_dashboard_summary_enhanced(
  start_date, end_date, comparison_start_date, comparison_end_date
);

-- Returns complete dashboard data in one query:
-- - Current period metrics
-- - Comparison period metrics  
-- - Daily trend data for charts
-- - All calculations pre-computed
```

#### **Caching Strategy**
- **Client-side**: SWR caching with 5-minute TTL
- **Database**: Optimized indexes on `pos.lengolf_sales` for fast queries
- **Function**: Single comprehensive function call vs multiple API calls

### Real-time Data Updates

#### **Data Freshness Monitoring**
```sql
-- Check latest data timestamp
SELECT MAX(sales_timestamp) as latest_data
FROM pos.lengolf_sales;

-- ETL status monitoring
SELECT status, end_time, records_processed
FROM pos.sales_sync_logs 
ORDER BY start_time DESC 
LIMIT 1;
```

### ⚠️ **Important API Clarifications**

**Correct Function Usage:**
- ✅ `public.get_dashboard_summary_enhanced()` - Dashboard API calls
- ✅ `pos.get_dashboard_summary_enhanced()` - Contains business logic
- ✅ Data source: `pos.lengolf_sales` (POS transactions)

**Deprecated/Missing Functions:**
- ❌ `pos.etl_staging_to_sales_clean()` - Does not exist
- ❌ `pos.complete_sales_sync()` - Does not exist  
- ❌ References to `public.bookings` - Not used by dashboard

**Schema Organization:**
- **pos schema**: Contains business logic and data
- **public schema**: Contains API interface wrappers
- **Data flow**: Frontend → public → pos → pos.lengolf_sales

## Component Structure

### Main Dashboard Component
```typescript
export default function SalesDashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({
    datePreset: 'last30days',
    comparisonPeriod: 'previousPeriod'
  });

  const { summary, charts, isLoading, error, refresh } = useSalesDashboard({
    filters,
    refreshInterval: 0,
    enabled: true
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <DashboardHeader filters={filters} onFiltersChange={setFilters} />
      <KPICards data={summary?.kpis} loading={isLoading} />
      <ChartsSection data={charts} loading={isLoading} />
    </div>
  );
}
```

### Custom Hook for Data Management
```typescript
export function useSalesDashboard(options: SalesDashboardOptions) {
  const { data: summary, error: summaryError, isLoading: summaryLoading } = useSWR(
    ['/api/dashboard/summary', options.filters],
    ([url, filters]) => fetchDashboardSummary(url, filters),
    {
      refreshInterval: options.refreshInterval || 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );

  const { data: charts, error: chartsError, isLoading: chartsLoading } = useSWR(
    ['/api/dashboard/charts', options.filters],
    ([url, filters]) => fetchChartData(url, filters),
    {
      refreshInterval: options.refreshInterval || 0
    }
  );

  return {
    summary,
    charts,
    isLoading: summaryLoading || chartsLoading,
    error: summaryError || chartsError,
    refresh: () => {
      mutate(['/api/dashboard/summary', options.filters]);
      mutate(['/api/dashboard/charts', options.filters]);
    }
  };
}
```

## Usage Guide

### Accessing the Dashboard
1. **Authentication Required**: Must be logged in with admin privileges
2. **Navigation**: Admin menu → Sales Dashboard
3. **URL**: `/admin/sales-dashboard`

### Key Interactions
1. **Date Range Selection**: Use the date picker to select analysis period
2. **Comparison Toggle**: Choose comparison period for trend analysis
3. **Chart Interactions**: Hover for tooltips, click for drill-down
4. **Refresh Data**: Click refresh button for latest data
5. **Section Management**: Collapse/expand sections as needed

### Interpreting Metrics
- **Green Indicators**: Positive growth or improvement
- **Red Indicators**: Negative growth or decline
- **Gray Indicators**: No change or insufficient data
- **Percentages**: Show period-over-period changes
- **Trends**: Arrow indicators show direction of change

## Performance Considerations

### Data Caching
- **Client-side**: SWR caching with 5-minute TTL
- **Server-side**: Database query optimization with indexes
- **Memory**: Efficient data structures for large datasets

### Optimization Techniques
```typescript
// Memoized chart components
const RevenueTrendsChart = React.memo(({ data, loading }) => {
  const chartData = useMemo(() => processRevenueData(data), [data]);
  
  if (loading) return <ChartSkeleton />;
  
  return <LineChart data={chartData} />;
});

// Debounced filter updates
const debouncedFilterUpdate = useCallback(
  debounce((filters: DashboardFilters) => {
    setFilters(filters);
  }, 300),
  []
);
```

### Loading States
- **Skeleton Components**: Placeholder loading for charts
- **Progressive Loading**: Load KPIs first, then charts
- **Error Boundaries**: Graceful error handling
- **Retry Logic**: Automatic retry for failed requests

## Monthly/Weekly Reports Tab

### Overview
The Monthly/Weekly Reports tab provides historical analysis of key business metrics with tabular data for easy comparison across time periods. This tab complements the main dashboard's real-time analytics with structured historical reporting.

### Features
- **Time Period Selection**: Weekly or Monthly view toggle
- **Metrics Table**: Comprehensive table showing all main dashboard metrics across time periods
- **Period Comparison**: Compare current period with previous periods
- **Data Export**: Export table data to CSV/Excel
- **Trend Analysis**: Visual indicators showing period-over-period changes

### Metrics Included

#### Core Revenue Metrics
- **Total Revenue**: Sum of all POS sales revenue per period
- **Gross Profit**: Revenue minus product costs per period
- **Average Transaction Value**: Mean transaction amount per period
- **Gross Margin %**: Profit margin percentage per period

#### Transaction Metrics
- **Transaction Count**: Number of POS transactions per period
- **Unique Customers**: Distinct customers served per period
- **New Customers**: First-time customers acquired per period
- **Average Transactions per Day**: Daily transaction volume per period

#### Utilization Metrics
- **SIM Utilization %**: Golf simulator utilization rate per period
- **SIM Usage Count**: Number of simulator usage transactions per period
- **Peak Hours Usage**: Most active time periods per period
- **Bay Efficiency**: Utilization rate per golf bay per period

#### Customer Metrics
- **Customer Retention Rate**: Percentage of returning customers per period
- **Customer Acquisition Cost**: Cost to acquire new customers per period
- **Customer Lifetime Value**: Average value per customer per period
- **Repeat Customer Rate**: Percentage of customers making multiple visits per period

### Table Structure

#### Weekly Reports Table
```typescript
interface WeeklyReportRow {
  week: string;                    // "2025-W01", "2025-W02", etc.
  weekRange: string;               // "Jan 1-7, 2025"
  totalRevenue: number;            // Total revenue for the week
  grossProfit: number;             // Gross profit for the week
  transactionCount: number;        // Number of transactions
  uniqueCustomers: number;         // Unique customers served
  newCustomers: number;            // New customers acquired
  avgTransactionValue: number;     // Average transaction amount
  grossMarginPct: number;          // Gross margin percentage
  simUtilizationPct: number;       // SIM utilization percentage
  simUsageCount: number;           // SIM usage transactions
  customerRetentionRate: number;   // Customer retention rate
  avgTransactionsPerDay: number;   // Daily transaction average
  revenueGrowth: number;           // Week-over-week growth %
  profitGrowth: number;            // Profit growth %
  customerGrowth: number;          // Customer growth %
}
```

#### Monthly Reports Table
```typescript
interface MonthlyReportRow {
  month: string;                   // "2025-01", "2025-02", etc.
  monthName: string;               // "January 2025", "February 2025"
  totalRevenue: number;            // Total revenue for the month
  grossProfit: number;             // Gross profit for the month
  transactionCount: number;        // Number of transactions
  uniqueCustomers: number;         // Unique customers served
  newCustomers: number;            // New customers acquired
  avgTransactionValue: number;     // Average transaction amount
  grossMarginPct: number;          // Gross margin percentage
  simUtilizationPct: number;       // SIM utilization percentage
  simUsageCount: number;           // SIM usage transactions
  customerRetentionRate: number;   // Customer retention rate
  avgTransactionsPerDay: number;   // Daily transaction average
  workingDays: number;             // Number of operating days
  peakWeek: string;                // Highest revenue week
  lowWeek: string;                 // Lowest revenue week
  revenueGrowth: number;           // Month-over-month growth %
  profitGrowth: number;            // Profit growth %
  customerGrowth: number;          // Customer growth %
}
```

### Implementation Details

#### Data Source Integration
Uses the same data source as the main dashboard (`pos.lengolf_sales`) with additional aggregation functions:

```sql
-- Weekly aggregation function
CREATE OR REPLACE FUNCTION pos.get_weekly_reports(
  start_date DATE,
  end_date DATE
) RETURNS TABLE (
  week_number TEXT,
  week_range TEXT,
  total_revenue NUMERIC,
  gross_profit NUMERIC,
  transaction_count INTEGER,
  unique_customers INTEGER,
  new_customers INTEGER,
  avg_transaction_value NUMERIC,
  gross_margin_pct NUMERIC,
  sim_utilization_pct NUMERIC,
  sim_usage_count INTEGER,
  customer_retention_rate NUMERIC,
  avg_transactions_per_day NUMERIC,
  revenue_growth NUMERIC,
  profit_growth NUMERIC,
  customer_growth NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH weekly_data AS (
    SELECT 
      TO_CHAR(date, 'YYYY-"W"IW') as week_num,
      MIN(date) as week_start,
      MAX(date) as week_end,
      SUM(sales_total) as revenue,
      SUM(gross_profit) as profit,
      COUNT(*) as transactions,
      COUNT(DISTINCT customer_name) as customers,
      SUM(is_sim_usage) as sim_usage,
      COUNT(DISTINCT CASE WHEN is_new_customer THEN customer_name END) as new_cust
    FROM pos.lengolf_sales
    WHERE date BETWEEN start_date AND end_date
      AND is_voided = FALSE
    GROUP BY TO_CHAR(date, 'YYYY-"W"IW')
  )
  SELECT 
    wd.week_num,
    wd.week_start::TEXT || ' - ' || wd.week_end::TEXT as week_range,
    wd.revenue,
    wd.profit,
    wd.transactions,
    wd.customers,
    wd.new_cust,
    ROUND(wd.revenue / wd.transactions, 2) as avg_transaction,
    ROUND((wd.profit / wd.revenue) * 100, 2) as margin_pct,
    ROUND((wd.sim_usage::DECIMAL / (7 * 3 * 12)) * 100, 2) as sim_util_pct,
    wd.sim_usage,
    ROUND(((wd.customers - wd.new_cust)::DECIMAL / wd.customers) * 100, 2) as retention_rate,
    ROUND(wd.transactions::DECIMAL / 7, 2) as avg_daily_transactions,
    COALESCE(ROUND(((wd.revenue - LAG(wd.revenue) OVER (ORDER BY wd.week_num)) / LAG(wd.revenue) OVER (ORDER BY wd.week_num)) * 100, 2), 0) as revenue_growth,
    COALESCE(ROUND(((wd.profit - LAG(wd.profit) OVER (ORDER BY wd.week_num)) / LAG(wd.profit) OVER (ORDER BY wd.week_num)) * 100, 2), 0) as profit_growth,
    COALESCE(ROUND(((wd.customers - LAG(wd.customers) OVER (ORDER BY wd.week_num)) / LAG(wd.customers) OVER (ORDER BY wd.week_num)) * 100, 2), 0) as customer_growth
  FROM weekly_data wd
  ORDER BY wd.week_num;
END;
$$ LANGUAGE plpgsql;
```

#### API Endpoints

##### Weekly Reports API
```
POST /api/sales/weekly-reports
```

**Request Body**:
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

**Response**:
```json
{
  "data": [
    {
      "week": "2025-W01",
      "weekRange": "Jan 1-7, 2025",
      "totalRevenue": 25000.50,
      "grossProfit": 19500.25,
      "transactionCount": 45,
      "uniqueCustomers": 32,
      "newCustomers": 8,
      "avgTransactionValue": 555.56,
      "grossMarginPct": 78.0,
      "simUtilizationPct": 45.2,
      "simUsageCount": 28,
      "customerRetentionRate": 75.0,
      "avgTransactionsPerDay": 6.43,
      "revenueGrowth": 12.5,
      "profitGrowth": 15.2,
      "customerGrowth": 8.3
    }
  ]
}
```

##### Monthly Reports API
```
POST /api/sales/monthly-reports
```

**Request Body**:
```json
{
  "startDate": "2025-01-01", 
  "endDate": "2025-12-31"
}
```

### User Interface Components

#### Tab Navigation
```typescript
type ReportTab = 'weekly' | 'monthly';

interface ReportsTabProps {
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
}

const ReportsTab: React.FC<ReportsTabProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onTabChange('weekly')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'weekly'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Weekly Reports
        </button>
        <button
          onClick={() => onTabChange('monthly')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'monthly'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Monthly Reports
        </button>
      </nav>
    </div>
  );
};
```

#### Data Table Component
```typescript
interface ReportsTableProps {
  data: WeeklyReportRow[] | MonthlyReportRow[];
  type: 'weekly' | 'monthly';
  loading: boolean;
  onExport: () => void;
}

const ReportsTable: React.FC<ReportsTableProps> = ({ data, type, loading, onExport }) => {
  const columns = getColumnsForType(type);
  
  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          {type === 'weekly' ? 'Weekly' : 'Monthly'} Performance Report
        </h3>
        <button
          onClick={onExport}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          Export CSV
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <ReportsTableSkeleton columns={columns.length} />
            ) : (
              data.map((row, index) => (
                <ReportsTableRow key={index} row={row} columns={columns} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### Performance Considerations

#### Data Aggregation
- **Database Level**: Aggregation performed in PostgreSQL for efficiency
- **Caching**: Weekly/Monthly data cached for 1 hour (less frequent updates needed)
- **Pagination**: Large datasets paginated for better performance
- **Lazy Loading**: Load data only when tab is activated

#### Export Functionality
- **CSV Export**: Client-side CSV generation using popular libraries
- **Excel Export**: Optional Excel export for advanced formatting
- **Batch Processing**: Large datasets processed in batches
- **Progress Indicators**: Loading states for export operations

### Integration with Main Dashboard

#### Navigation
The Monthly/Weekly Reports tab is integrated into the main Sales Dashboard as a secondary tab:

```typescript
type DashboardTab = 'overview' | 'reports';

interface DashboardTabsProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onTabChange('overview')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Dashboard Overview
        </button>
        <button
          onClick={() => onTabChange('reports')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'reports'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Monthly/Weekly Reports
        </button>
      </nav>
    </div>
  );
};
```

### Usage Guidelines

#### Best Practices
1. **Regular Review**: Check weekly reports every Monday for previous week analysis
2. **Monthly Planning**: Use monthly reports for strategic planning and goal setting
3. **Trend Analysis**: Focus on growth percentages to identify trends
4. **Benchmark Comparison**: Compare current periods with historical data
5. **Export for Presentations**: Use export functionality for board meetings and reports

#### Key Insights to Monitor
- **Revenue Growth**: Consistent week-over-week or month-over-month growth
- **Customer Acquisition**: New customer trends and retention rates
- **Utilization Optimization**: SIM usage patterns and peak periods
- **Profit Margins**: Gross margin trends and profitability analysis
- **Seasonal Patterns**: Monthly data reveals seasonal business patterns

## Future Enhancements

### Planned Features
1. **Advanced Filtering**: Multi-dimensional filtering options
2. **Custom Dashboards**: User-configurable dashboard layouts
3. **Scheduled Reports**: Automated report generation and delivery
4. **Real-time Updates**: WebSocket-based live data updates
5. **Data Export**: CSV, PDF, and Excel export capabilities
6. **Alert System**: Automated alerts for KPI thresholds

### Technical Improvements
1. **Performance**: Virtual scrolling for large datasets
2. **Caching**: Redis-based server-side caching
3. **Analytics**: Enhanced business intelligence features
4. **Mobile**: Dedicated mobile dashboard interface
5. **Accessibility**: Enhanced screen reader support
6. **Internationalization**: Multi-language support

### Integration Enhancements
1. **External APIs**: Third-party analytics integration
2. **Data Warehouse**: Connection to data warehouse systems
3. **Machine Learning**: Predictive analytics capabilities
4. **API Access**: REST API for external dashboard consumers

---

For technical implementation details, see [Sales Dashboard Implementation Plan](../legacy/SALES_DASHBOARD_IMPLEMENTATION_PLAN.md).

**Last Updated**: June 2025  
**Version**: 2.0  
**Maintainer**: Lengolf Development Team 