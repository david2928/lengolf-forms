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
- **Interactive Charts**: Multiple chart types with drill-down capabilities
- **Flexible Filtering**: Date range selection and comparison periods
- **Export Functionality**: Data export for reporting and analysis
- **Mobile Responsive**: Optimized for desktop and mobile viewing
- **Performance Optimized**: Efficient data loading and caching

## Features

### Core Features
1. **KPI Cards**: Essential business metrics at a glance
2. **Revenue Trends**: Historical revenue analysis with growth tracking
3. **Bay Utilization**: Simulator usage statistics across all golf bays
4. **Category Breakdown**: Analysis of different booking types and packages
5. **Customer Growth**: New customer acquisition and retention metrics
6. **Payment Methods**: Payment preference analysis and trends

### Dashboard Controls
- **Date Range Selector**: Today, Yesterday, Last 7/30 days, Month/Year to Date
- **Comparison Periods**: Previous period, month, or year comparisons
- **Refresh Control**: Manual data refresh with loading indicators
- **Section Collapse**: Collapsible sections for focused viewing
- **Export Options**: Data export functionality

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

### Primary Database Tables
```sql
-- Main booking data
SELECT 
  b.id,
  b.date,
  b.start_time,
  b.duration,
  b.bay,
  b.booking_type,
  b.status,
  b.customer_name,
  b.payment_method,
  b.total_amount,
  b.created_at
FROM bookings b
WHERE b.date BETWEEN ? AND ?
  AND b.status = 'confirmed';

-- Package data
SELECT 
  p.id,
  p.customer_id,
  p.package_type,
  p.purchase_date,
  p.activation_date,
  p.expiration_date,
  p.total_hours,
  p.used_hours,
  p.remaining_hours
FROM packages p
WHERE p.purchase_date BETWEEN ? AND ?;

-- Customer data
SELECT 
  c.id,
  c.customer_name,
  c.first_booking_date,
  c.last_booking_date,
  c.total_bookings,
  c.total_spent
FROM customers c;
```

### Data Aggregation
The dashboard uses PostgreSQL functions for efficient data aggregation:

```sql
-- Revenue summary function
CREATE OR REPLACE FUNCTION get_revenue_summary(
  start_date DATE,
  end_date DATE
) RETURNS TABLE (
  total_revenue DECIMAL,
  total_bookings INTEGER,
  unique_customers INTEGER,
  average_booking_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(total_amount), 0) as total_revenue,
    COUNT(*)::INTEGER as total_bookings,
    COUNT(DISTINCT customer_name)::INTEGER as unique_customers,
    COALESCE(AVG(total_amount), 0) as average_booking_value
  FROM bookings
  WHERE date BETWEEN start_date AND end_date
    AND status = 'confirmed';
END;
$$ LANGUAGE plpgsql;
```

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

### Dashboard Summary
```
GET /api/dashboard/summary
Query Parameters:
- startDate: ISO date string
- endDate: ISO date string
- compareStartDate: ISO date string (optional)
- compareEndDate: ISO date string (optional)
```

**Response Structure**:
```typescript
interface DashboardSummary {
  period: {
    startDate: string;
    endDate: string;
  };
  kpis: {
    revenue: RevenueKPIs;
    bookings: BookingKPIs;
    customers: CustomerKPIs;
  };
  comparison?: {
    period: DateRange;
    kpis: KPIMetrics;
  };
}
```

### Chart Data
```
GET /api/dashboard/charts
Query Parameters:
- startDate: ISO date string
- endDate: ISO date string
- chartType: 'revenue' | 'utilization' | 'categories' | 'customers' | 'payments'
```

**Response Structure**:
```typescript
interface ChartDataResponse {
  chartType: string;
  data: ChartDataPoint[];
  metadata: {
    total: number;
    period: DateRange;
    lastUpdated: string;
  };
}
```

### Flexible Analytics
```
POST /api/sales/flexible-analytics
Request Body:
{
  "dateRange": { "start": "2025-01-01", "end": "2025-01-31" },
  "metrics": ["revenue", "bookings", "customers"],
  "groupBy": "day" | "week" | "month",
  "filters": {
    "bay": ["bay1", "bay2"],
    "bookingType": ["individual", "group"]
  }
}
```

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