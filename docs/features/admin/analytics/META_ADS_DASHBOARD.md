# Meta Ads Dashboard

**Complete Meta Ads (Facebook & Instagram) analytics and performance monitoring system with intelligent creative optimization and objective-based performance scoring.**

## Overview

The Meta Ads Dashboard is a comprehensive analytics platform for monitoring Facebook and Instagram advertising performance within the Lengolf Forms golf academy management system. It provides real-time insights, intelligent performance scoring, and creative optimization recommendations to maximize advertising ROI.

### Key Features

- **📊 Smart Performance Analytics** - Objective-based scoring algorithm that evaluates creatives based on campaign goals
- **🎨 Creative Performance Gallery** - Visual gallery with performance scores and efficiency ratings  
- **📱 Multi-Platform Tracking** - Combined Facebook and Instagram analytics with platform breakdown
- **📅 Creative Calendar** - Timeline view of creative launches and performance trends
- **🚀 Campaign Management** - Detailed campaign performance tracking and optimization insights
- **⚡ Real-time Data** - Live data from Meta Marketing API with manual refresh capability

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                Meta Ads Dashboard Architecture              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend Layer (React/Next.js)                           │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │  Overview   │ Campaigns   │ Creatives   │  Calendar   │  │
│  │     Tab     │     Tab     │     Tab     │     Tab     │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
│              │                                              │
│              ▼                                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │           useMetaAdsDashboard Hook                      │  │
│  │  • State management                                     │  │
│  │  • Data fetching                                        │  │
│  │  • Auto-refresh                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│              │                                              │
│              ▼                                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                API Layer                                │  │
│  │  /api/meta-ads/overview-metrics                        │  │
│  │  /api/meta-ads/campaigns                               │  │
│  │  /api/meta-ads/creatives                               │  │
│  │  /api/meta-ads/performance-chart                       │  │
│  │  /api/meta-ads/calendar                                │  │
│  └─────────────────────────────────────────────────────────┘  │
│              │                                              │
│              ▼                                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Database Layer                             │  │
│  │  marketing.meta_ads_campaign_performance               │  │
│  │  marketing.meta_ads_creative_performance               │  │
│  │  marketing.meta_ads_campaigns                          │  │
│  │  marketing.ad_creative_assets                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│              │                                              │
│              ▼                                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │         Smart Performance Engine                        │  │
│  │  • Objective-based scoring (TRAFFIC, ENGAGEMENT, SALES) │  │
│  │  • Creative performance optimization                    │  │
│  │  • Industry benchmark comparisons                       │  │
│  │  • Efficiency ratings (Excellent/Good/Average/Needs)    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

- **Frontend**: React 18, Next.js 14, TypeScript
- **UI Framework**: Tailwind CSS, Shadcn/ui components
- **State Management**: React hooks (useState, useEffect, useCallback)
- **Data Fetching**: Custom React hook with SWR-like patterns
- **Database**: Supabase PostgreSQL with marketing schema
- **API**: Next.js API routes with TypeScript
- **Authentication**: NextAuth.js with development bypass

---

## Navigation & Access

### URL Structure
```
/admin/meta-ads-dashboard
├── ?tab=overview       (default)
├── ?tab=campaigns      
├── ?tab=creatives      
└── ?tab=calendar       
```

### Access Requirements
- **Role**: Admin access required
- **Permissions**: Administrative dashboard access
- **Authentication**: NextAuth.js session or development bypass

### Navigation Flow
```
Marketing Dashboard → Meta Ads Dashboard
/admin/marketing-dashboard → /admin/meta-ads-dashboard
```

---

## Dashboard Tabs

### 1. Overview Tab (Default)

**Purpose**: High-level performance metrics and key insights

**Components**:
- **KPI Cards Section** - 8 key performance indicators with trend arrows
- **Platform Breakdown** - Facebook vs Instagram performance comparison  
- **Performance Chart** - Time-series visualization of key metrics

**Key Metrics**:
```typescript
interface MetaAdsKPIs {
  totalSpend: number;           // Total ad spend in THB
  metaBookings: number;         // Bookings attributed to Meta ads
  totalImpressions: number;     // Total ad impressions
  totalClicks: number;          // Total ad clicks
  averageCtr: number;           // Click-through rate
  conversions: number;          // Conversion events
  costPerBooking: number;       // Cost per booking (THB)
  costPerConversion: number;    // Cost per conversion (THB)
  
  // Trend indicators (period-over-period)
  spendChange: number;          // % change in spend
  bookingsChange: number;       // % change in bookings
  impressionsChange: number;    // % change in impressions
  clicksChange: number;         // % change in clicks
  ctrChange: number;           // % change in CTR
  conversionsChange: number;    // % change in conversions
  costPerBookingChange: number; // % change in cost per booking
  costPerConversionChange: number; // % change in cost per conversion
}
```

### 2. Campaigns Tab ⭐

**Purpose**: Comprehensive campaign-level performance analysis with advanced breakdown functionality

**Key Components**:
1. **Performance Breakdown Table** - Multi-period campaign analysis with hierarchical data structure
2. **Campaign Overview Table** - Traditional campaign listing with basic metrics

#### Performance Breakdown Table (Primary Feature)

**Advanced Multi-Period Analysis**:
- **Weekly Performance**: Current Week, Previous Week, 3W Ago, 4W Ago, 5W Ago
- **Monthly Performance**: Month-to-Date (MTD), Last Month, 2 Months Ago  
- **Comparison Columns**: "vs 4W Avg" for weekly trends, "M-1 vs M-2" for monthly comparisons
- **Trend Analysis**: Color-coded arrows showing performance improvements/declines

