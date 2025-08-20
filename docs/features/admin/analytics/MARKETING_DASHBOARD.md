# Marketing Dashboard Documentation

## Overview

The Marketing Dashboard is a comprehensive analytics feature that provides unified insights into Google Ads and Meta Ads campaign performance, customer acquisition metrics, and return on ad spend (ROAS) calculations. This admin-level feature combines data from multiple advertising platforms with actual revenue data to deliver actionable marketing insights.

**Location**: `/admin/marketing-dashboard`  
**Access Level**: Admin users only  
**Primary Purpose**: Unified marketing analytics with cross-platform performance tracking and ROAS calculation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Features](#key-features)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Component Architecture](#component-architecture)
6. [Data Flow & Processing](#data-flow--processing)
7. [User Interface](#user-interface)
8. [Performance & Caching](#performance--caching)
9. [Implementation Details](#implementation-details)
10. [Testing & Development](#testing--development)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Components

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Marketing Data    │    │  Referral Analytics │    │   POS Sales Data    │
│   (External ETL)    │────│     (Customer       │────│   (Revenue for      │
│                     │    │    Acquisition)     │    │     ROAS calc)      │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        marketing.daily_marketing_metrics                    │
│                              (Unified View)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Marketing Overview │    │ Performance Table   │    │  Analytics Charts   │
│    API Endpoint     │    │    API Endpoint     │    │    API Endpoint     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Marketing Dashboard Components                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐              │
│  │   KPI Cards     │ │ Performance     │ │   Analytics     │              │
│  │                 │ │     Table       │ │    Charts       │              │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Components**: Custom React components with shadcn/ui
- **Data Layer**: Supabase PostgreSQL with marketing schema
- **Caching**: Custom hook-based caching (5-minute TTL)
- **Charts**: Custom chart components with responsive design

---

## Key Features

### 1. KPI Cards Dashboard
- **Total Spend**: Combined Google Ads + Meta Ads spend with platform breakdown
- **Impressions & Clicks**: Cross-platform metrics with trend indicators
- **Click-Through Rate (CTR)**: Platform-specific and average CTR calculations
- **New Customer Acquisition**: Tracked via referral analytics integration
- **Customer Acquisition Cost (CAC)**: Spend divided by new customers acquired
- **Return on Ad Spend (ROAS)**: Revenue from POS sales divided by ad spend
- **Gross Profit**: Total profit generated in the period

### 2. Performance Table
- **Weekly Analysis**: Last 12 weeks of performance data
- **Monthly Analysis**: MTD (Month-To-Date), M-1, M-2 comparisons
- **4-Week Average Comparisons**: Percentage change vs rolling averages
- **Week-over-Week Trends**: Spend and conversion changes
- **Export Functionality**: CSV export of all performance data

### 3. Analytics Charts
- **Spend Trends**: Time-series visualization of ad spend patterns
- **Platform Comparisons**: Google Ads vs Meta Ads performance
- **Conversion Funnels**: Impressions → Clicks → Customers journey
- **CAC Trends**: Customer acquisition cost over time
- **ROAS by Platform**: Platform-specific return on ad spend

### 4. Date-Based Calculations
- **Reference Date Logic**: All calculations relative to selected date (defaults to yesterday)
- **Period Comparisons**: Current vs comparison period percentage changes
- **MTD Calculations**: Partial month data vs full historical months
- **Real-time Data**: Updates reflect latest available campaign data

---

## Database Schema

### Core Tables

#### marketing.google_ads_campaign_performance
```sql
- date (date): Campaign performance date
- impressions (bigint): Total impressions
- clicks (bigint): Total clicks  
- cost_micros (bigint): Cost in micros (÷1,000,000 for actual cost)
- conversions (numeric): Conversion count
- ctr (double precision): Click-through rate percentage
```

#### marketing.meta_ads_campaign_performance
```sql
- date (date): Campaign performance date
- impressions (bigint): Total impressions
- clicks (bigint): Total clicks
- spend_cents (bigint): Spend in cents (÷100 for actual cost)
- conversions (numeric): Conversion count
- ctr (double precision): Click-through rate percentage
```

### Unified View

#### marketing.daily_marketing_metrics (View)
```sql
- date (date): Performance date
- google_impressions, google_clicks, google_spend: Google Ads metrics
- meta_impressions, meta_clicks, meta_spend: Meta Ads metrics  
- total_impressions, total_clicks, total_spend: Combined metrics
- google_new_customers, meta_new_customers, total_new_customers: Customer acquisition
- daily_revenue, daily_revenue_net, daily_gross_profit: Revenue integration
- cac, roas: Calculated performance metrics
```

### Integration Tables

#### public.referral_data (Customer Acquisition)
```sql
- date (date): Acquisition date
- referral_source (text): 'Google', 'Facebook', 'Instagram'
- count (integer): Number of customers acquired
```

#### Revenue Integration
- **Function**: `get_marketing_total_revenue(p_start_date, p_end_date)`
- **Source**: `pos.lengolf_sales` table
- **Returns**: `total_revenue`, `total_profit` for ROAS calculations

---

## API Endpoints

### 1. Marketing Overview API

**Endpoint**: `GET /api/marketing/overview`

**Query Parameters**:
- `days` (integer): Analysis period length (default: 30)
- `comparisonDays` (integer): Comparison period length (default: 30)

**Response Structure**:
```typescript
interface MarketingKPIs {
  totalSpend: number;
  totalSpendChange: number;
  totalImpressions: number;
  totalImpressionsChange: number;
  totalClicks: number;
  totalClicksChange: number;
  averageCtr: number;
  averageCtrChange: number;
  totalNewCustomers: number;
  totalNewCustomersChange: number;
  cac: number;
  cacChange: number;
  roas: number;
  roasChange: number;
  customerLifetimeValue: number; // Actually gross profit
  customerLifetimeValueChange: number;
  googleSpend: number;
  metaSpend: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
}
```

**Date Logic**:
- **Current Period**: (yesterday - days + 1) to yesterday
- **Comparison Period**: Previous period of same length
- **Excludes Today**: Ensures complete day data only

### 2. Performance Table API

**Endpoint**: `GET /api/marketing/performance`

**Query Parameters**:
- `weeks` (integer): Number of weeks to analyze (default: 12)
- `format` (string): 'weekly' or 'monthly'
- `referenceDate` (string): Custom reference date (defaults to yesterday)

**Weekly Response**:
```typescript
interface WeeklyPerformance {
  period: string; // "2024-W32" format
  weekStart: string; // Monday
  weekEnd: string; // Sunday
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  // ... (impressions, clicks, CTR metrics)
  totalNewCustomers: number;
  cac: number;
  roas: number;
  weekOverWeekSpendChange: number;
  weekOverWeekNewCustomersChange: number;
}
```

**Monthly Response**:
```typescript
interface MonthlyPerformance {
  period: string; // "MTD", "M-1", "M-2"
  monthStart: string;
  monthEnd: string;
  // ... (same metrics as weekly)
  cac: number;
  roas: number;
}
```

### 3. Charts Data API

**Endpoint**: `GET /api/marketing/charts`

**Query Parameters**:
- `days` (integer): Analysis period (default: 30)

**Response Structure**:
```typescript
interface ChartData {
  spendTrend: any[]; // Time-series spend data
  platformComparison: any[]; // Google vs Meta comparison
  conversionFunnel: any[]; // Impressions → Clicks → Customers
  cacTrend: any[]; // CAC over time
  roasByPlatform: any[]; // Platform-specific ROAS
}
```

---

## Component Architecture

### 1. Main Dashboard Component

**File**: `app/admin/marketing-dashboard/page.tsx`

**Key Features**:
- Tabbed interface (Overview, Performance Table, Analytics)
- Time range selection (7, 30, 60, 90 days)
- Manual refresh with loading states
- Export functionality
- Responsive design with mobile optimization

```typescript
export default function MarketingDashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [timeRange, setTimeRange] = useState<string>('30');
  
  const {
    data: { kpis, performance, monthlyPerformance, charts },
    isLoading,
    isValidating: isRefreshing,
    refresh
  } = useMarketingDashboard({ timeRange });
  
  // ... component implementation
}
```

### 2. KPI Cards Component

**File**: `src/components/marketing-dashboard/MarketingKPICards.tsx`

**Features**:
- 8 key performance indicators
- Trend indicators with color coding
- Platform-specific breakdowns (Google vs Meta)
- Thai Baht currency formatting
- Responsive grid layout

**KPI Cards**:
1. **Total Spend**: Combined ad spend with platform breakdown
2. **Total Impressions**: Cross-platform impression count
3. **Total Clicks**: Cross-platform click count
4. **Average CTR**: Weighted average click-through rate
5. **New Customers**: Customer acquisition with platform attribution
6. **CAC**: Customer acquisition cost (inverse trend indicators)
7. **ROAS**: Return on ad spend with revenue integration
8. **Gross Profit**: Total profit generated in period

### 3. Performance Table Component

**File**: `src/components/marketing-dashboard/MarketingPerformanceTable.tsx`

**Features**:
- **Weekly View**: Last 12 weeks performance
- **Monthly View**: MTD, M-1, M-2 comparisons
- **4-Week Average**: Percentage comparisons vs rolling average
- **Responsive Design**: Mobile-optimized table with horizontal scroll
- **Export Support**: CSV export functionality
- **Sort Functionality**: Click to sort by any metric

**Table Columns**:
- Period & Date Range
- Google/Meta/Total Spend
- Impressions & Clicks
- CTR by Platform
- New Customers by Platform
- CAC & ROAS
- Week-over-Week Changes

### 4. Analytics Charts Component

**File**: `src/components/marketing-dashboard/MarketingCharts.tsx`

**Chart Types**:
- **Spend Trends**: Line chart showing daily/weekly spend patterns
- **Platform Comparison**: Bar chart comparing Google Ads vs Meta Ads
- **Conversion Funnel**: Multi-step funnel from impressions to customers
- **CAC Trends**: Line chart showing customer acquisition cost over time
- **ROAS by Platform**: Comparative return on ad spend analysis

---

## Data Flow & Processing

### 1. Data Source Integration

```
External ETL → marketing.google_ads_campaign_performance
External ETL → marketing.meta_ads_campaign_performance
Referral System → public.referral_data
POS System → pos.lengolf_sales
                ↓
        daily_marketing_metrics (View)
                ↓
        Marketing Dashboard APIs
                ↓
        React Components
```

### 2. Date-Based Calculations

**Reference Date Logic**:
- Default reference date: Yesterday (ensures complete day data)
- All periods calculated relative to reference date
- Comparison periods: Same length, immediately preceding current period

**Example with 30-day analysis**:
```
Today: 2024-08-20
Reference Date: 2024-08-19 (yesterday)
Current Period: 2024-07-21 to 2024-08-19 (30 days)
Comparison Period: 2024-06-21 to 2024-07-20 (30 days)
```

### 3. Metric Calculations

**Customer Acquisition Cost (CAC)**:
```
CAC = Total Ad Spend ÷ New Customers Acquired
```

**Return on Ad Spend (ROAS)**:
```
ROAS = Total Revenue ÷ Total Ad Spend
```

**Week-over-Week Changes**:
```
Change % = ((Current Week - Previous Week) ÷ Previous Week) × 100
```

**Monthly Comparisons**:
- **MTD**: Partial month data (1st to reference date)
- **M-1**: Complete previous month
- **M-2**: Complete month two months ago
- **4-Week Average**: Rolling average with percentage comparisons

---

## User Interface

### 1. Dashboard Layout

**Header Section**:
- Page title with marketing target icon
- Date range badge showing current analysis period
- Refresh status indicator
- Cached data indicator

**Control Section**:
- Time range selector (7, 30, 60, 90 days)
- Export button (CSV download)
- Manual refresh button

**Tab Navigation**:
- Overview: KPI cards and quick summary
- Performance Table: Detailed weekly/monthly data
- Analytics & Charts: Visual data analysis

### 2. Responsive Design

**Desktop (lg+)**:
- KPI cards in 4-column grid
- Full-width performance table
- Side-by-side chart layout

**Tablet (md)**:
- KPI cards in 2-column grid
- Horizontally scrollable table
- Stacked chart layout

**Mobile (sm)**:
- KPI cards in single column
- Horizontally scrollable table with sticky headers
- Vertically stacked charts

### 3. Loading States

**Initial Load**:
- Skeleton placeholders for KPI cards
- Loading spinner for table data
- Progressive chart rendering

**Refresh States**:
- Spinning refresh icon
- "Updating..." badge
- Disabled controls during refresh

---

## Performance & Caching

### 1. Custom Caching System

**Implementation**: `useMarketingDashboard` hook with `SimpleCache` class

**Cache Configuration**:
- **TTL**: 5 minutes for all endpoints
- **Scope**: Per time range (separate cache keys)
- **Storage**: In-memory Map with timestamp validation
- **Invalidation**: Manual refresh clears relevant cache entries

**Cache Keys**:
```typescript
const cacheKeys = {
  kpis: `marketing-kpis-${timeRange}`,
  performance: `marketing-performance-${timeRange}`,
  monthlyPerformance: `marketing-monthly-performance-${timeRange}`,
  charts: `marketing-charts-${timeRange}`
};
```

### 2. Data Loading Strategy

**Parallel Fetch**:
```typescript
const [kpis, performance, monthlyPerformance, charts] = await Promise.all([
  fetchKPIs(),
  fetchPerformance(),
  fetchMonthlyPerformance(),
  fetchCharts()
]);
```

**Cache-First Approach**:
1. Check cache for all required data
2. If cache hit: Return cached data immediately
3. If cache miss: Fetch from API and cache results
4. Manual refresh: Clear cache and fetch fresh data

### 3. Performance Optimizations

**Database Level**:
- `daily_marketing_metrics` view pre-aggregates complex joins
- Indexed date columns for efficient range queries
- Materialized view candidates for heavy calculations

**Frontend Level**:
- Component-level memoization with `React.memo`
- Selective re-renders based on data dependencies
- Progressive loading with skeleton states
- Debounced refresh actions

---

## Implementation Details

### 1. Hook-Based Data Management

**File**: `src/hooks/useMarketingDashboard.ts`

**Features**:
- Unified data fetching for all dashboard components
- Automatic cache management with TTL
- Loading and error state management
- Manual refresh capability
- Type-safe interfaces for all data structures

**Usage**:
```typescript
const {
  data: { kpis, performance, monthlyPerformance, charts },
  isLoading,
  isValidating,
  refresh
} = useMarketingDashboard({
  timeRange: '30',
  refreshInterval: 0, // Manual refresh only
  enabled: true
});
```

### 2. ROAS Integration Architecture

**Revenue Data Source**: 
- Table: `pos.lengolf_sales`
- Function: `get_marketing_total_revenue(start_date, end_date)`
- Returns: `total_revenue`, `total_profit`

**ROAS Calculation**:
```typescript
const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
```

**Integration Points**:
- Overview API: Period-based revenue aggregation
- Performance API: Daily revenue integration via `daily_marketing_metrics` view
- Real-time updates: Revenue data reflects in next cache refresh

### 3. Error Handling

**API Level**:
```typescript
try {
  const response = await fetch('/api/marketing/overview');
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  return await response.json();
} catch (error) {
  console.error('API Error:', error);
  throw error;
}
```

**Component Level**:
- Graceful degradation with error boundaries
- User-friendly error messages
- Retry mechanisms for transient failures
- Fallback to cached data when possible

---

## Testing & Development

### 1. Development Setup

**Environment Variables**:
```bash
NEXT_PUBLIC_REFAC_SUPABASE_URL=your_supabase_url
REFAC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SKIP_AUTH=true # For development authentication bypass
```

**Local Testing**:
```bash
npm run dev # Start development server
# Navigate to http://localhost:3000/admin/marketing-dashboard
```

### 2. API Testing

**Using curl**:
```bash
# Get development token
TOKEN=$(curl -s http://localhost:3000/api/dev-token | jq -r '.token')

# Test overview endpoint
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/marketing/overview?days=30"

# Test performance endpoint
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/marketing/performance?weeks=12"

# Test charts endpoint
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/marketing/charts?days=30"
```

### 3. Data Validation

**Database Queries**:
```sql
-- Verify daily metrics view
SELECT * FROM marketing.daily_marketing_metrics 
WHERE date >= '2024-07-01' 
ORDER BY date DESC LIMIT 10;

-- Check revenue integration
SELECT * FROM get_marketing_total_revenue('2024-08-01', '2024-08-19');

-- Validate customer acquisition data
SELECT * FROM referral_data 
WHERE referral_source IN ('Google', 'Facebook', 'Instagram')
AND date >= '2024-08-01';
```

### 4. Component Testing

**Manual Testing Checklist**:
- [ ] KPI cards display correct values and trends
- [ ] Performance table shows weekly/monthly data
- [ ] Charts render without errors
- [ ] Export functionality works
- [ ] Mobile responsive design
- [ ] Loading states appear appropriately
- [ ] Manual refresh updates data
- [ ] Cache system prevents unnecessary requests

---

## Troubleshooting

### Common Issues

#### 1. "No data available" or empty dashboard

**Symptoms**: Dashboard loads but shows no metrics or zero values

**Possible Causes**:
- Marketing data not populated by ETL
- Date range extends beyond available data
- Database schema permissions

**Solutions**:
```sql
-- Check if marketing tables have recent data
SELECT COUNT(*), MAX(date) FROM marketing.google_ads_campaign_performance;
SELECT COUNT(*), MAX(date) FROM marketing.meta_ads_campaign_performance;

-- Verify daily_marketing_metrics view
SELECT * FROM marketing.daily_marketing_metrics 
WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- Check referral data for customer acquisition
SELECT * FROM referral_data 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
AND referral_source IN ('Google', 'Facebook', 'Instagram');
```

#### 2. ROAS calculations showing as 0 or incorrect values

**Symptoms**: ROAS metrics display 0.0x or unrealistic values

**Possible Causes**:
- Revenue function not returning data
- POS sales data missing for date range
- Currency conversion issues

**Solutions**:
```sql
-- Test revenue function directly
SELECT * FROM get_marketing_total_revenue('2024-08-01', '2024-08-19');

-- Check POS sales data availability
SELECT COUNT(*), SUM(total_amount) FROM pos.lengolf_sales 
WHERE transaction_date >= '2024-08-01' 
AND transaction_date <= '2024-08-19';

-- Verify revenue integration in daily metrics
SELECT date, daily_revenue, total_spend, roas 
FROM marketing.daily_marketing_metrics 
WHERE date >= '2024-08-01' 
ORDER BY date DESC;
```

#### 3. Performance table showing incorrect percentage changes

**Symptoms**: 4-week average columns show unrealistic percentage values

**Possible Causes**:
- Calculation logic errors in weekly aggregation
- Missing data for comparison periods
- Week boundary calculation issues

**Solutions**:
- Verify week start/end date calculations
- Check for complete data in comparison periods
- Review percentage change calculation logic

#### 4. Dashboard extremely slow to load

**Symptoms**: Long loading times, timeouts, or poor performance

**Possible Causes**:
- Database query performance issues
- Large data volume without proper indexing
- Cache not working effectively

**Solutions**:
```sql
-- Check query performance
EXPLAIN ANALYZE 
SELECT * FROM marketing.daily_marketing_metrics 
WHERE date >= '2024-07-01' 
ORDER BY date DESC;

-- Verify indexes on date columns
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'marketing' 
AND tablename LIKE '%performance';
```

#### 5. Charts not rendering or showing errors

**Symptoms**: Chart components fail to load or display errors

**Possible Causes**:
- Chart data format issues
- Component rendering errors
- Browser compatibility issues

**Solutions**:
- Check browser console for JavaScript errors
- Verify chart data structure matches expected format
- Test with different browsers and screen sizes

### Debug Mode

Enable additional logging in development:

```typescript
// In API routes
if (process.env.NODE_ENV === 'development') {
  console.log('Marketing API Debug:', {
    timeRange,
    currentPeriodStart,
    comparisonPeriodStart,
    googleData: googleCurrent?.length,
    metaData: metaCurrent?.length
  });
}

// In components  
if (process.env.NODE_ENV === 'development') {
  console.log('Dashboard Data:', { kpis, performance: performance.length });
}
```

### Database Schema Validation

```sql
-- Ensure marketing schema exists and has proper permissions
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name = 'marketing';

-- Check that all required tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'marketing' 
AND table_name IN (
  'google_ads_campaign_performance',
  'meta_ads_campaign_performance', 
  'daily_marketing_metrics'
);

-- Verify daily_marketing_metrics view definition
SELECT definition 
FROM pg_views 
WHERE schemaname = 'marketing' 
AND viewname = 'daily_marketing_metrics';
```

---

## Future Enhancements

### Planned Features
1. **Real-time Data Updates**: WebSocket integration for live metrics
2. **Advanced Filtering**: Campaign-specific, demographic, and geographic filters
3. **Automated Alerts**: Threshold-based performance notifications
4. **Competitor Analysis**: Integration with social media competitor tracking
5. **Attribution Modeling**: Multi-touch attribution for customer journeys
6. **Budget Recommendations**: AI-powered spending optimization suggestions

### Technical Improvements
1. **Materialized Views**: Pre-computed aggregations for better performance
2. **Data Warehouse Integration**: BigQuery connector for advanced analytics
3. **Enhanced Caching**: Redis integration for shared cache across instances
4. **Advanced Charts**: Interactive charts with drill-down capabilities
5. **Export Enhancement**: PDF reports and scheduled email delivery

---

## Conclusion

The Marketing Dashboard provides a comprehensive, unified view of cross-platform advertising performance with integrated revenue tracking. Its architecture emphasizes performance, maintainability, and user experience while providing actionable insights for marketing decision-making.

Key architectural decisions include the use of a unified database view, intelligent caching, and a component-based architecture that supports both detailed analysis and high-level overview needs. The integration with actual revenue data through ROAS calculations provides meaningful ROI insights that connect advertising spend directly to business outcomes.

The system is designed to scale with additional platforms and metrics while maintaining performance and usability across desktop and mobile devices.