**Hierarchical Data Structure**:
```typescript
interface CampaignPerformanceData {
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  objective: string;
  
  // Weekly metrics (8 time periods)
  spend_current: number;        // Current week
  spend_previous: number;       // Previous week
  spend_3w_ago: number;         // 3 weeks ago
  spend_4w_ago: number;         // 4 weeks ago
  spend_5w_ago: number;         // 5 weeks ago
  spend_mtd: number;            // Month to date
  spend_last_month: number;     // Last complete month
  spend_2_months_ago: number;   // 2 months ago
  
  // Parallel structures for impressions, clicks, leads, etc.
  impressions_current: number;
  clicks_current: number;
  leads_current: number;
  cpc_current: number;
  cpm_current: number;
  cost_per_lead_current: number;
  // ... (same pattern for all time periods)
}
```

**Smart Trend Analysis**:
- **4-Week Average Comparison**: `(Previous Week - 4W Average) / 4W Average * 100`
- **Monthly Comparison**: `(Last Month - 2 Months Ago) / 2 Months Ago * 100`
- **Cost Metric Inversion**: Lower costs show green (good), higher costs show red (bad)
- **Performance Color Coding**:
  ```typescript
  // Standard metrics (higher = better)
  const getTrendColor = (change: number): string => {
    if (change > 10) return 'text-green-600';   // Good improvement
    if (change < -10) return 'text-red-600';    // Poor decline
    return 'text-gray-600';                     // Neutral
  };
  
  // Cost metrics (lower = better) 
  const getCostTrendColor = (change: number): string => {
    if (change > 10) return 'text-red-600';     // Higher cost = bad
    if (change < -10) return 'text-green-600';  // Lower cost = good
    return 'text-gray-600';
  };
  ```

**Table Features**:
- **Aggregated Totals Row** - Shows sum/weighted averages across all campaigns
- **Individual Campaign Rows** - Detailed breakdown per campaign
- **Sortable Columns** - Click any metric to sort campaigns by performance
- **Export Functionality** - Download performance data (planned)
- **Visual Hierarchy** - Clear separation between totals and individual campaigns

### 3. Creative Performance Tab ⭐

**Purpose**: Smart creative performance analysis with objective-based scoring

**Key Innovation**: **Objective-Based Performance Scoring**
- Replaces generic booking estimates with intelligent KPIs
- Adapts metrics based on campaign objectives
- Provides actionable optimization insights

**Smart Performance Algorithm**:
```typescript
// TRAFFIC Campaigns (CTR + CPC Focus)
performance_score = MIN(100, MAX(0,
  (avg_ctr * 3000) + // CTR component (0-60 points)
  (cpc_efficiency_score) // CPC component (0-40 points)
))

// ENGAGEMENT Campaigns (CTR + CPM Focus)  
performance_score = MIN(100, MAX(0,
  (avg_ctr * 3500) + // CTR component (0-70 points)
  (cpm_efficiency_score) // CPM component (0-30 points)
))

// SALES/LEADS Campaigns (Conversion Focus)
performance_score = MIN(100, MAX(0,
  (conversion_rate * 7000) + // Conversion component (0-70 points)
  (cost_per_conversion_efficiency) // Cost efficiency (0-30 points)
))
```

**Efficiency Ratings**:
- **🟢 Excellent** (80-100): Top performing creatives
- **🔵 Good** (60-79): Well performing creatives  
- **🟡 Average** (40-59): Standard performance
- **🔴 Needs Review** (0-39): Underperforming creatives

**Gallery Features**:
- Visual creative thumbnails with performance overlays
- Performance score bars with color-coded indicators
- Objective-specific KPI displays (CPC, CPM, Conversion Rate)
- Efficiency rating badges
- Sorting by performance score or total spend
- Real Thai creative names (not "Unknown Creative")

### 4. Creative Calendar Tab

**Purpose**: Timeline visualization of creative launches and performance evolution

**Features**:
- Calendar view of creative launch dates
- Performance trends over time
- Creative lifecycle analysis
- Launch date optimization insights

---

## Smart Performance Engine

### Objective-Based Scoring System

The Meta Ads Dashboard features an advanced performance scoring system that evaluates creatives based on their specific campaign objectives, providing more accurate and actionable insights than generic metrics.

#### Campaign Objectives Supported

1. **OUTCOME_TRAFFIC**
   - **Primary KPI**: Cost Per Click (CPC)
   - **Secondary KPI**: Click-Through Rate (CTR)
   - **Benchmark**: Good CPC < ฿50, Excellent CTR > 2%
   - **Use Case**: Drive website traffic and awareness

2. **OUTCOME_ENGAGEMENT**  
   - **Primary KPI**: Cost Per Thousand Impressions (CPM)
   - **Secondary KPI**: Click-Through Rate (CTR)
   - **Benchmark**: Good CPM < ฿100, Excellent CTR > 2%
   - **Use Case**: Maximize engagement and social interactions

3. **OUTCOME_SALES / OUTCOME_LEADS**
   - **Primary KPI**: Conversion Rate
   - **Secondary KPI**: Cost Per Conversion
   - **Benchmark**: Good conversion rate > 1%, Cost per conversion < ฿200
   - **Use Case**: Drive bookings and sales

#### Performance Score Calculation

The performance score is calculated on a 0-100 scale using objective-specific algorithms:

```sql
-- Example: ENGAGEMENT Campaign Scoring
CASE 
  WHEN campaign_objective = 'OUTCOME_ENGAGEMENT' THEN
    LEAST(100, GREATEST(0,
      -- CTR component (0-70 points): Engagement focuses heavily on CTR
      (avg_ctr * 3500) +
      -- CPM component (0-30 points): Good CPM is under ฿100 (10000 cents)  
      CASE WHEN avg_cpm_cents > 0 AND avg_cpm_cents < 20000 
           THEN 30 - (avg_cpm_cents / 667) ELSE 0 END
    ))
END
```

#### Industry Benchmarks (2025)

Based on Meta advertising industry standards:

| Objective | Good CTR | Excellent CTR | Good CPC | Good CPM | Good Conv. Rate |
|-----------|----------|---------------|----------|----------|----------------|
| TRAFFIC   | 0.5%+    | 2.0%+        | <฿50     | -        | -              |
| ENGAGEMENT| 0.7%+    | 2.0%+        | -        | <฿100    | -              |
| SALES     | 1.0%+    | 3.0%+        | -        | -        | 1.0%+          |
| LEADS     | 1.2%+    | 3.5%+        | -        | -        | 2.0%+          |

---

## API Endpoints

### Core API Routes

#### 1. Overview Metrics
```typescript
GET /api/meta-ads/overview-metrics?days={timeRange}&referenceDate={date}

Response: MetaAdsKPIs {
  totalSpend: number;
  metaBookings: number; 
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  conversions: number;
  costPerBooking: number;
  costPerConversion: number;
  
  // Platform breakdown
  facebookSpend: number;
  instagramSpend: number;
  facebookBookings: number;
  instagramBookings: number;
  
  // Trend indicators
  spendChange: number;
  bookingsChange: number;
  impressionsChange: number;
  clicksChange: number;
  ctrChange: number;
}
```

#### 2. Creative Performance (Smart Metrics)
```typescript
GET /api/meta-ads/creatives?days={timeRange}&sortBy={metric}&creativeType={type}&limit={number}

Response: {
  creatives: CreativePerformance[];
  total: number;
  has_more: boolean;
  summary: {
    total_creatives: number;
    total_spend: number;
    total_conversions: number;
    average_performance_score: number;
    excellent_creatives: number;
    good_creatives: number;
    needs_review_creatives: number;
  }
}

interface CreativePerformance {
  creative_id: string;
  creative_name: string;           // Real Thai names
  creative_type: string;
  thumbnail_url?: string;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  average_ctr: number;
  total_conversions: number;
  conversion_rate: number;
  
  // Smart performance metrics
  performance_score: number;       // 0-100 objective-based score
  efficiency_rating: string;       // Excellent/Good/Average/Needs Review
  objective_kpi_value: number;     // Campaign-specific KPI value
  objective_kpi_label: string;     // "Avg CPC" | "Avg CPM" | "Conversion Rate"
  
  campaign_info: {
    campaign_name: string;
    campaign_objective: string;    // OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, etc.
  };
}
```

#### 3. Campaign Performance (Traditional)
```typescript
GET /api/meta-ads/campaigns?days={timeRange}&sortBy={metric}&limit={number}

Response: {
  campaigns: CampaignPerformance[];
  total: number;
  has_more: boolean;
}
```

#### 4. Campaign Performance Breakdown (New) ⭐
```typescript
GET /api/meta-ads/campaigns/detailed-weekly?referenceDate={date}&sortBy={metric}&sortOrder={asc|desc}

Response: {
  campaigns: CampaignPerformanceData[];
  meta: {
    total: number;
    periods: {
      current_week: string;        // "2025-08-25 to 2025-08-31" 
      previous_week: string;       // "2025-08-18 to 2025-08-24"
      weeks_3_ago: string;         // "2025-08-11 to 2025-08-17"
      weeks_4_ago: string;         // "2025-08-04 to 2025-08-10"
      weeks_5_ago: string;         // "2025-07-28 to 2025-08-03"
      mtd: string;                 // "2025-09-01 to 2025-09-05"
      last_month: string;          // "2025-08-01 to 2025-08-31"
      two_months_ago: string;      // "2025-07-01 to 2025-07-31"
    }
  }
}

interface CampaignPerformanceData {
  campaign_id: string;
  campaign_name: string; 
  campaign_status: string;
  objective: string;
  
  // Spend metrics across 8 time periods
  spend_current: number;
  spend_previous: number;
  spend_3w_ago: number;
  spend_4w_ago: number; 
  spend_5w_ago: number;
  spend_mtd: number;
  spend_last_month: number;
  spend_2_months_ago: number;
  
  // Impressions, clicks, leads, CPC, CPM, cost per lead
  // Follow same pattern for all time periods
  impressions_current: number;
  clicks_current: number;
  leads_current: number;
  cpc_current: number;           // In THB (cents converted to currency)
  cpm_current: number;           // In THB (cents converted to currency)
  cost_per_lead_current: number; // In THB
  // ... (parallel structures for all 8 periods)
}
```

**Key Features**:
- **8 Time Periods**: 5 weekly + 3 monthly periods for comprehensive analysis
- **Lead Attribution**: Maps leads from `processed_leads` table based on campaign type detection
- **Campaign Type Detection**: B2C vs B2B classification based on campaign names and objectives
- **Currency Conversion**: Automatic conversion from cents to THB for display
- **Aggregation Support**: Provides totals row data for dashboard visualization
- **Flexible Sorting**: Sort by any metric across any time period

#### 5. Performance Chart Data
```typescript
GET /api/meta-ads/performance-chart?days={timeRange}&referenceDate={date}&metric={type}

Response: {
  dates: string[];
  spend: number[];
  bookings: number[];
  impressions: number[];
  clicks: number[];
}
```

#### 6. Creative Calendar
```typescript
GET /api/meta-ads/calendar?days={timeRange}&referenceDate={date}

Response: {
  [date: string]: CreativeEvent[];
}
```

---

## Database Schema

### Marketing Schema Tables

The Meta Ads Dashboard utilizes the `marketing` schema with the following key tables:

#### 1. meta_ads_campaign_performance
```sql
TABLE marketing.meta_ads_campaign_performance (
  id integer PRIMARY KEY,
  campaign_id text NOT NULL,
  date date NOT NULL,
  impressions integer,
  clicks integer,
  spend_cents bigint,
  conversions numeric,
  conversion_value_cents bigint,
  ctr numeric,
  cpc_cents bigint,
  cpm_cents bigint,
  reach integer,
  frequency numeric,
  unique_clicks integer,
  cost_per_unique_click_cents bigint,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
```

#### 2. meta_ads_creative_performance
```sql
TABLE marketing.meta_ads_creative_performance (
  id integer PRIMARY KEY,
  creative_id text NOT NULL,
  ad_id text,
  adset_id text,
  campaign_id text,
  date date NOT NULL,
  impressions integer,
  clicks integer,
  spend_cents bigint,
  conversions numeric,
  conversion_value_cents bigint,
  ctr numeric,
  cpc_cents bigint,
  cpm_cents bigint,
  reach integer,
  frequency numeric,
  unique_clicks integer,
  cost_per_unique_click_cents bigint,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
```

#### 3. meta_ads_campaigns
```sql
TABLE marketing.meta_ads_campaigns (
  campaign_id text PRIMARY KEY,
  campaign_name text,
  campaign_status text,
  objective text,              -- OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, etc.
  buying_type text,
  bid_strategy text,
  daily_budget bigint,
  lifetime_budget bigint,
  budget_remaining bigint,
  spend_cap bigint,
  start_time timestamp with time zone,
  stop_time timestamp with time zone,
  created_time timestamp with time zone,
  updated_time timestamp with time zone,
  can_use_spend_cap boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
```

#### 4. ad_creative_assets
```sql
TABLE marketing.ad_creative_assets (
  asset_id uuid PRIMARY KEY,
  platform text,
  platform_asset_id text,
  ad_id text,                  -- Links to creative performance
  asset_type text,
  asset_url text,
  thumbnail_url text,
  preview_url text,
  width integer,
  height integer,
  file_size_bytes bigint,
  duration_seconds integer,
  mime_type text,
  approval_status text,
  policy_review_status text,
  text_content text,           -- Creative names/text
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  creative_id text,
  call_to_action_type text,
  link_url text
);
```

### Smart Performance RPC Function

#### get_meta_creative_performance()
```sql
CREATE OR REPLACE FUNCTION marketing.get_meta_creative_performance(
  start_date date,
  end_date date
)
RETURNS TABLE(
  creative_id text,
  creative_name text,
  creative_type text,
  -- ... performance metrics ...
  performance_score numeric,      -- 0-100 objective-based score
  efficiency_rating text,         -- Excellent/Good/Average/Needs Review
  objective_kpi_value numeric,    -- Campaign-specific KPI
  objective_kpi_label text        -- KPI label (CPC/CPM/Conversion Rate)
)
```

**Key Features**:
- **Aggregates by creative_id** - Eliminates duplicates across campaigns
- **Objective-based scoring** - Uses campaign objectives for intelligent scoring
- **Real creative names** - Joins with ad_creative_assets for actual creative text
- **Weighted averages** - Calculates impression-weighted CTR, CPM, CPC
- **Primary campaign selection** - Uses highest-spend campaign for objective determination

---

## Component Architecture

### Page Component
```typescript
// app/admin/meta-ads-dashboard/page.tsx
export default function MetaAdsDashboardPage() {
  // State management
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [timeRange, setTimeRange] = useState<string>('30');
  const [referenceDate, setReferenceDate] = useState<Date>();
  
  // Data fetching
  const { data, isLoading, refresh } = useMetaAdsDashboard({
    timeRange,
    referenceDate: referenceDate.toISOString().split('T')[0],
  });
  
  // Render tab-based interface
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header with controls */}
      {/* Tab navigation */}
      {/* Tab content */}
    </div>
  );
}
```

### Hook Architecture
```typescript
// src/hooks/useMetaAdsDashboard.ts
export const useMetaAdsDashboard = (options: UseMetaAdsDashboardOptions) => {
  const [data, setData] = useState<MetaAdsDashboardData>();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const fetchData = useCallback(async (isRefresh = false) => {
    // Fetch from API endpoints
    // Handle loading states
    // Error management
  }, [timeRange, referenceDate]);
  
  return { data, isLoading, isValidating, refresh };
};
```

### Key Components

#### 1. MetaAdsKPICards
```typescript
// src/components/meta-ads-dashboard/MetaAdsKPICards.tsx
interface MetaAdsKPICardsProps {
  data: MetaAdsKPIs;
  isLoading: boolean;
  dateRange: string;
}

// Features:
// - 8 KPI cards with trend indicators
// - Currency formatting (THB)  
// - Percentage change visualization
// - Loading skeleton states
```

#### 2. MetaAdsPerformanceBreakdownTable ⭐
```typescript
// src/components/meta-ads-dashboard/MetaAdsPerformanceBreakdownTable.tsx
interface MetaAdsPerformanceBreakdownTableProps {
  timeRange: string;
  referenceDate: string;
  isLoading: boolean;
}

// Features:
// - Multi-period campaign performance analysis (8 time periods)
// - Hierarchical data display (Totals + Individual campaigns)
// - Smart trend analysis with 4-week averages and monthly comparisons
// - Color-coded performance indicators with cost metric inversion
// - Sortable columns by any metric across any time period
// - Responsive table design with horizontal scrolling
// - Lead attribution and campaign type detection (B2C/B2B)
// - Currency formatting (THB) with proper number formatting
```

#### 3. MetaAdsCreativeGallery ⭐
```typescript
// src/components/meta-ads-dashboard/MetaAdsCreativeGallery.tsx  
interface MetaAdsCreativeGalleryProps {
  timeRange: string;
  referenceDate: string;
  isLoading: boolean;
}

// Features:
// - Smart performance scoring display
// - Visual creative thumbnails
// - Performance score bars with color coding
// - Efficiency rating badges
// - Objective-specific KPI displays
// - Sorting and filtering capabilities
// - Grid and list view modes
```

#### 4. MetaAdsPlatformBreakdown
```typescript
// Features:
// - Facebook vs Instagram comparison
// - Platform-specific metrics
// - Visual breakdown charts
// - Spend allocation visualization
```

#### 5. MetaAdsPerformanceChart
```typescript
// Features:
// - Time-series performance visualization
// - Multiple metric support (spend, bookings, impressions, clicks)
// - Interactive chart with hover details
// - Date range adaptation
```

---

## User Experience Features

### Dashboard Controls

#### Time Range Selector
```typescript
// Available ranges
const timeRanges = [
  { value: '7', label: '7 Days' },
  { value: '30', label: '30 Days' },  // Default
  { value: '60', label: '60 Days' },
  { value: '90', label: '90 Days' }
];
```

#### Reference Date Picker
- Calendar component for selecting end date
- Defaults to yesterday (most recent complete data)
- Automatically calculates start date based on time range

#### Manual Refresh
- Instant data refresh capability
- Loading states with spinner animations
- Error handling with retry functionality

### Responsive Design

- **Desktop**: Full feature set with side-by-side layouts
- **Tablet**: Optimized for iPad with touch-friendly controls
- **Mobile**: Stacked layouts with swipeable tabs

### Performance Optimization

- **Lazy Loading**: Components loaded on tab activation
- **Data Caching**: Hook-level caching with manual refresh
- **Skeleton States**: Loading placeholders for smooth UX
- **Error Boundaries**: Graceful error handling and recovery

---

## Business Intelligence Features

### Performance Insights

#### Creative Optimization Recommendations
1. **Excellent Creatives** (Score 80-100)
   - Scale up budget allocation
   - Duplicate successful elements
   - A/B test variations

2. **Good Creatives** (Score 60-79)  
   - Monitor for scaling opportunities
   - Test different audiences
   - Optimize targeting

3. **Average Creatives** (Score 40-59)
   - Review creative elements
   - Test new copy/visuals
   - Consider audience adjustments

4. **Needs Review** (Score 0-39)
   - Immediate optimization required
   - Consider pausing underperformers
   - Complete creative refresh needed

#### Campaign Objective Analysis
- **TRAFFIC Campaigns**: Focus on CTR and CPC optimization
- **ENGAGEMENT Campaigns**: Prioritize interaction rates and CPM efficiency
- **SALES/LEADS Campaigns**: Emphasize conversion rate and cost per acquisition

### ROI Tracking
- Cost per booking analysis
- Revenue attribution to Meta ads
- Platform performance comparison (Facebook vs Instagram)
- Trend analysis for budget optimization

---

## Data Pipeline & ETL

### Data Sources
- **Meta Marketing API** - Primary data source for campaign and creative performance
- **Internal Attribution** - Booking attribution to Meta ads traffic
- **Campaign Metadata** - Campaign objectives, budgets, and settings

### Data Processing
1. **Raw Data Ingestion** - Automated ETL from Meta Marketing API
2. **Data Transformation** - Currency conversion, metric calculations
3. **Performance Scoring** - Objective-based algorithm application
4. **Data Aggregation** - Creative-level consolidation across campaigns

### Update Schedule
- **Real-time**: Manual refresh capability
- **Batch Processing**: Daily ETL updates for historical data
- **Performance Scoring**: Calculated on-demand via RPC functions

---

## Integration Points

### Marketing Dashboard
```typescript
// Navigation from main marketing dashboard
<Link href="/admin/meta-ads-dashboard">
  View Meta Ads Details →
</Link>
```

### Booking Attribution
- Links Meta ads traffic to booking completions
- Attribution tracking for ROI calculation
- Conversion event mapping

### Customer Journey Analysis
- Tracks customer acquisition from Meta ads
- Integration with customer management system
- Lead quality assessment

---

## Development Notes

### Recent Major Improvements (January 2025)

1. **Smart Performance Engine Implementation**
   - Replaced generic booking estimates with objective-based scoring
   - Implemented industry-standard benchmarks for Meta ads
   - Added intelligent efficiency ratings

2. **Creative Name Resolution**
   - Fixed "Unknown Creative" issue by proper table joins
   - Now displays actual Thai creative names
   - Improved creative identification accuracy

3. **Performance Score Visualization**
   - Added color-coded performance score bars
   - Implemented efficiency rating badges
   - Enhanced visual hierarchy and styling

4. **Data Architecture Optimization**
   - Eliminated duplicate creatives through aggregation
   - Improved RPC function performance
   - Better error handling and data validation

5. **Creative Analysis Enhancement (September 2025)**
   - **Hierarchical Table View**: Implemented full Campaign → Adset → Creative hierarchical structure
   - **Lead-Focused Metrics**: Transitioned from conversion terminology to lead-focused analytics
   - **Action-Based Creative Grouping**: Enhanced action view with scale/keep/monitor/refresh/pause recommendations
   - **Period-Specific Data**: Fixed 30d/7d results to show accurate period-specific performance
   - **Creative Detail Modal**: Enhanced modal with comprehensive lead metrics and trend analysis

6. **Performance Breakdown Table Implementation (September 2025)**
   - **Multi-Period Analysis**: Added comprehensive 8-period analysis (5 weekly + 3 monthly)
   - **Advanced Trend Indicators**: Implemented 4-week average comparisons and monthly trend analysis
   - **Inverted Cost Metrics**: Fixed trend colors where lower costs show green (CPC, CPM, Cost per Lead)
   - **Hierarchical Data Display**: Added totals row with aggregated metrics across all campaigns
   - **Lead Attribution**: Integrated lead mapping from `processed_leads` table with B2C/B2B classification
   - **Enhanced API Endpoint**: Created `/api/meta-ads/campaigns/detailed-weekly` with comprehensive data structure
   - **Smart Currency Formatting**: Proper THB display with cents-to-currency conversion
   - **React Hook Optimization**: Added `useCallback` for performance and eliminated linting warnings

### Code Quality Standards

#### TypeScript Implementation
```typescript
// Strict typing for all interfaces
interface CreativePerformance {
  creative_id: string;
  creative_name: string;
  performance_score: number;      // 0-100
  efficiency_rating: 'Excellent' | 'Good' | 'Average' | 'Needs Review';
  objective_kpi_value: number;
  objective_kpi_label: string;
  // ... other properties
}

// Proper error handling
try {
  const response = await fetch('/api/meta-ads/creatives');
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
} catch (error) {
  console.error('Creative fetch error:', error);
  setError(error instanceof Error ? error : new Error('Unknown error'));
}
```

#### Component Patterns
```typescript
// Consistent component structure
const MetaAdsComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  // Hooks at top
  const [state, setState] = useState();
  
  // Event handlers
  const handleAction = useCallback(() => {
    // Implementation
  }, [dependencies]);
  
  // Render with proper TypeScript
  return (
    <div className="responsive-classes">
      {/* Component content */}
    </div>
  );
};
```

### Performance Considerations

#### Optimization Strategies
- **Component Memoization**: React.memo for expensive components
- **Callback Optimization**: useCallback for event handlers
- **Data Fetching**: SWR-like patterns with manual refresh
- **Image Loading**: Lazy loading for creative thumbnails

#### Database Optimization
- **Indexed Queries**: Proper indexing on campaign_id, creative_id, date
- **RPC Functions**: PostgreSQL functions for complex aggregations
- **Data Partitioning**: Date-based partitioning for performance tables

---

## Configuration

### Environment Variables
```bash
# Required for Meta Ads Dashboard
NEXT_PUBLIC_REFAC_SUPABASE_URL=your_supabase_url
REFAC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Development authentication bypass
SKIP_AUTH=true  # Only for development
```

### Feature Flags
```typescript
// src/config/features.ts
export const META_ADS_FEATURES = {
  SMART_PERFORMANCE_SCORING: true,
  CREATIVE_CALENDAR: true,
  PLATFORM_BREAKDOWN: true,
  AUTO_REFRESH: false,  // Manual refresh only
};
```

---

## Testing Strategy

### Unit Tests
- Component rendering with various data states
- Hook behavior with different parameters
- API response handling and error scenarios
- Performance scoring algorithm accuracy

### Integration Tests
- End-to-end dashboard navigation
- Data fetching and display accuracy
- Filter and sort functionality
- Mobile responsive behavior

### Performance Tests
- Dashboard load times under various data volumes
- API response times for different date ranges
- Creative gallery rendering with large datasets

---

## Troubleshooting Guide

### Common Issues

#### 1. Creative Names Show as "Unknown Creative"
```typescript
// Solution: Ensure proper ad_creative_assets table join
// Check RPC function uses correct table relationships
SELECT cp.creative_id, aca.text_content as creative_name
FROM marketing.meta_ads_creative_performance cp
LEFT JOIN marketing.ad_creative_assets aca ON cp.ad_id = aca.ad_id
```

#### 2. Performance Scores All Show 100 or 0
```typescript
// Check campaign objective mapping
// Ensure performance scoring algorithm handles edge cases
CASE 
  WHEN primary_campaign_objective = 'OUTCOME_TRAFFIC' THEN
    -- Proper CTR and CPC calculations
  WHEN primary_campaign_objective = 'OUTCOME_ENGAGEMENT' THEN  
    -- Proper CPM calculations
END
```

#### 3. Duplicate Creatives in Gallery
```typescript
// Ensure creative aggregation by creative_id
GROUP BY cp.creative_id, aca.text_content, aca.asset_type
// Not by campaign_id which creates duplicates
```

#### 4. API Timeout Issues
```typescript
// Add request timeouts
const controller = new AbortController();
setTimeout(() => controller.abort(), 30000);

fetch('/api/meta-ads/creatives', {
  signal: controller.signal
});
```

### Debug Mode
```typescript
// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('Meta Ads Debug:', {
    timeRange,
    referenceDate,
    activeTab,
    dataState: data
  });
}
```

---

## Future Enhancements

### Planned Features
1. **Automated Optimization Suggestions**
   - AI-powered creative recommendations
   - Budget reallocation suggestions
   - Audience optimization insights

2. **Advanced Analytics**
   - Customer lifetime value attribution
   - Multi-touch attribution modeling
   - Predictive performance forecasting

3. **Export & Reporting**
   - PDF report generation
   - Excel export functionality
   - Scheduled email reports

4. **Integration Expansions**
   - Google Ads comparison dashboard
   - Cross-platform attribution analysis
   - Marketing mix modeling

### Technical Improvements
1. **Real-time Data Streaming**
   - WebSocket connections for live updates
   - Server-sent events for performance alerts

2. **Advanced Caching**
   - Redis caching layer
   - CDN integration for static assets

3. **Mobile App Support**
   - React Native companion app
   - Push notifications for performance alerts

---

## Support & Documentation

### API Documentation
- Complete endpoint documentation in `/docs/api/META_ADS_API_REFERENCE.md`
- Interactive API explorer (coming soon)

### Component Documentation  
- Storybook documentation for UI components
- Usage examples and prop descriptions

### Database Documentation
- Complete schema documentation in `/docs/database/MARKETING_SCHEMA.md`
- RPC function documentation and examples

---

## Conclusion

The Meta Ads Dashboard represents a sophisticated advertising analytics platform that goes beyond basic metrics to provide intelligent, objective-based performance insights. Its smart performance engine, real-time data capabilities, and comprehensive creative optimization features make it an essential tool for maximizing Meta advertising ROI in the golf academy industry.

**Key Differentiators:**
- **🎯 Objective-Based Intelligence** - Scoring based on campaign goals, not generic metrics
- **🎨 Creative-First Approach** - Visual gallery with performance-driven insights
- **📊 Real-time Analytics** - Live data with manual refresh capability
- **🚀 Scalable Architecture** - Built for high-volume campaign and creative management

The dashboard successfully addresses the unique challenges of Meta advertising by providing actionable insights that directly impact campaign performance and business outcomes.

---

## Creative Analysis Enhancement (September 2025)

### Overview of Recent Updates

The Creative Performance Tab has been significantly enhanced with hierarchical organization, lead-focused metrics, and action-based optimization recommendations. These updates transform the creative analysis from a simple gallery view into a comprehensive decision-making tool.

### Enhanced Creative Performance Tab Structure

#### 1. Multi-View Analysis System

**Action View** - Optimization-focused creative grouping:
```typescript
interface ActionGroups {
  scale: CreativePerformanceDisplay[];     // 🚀 Scale Winners (Score 80-100)
  keep: CreativePerformanceDisplay[];      // ✅ Keep Running (Score 60-79) 
  monitor: CreativePerformanceDisplay[];   // 👁️ Monitor Closely (Score 40-59)
  refresh: CreativePerformanceDisplay[];   // ⚠️ Refresh Creative (Score 20-39)
  pause: CreativePerformanceDisplay[];     // 🛑 Consider Pausing (Score 0-19)
}
```

**Table View** - Hierarchical Campaign → Adset → Creative structure:
- Full three-level hierarchy with expandable rows
- Independent state management for campaign and adset expansion
- Period-specific data (30d/7d show accurate period values, not totals)
- Three levels of visual indentation for clarity

**Gallery View** - Visual creative performance (existing functionality)

#### 2. Lead-Focused Data Architecture

**Updated Interface Structure**:
```typescript
interface CreativePerformanceDisplay {
  // Core identifiers
  creative_id: string;
  creative_name: string;
  creative_type: string;
  
  // Hierarchical organization
  campaign_id: string;
  campaign_name: string;
  campaign_objective: string;
  adset_id: string;
  adset_name: string;
  adset_status: string;
  ad_status: string;
  
  // Lead-focused metrics (Updated from conversions)
  total_leads: number;              // Changed from total_conversions
  last_30d_leads: number;           // Changed from last_30d_conversions  
  last_7d_leads: number;            // Changed from last_7d_conversions
  lead_trend_7d: string;            // Changed from conversion_trend_7d
  
  // Action-based optimization
  action_status: 'scale' | 'keep' | 'monitor' | 'refresh' | 'pause';
  action_reason: string;
  cost_per_result: number;          // Cost per lead for lead campaigns
  
  // Enhanced time tracking
  launch_date: string;
  days_active: number;
  last_active_date?: string;
}
```

#### 3. Hierarchical Table Implementation

**Technical Architecture**:
- **State Management**: Separate React state for campaign and adset expansion
- **Data Structure**: Nested CampaignGroup → AdsetGroup → Creative hierarchy
- **Visual Design**: Three-level indentation (p-4, p-4 pl-8, p-4 pl-16)
- **Data Accuracy**: Period-specific metrics use correct time-bound data

**Key Features**:
```typescript
// Campaign-level data with nested adsets
interface CampaignGroup {
  campaign_id: string;
  campaign_name: string;
  campaign_objective: string;
  total_spend: number;
  active_ads: number;
  adsets: AdsetGroup[];              // Nested adset structure
  creatives: CreativePerformanceDisplay[]; // Legacy compatibility
}

// Adset-level data with nested creatives
interface AdsetGroup {
  adset_id: string;
  adset_name: string;
  adset_status: string;
  total_spend: number;
  active_ads: number;
  creatives: CreativePerformanceDisplay[];
}
```

#### 4. Action-Based Creative Optimization

**Intelligent Action Recommendations**:
- **🚀 Scale Winners**: High-performing creatives (80-100 score) - Increase budget allocation
- **✅ Keep Running**: Good performers (60-79 score) - Maintain current spend
- **👁️ Monitor Closely**: Average performers (40-59 score) - Watch for changes
- **⚠️ Refresh Creative**: Underperformers (20-39 score) - Creative fatigue detected
- **🛑 Consider Pausing**: Poor performers (0-19 score) - Prevent budget waste

**Action View Features**:
- Creative cards grouped by recommendation type
- Action-specific color coding and icons
- Summary counts for each action category
- Contextual optimization advice for each group

#### 5. Enhanced Creative Detail Modal

**Comprehensive Lead Analytics**:
- **Lead Metrics Display**: Total leads, 30d leads, 7d leads with trend indicators
- **Period Analysis**: Detailed breakdown showing lead data for each time period
- **Performance Context**: Full campaign and adset hierarchy information
- **Optimization Recommendations**: Action-specific suggestions based on performance
- **Visual Creative Assets**: Enhanced preview with performance overlays

**Modal Technical Features**:
- Lead trend analysis with 7-day period comparisons
- Campaign objective-specific KPI displays
- Time-based performance evolution tracking
- Cost per lead calculations and efficiency metrics

#### 6. Data Accuracy Improvements

**Period-Specific Performance Data**:
- **Fixed Issue**: 30d and 7d results previously showed identical values
- **Solution**: Use `last_30d_clicks` and `last_7d_clicks` instead of `total_clicks` fallback
- **Implementation**: Accurate time-bound data queries in API responses

**Lead Metrics Consistency**:
- **Terminology**: Consistent use of "leads" instead of "conversions" throughout interface
- **Backwards Compatibility**: Fallback to conversion data when lead data unavailable
- **API Integration**: Updated APIs return lead-focused metrics with conversion fallbacks

### Implementation Details

#### Component Architecture
```typescript
// Hierarchical Table View Component
const MetaAdsCreativeTableView: React.FC = () => {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set());
  
  // Independent expand/collapse for campaigns and adsets
  const toggleCampaignExpanded = (campaignId: string) => {
    const newExpanded = new Set(expandedCampaigns);
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId);
    } else {
      newExpanded.add(campaignId);
    }
    setExpandedCampaigns(newExpanded);
  };
  
  // Similar pattern for adset expansion
  const toggleAdsetExpanded = (adsetId: string) => {
    // Implementation for adset-level expand/collapse
  };
  
  return (
    // Three-level table structure with expandable rows
    // Campaign → Adset → Creative hierarchy rendering
  );
};
```

#### API Enhancements
```typescript
// Enhanced creative performance API with hierarchical support
GET /api/meta-ads/creatives?view=table&groupBy=campaign

// Response structure for table view
interface TableViewResponse {
  view: 'table';
  campaigns: CampaignGroup[];           // Hierarchical data structure
  total_campaigns: number;
  total_creatives: number;
  summary: {
    total_active_ads: number;
    total_campaigns: number;
    last_7d_spend: number;
    last_7d_results: number;           // Lead-focused results
    date_range: {
      start: string;
      end: string;
      days: number;
    };
  };
}
```

### User Experience Improvements

#### Visual Hierarchy
- **Campaign Level**: Bold text, higher padding (p-4), primary background
- **Adset Level**: Medium weight, indented (pl-8), secondary background  
- **Creative Level**: Normal weight, double-indented (pl-16), standard background

#### Interactive Elements
- **Expand/Collapse Icons**: Intuitive chevron icons showing state
- **Independent State**: Campaign expansion doesn't affect adset expansion
- **Performance Indicators**: Color-coded metrics throughout hierarchy
- **Action Status**: Visual badges showing optimization recommendations

#### Data Presentation
- **Period Accuracy**: 30d and 7d columns show true period-specific data
- **Lead Focus**: Consistent terminology and metrics throughout interface
- **Trend Indicators**: Visual arrows showing performance direction
- **Cost Efficiency**: Inverted color coding for cost metrics (lower = better)

### Business Impact

#### Decision-Making Enhancement
- **Action-Based Grouping**: Immediate optimization recommendations visible
- **Hierarchical Analysis**: Understanding performance at campaign, adset, and creative levels
- **Lead Attribution**: Focus on lead generation rather than generic conversions
- **Performance Context**: Full campaign structure provides optimization context

#### Operational Efficiency
- **Rapid Decision Making**: Clear action recommendations reduce analysis time
- **Performance Monitoring**: Hierarchical view enables systematic optimization
- **Budget Optimization**: Scale/pause recommendations based on data-driven insights
- **Creative Management**: Systematic approach to creative lifecycle management

### Technical Specifications

#### Data Processing Pipeline
1. **Data Aggregation**: Creative performance aggregated across campaigns and adsets
2. **Hierarchical Structuring**: Campaign → Adset → Creative relationship building
3. **Lead Calculation**: Attribution and calculation of lead-specific metrics
4. **Action Classification**: Performance-based action recommendation assignment
5. **Period Analysis**: Accurate time-bound metric calculations

#### Performance Optimizations
- **React State Management**: Efficient expand/collapse state with minimal re-renders
- **Data Memoization**: Cached hierarchical data structures for smooth interactions
- **Component Lazy Loading**: Table rows rendered on-demand for large datasets
- **API Response Optimization**: Nested data structure reduces multiple API calls

### Future Enhancement Opportunities

#### Advanced Analytics
- **Predictive Recommendations**: AI-powered action suggestions based on trends
- **Cross-Campaign Analysis**: Performance patterns across campaign hierarchies
- **Budget Optimization**: Automated spend reallocation recommendations
- **Creative Lifecycle**: Automated refresh timing based on performance curves

#### User Experience
- **Bulk Actions**: Multi-select for batch optimization actions
- **Custom Grouping**: User-defined hierarchical views beyond campaign structure
- **Performance Alerts**: Real-time notifications for action-required creatives
- **Export Functionality**: Hierarchical data export for external analysis

This comprehensive enhancement positions the Meta Ads Dashboard as a leading-edge creative optimization platform, providing advertisers with the insights and recommendations needed for data-driven campaign management and superior ROI performance.