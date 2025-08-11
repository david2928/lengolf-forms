# LENGOLF Google Ads Dashboard Design Document

## Overview

This document outlines the design for a specialized Google Ads performance dashboard optimized for offline businesses like LENGOLF that cannot directly attribute individual bookings to specific campaigns. The dashboard focuses on correlation analysis, leading indicators, and systematic testing methodology.

## Design Principles

### Core Philosophy
- **Correlation over Attribution**: Focus on patterns and correlations rather than direct attribution
- **Leading Indicators First**: Emphasize metrics that can be measured (CTR, CPC, Impression Share)
- **14-Day Optimization Cycles**: Design around 14-day analysis windows for local business buying cycles
- **Test-Driven Decisions**: Enable systematic A/B testing of campaign impact

### Visual Hierarchy
1. **Executive Summary** - Instant health check and action alerts
2. **Booking Correlation Analysis** - Connect ad spend to actual bookings
3. **Leading Indicators Dashboard** - CTR, CPC, Quality Score trends
4. **Campaign Testing Framework** - A/B test results and recommendations
5. **Attribution Enhancement** - Enhanced tracking implementation status

## Dashboard Architecture

### Component Structure
```
📊 GoogleAdsStrategicDashboard
├── 🎯 ExecutiveOverview
├── 📈 BookingCorrelationPanel  
├── 🔍 LeadingIndicatorsGrid
├── 🧪 CampaignTestingLab
├── 📊 BudgetAllocationMatrix
├── 🔗 AttributionEnhancement
└── 📋 ActionRecommendations
```

### Data Flow Architecture
```
Google Ads API → Campaign Performance Data
     ↓
Supabase Analytics → Correlation Engine
     ↓
Referral Analytics → Booking Volume Data
     ↓
Dashboard Components → Visual Insights
     ↓
Recommendation Engine → Actionable Decisions
```

## Detailed Component Design

### 1. Executive Overview Panel

**Purpose**: Immediate visibility of key health metrics and urgent actions

**Layout**: 
```
┌─────────────────────────────────────────────────────────────┐
│                    EXECUTIVE OVERVIEW                       │
├─────────────────────────────────────────────────────────────┤
│  🎯 Performance Score: 78/100    📊 Booking Efficiency: ↑12% │
│  ⚠️  Urgent Actions (2)          💰 Budget Utilization: 94% │
└─────────────────────────────────────────────────────────────┘
```

**Metrics**:
- **Performance Score (0-100)**
  - Formula: (Booking Correlation × 0.3) + (CTR Health × 0.25) + (CPC Efficiency × 0.25) + (Budget Efficiency × 0.2)
  - Color coding: Red (<60), Yellow (60-80), Green (>80)
- **Booking Efficiency Trend**
  - 14-day change in cost per Google booking
  - Arrows showing direction and percentage change
- **Urgent Actions Counter**
  - Auto-generated based on thresholds
  - Click to expand action details
- **Budget Utilization**
  - Percentage of monthly budget spent to date

**Data Sources**:
- Google Ads API (campaign performance)
- Referral analytics API (Google bookings)
- Internal calculation engine

### 2. Booking Correlation Panel

**Purpose**: Connect Google Ads spend to actual booking volume using your referral analytics

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│               GOOGLE ADS ↔ BOOKINGS CORRELATION             │
├─────────────────────────────────────────────────────────────┤
│ 📅 Period: Last 14 Days    📈 Correlation: Strong (0.78)   │
├─────────────────────────────────────────────────────────────┤
│ Metric              │ Current │ Previous │ Change │ Impact  │
├─────────────────────┼─────────┼──────────┼────────┼─────────┤
│ Google Ads Spend    │ ฿7,200  │ ฿8,400   │ -14%   │ 📉      │
│ Google Bookings     │   28    │   24     │ +17%   │ 📈      │
│ Cost/Booking        │ ฿257    │ ฿350     │ -27%   │ 🎯      │
│ Booking Share       │  42%    │  38%     │ +4pp   │ 📊      │
└─────────────────────┴─────────┴──────────┴────────┴─────────┘
```

**Features**:
- **Correlation Strength Indicator**: Statistical correlation between spend and bookings
- **Period Comparison**: Current vs previous 14-day period
- **Booking Share**: Google bookings as % of total bookings
- **Efficiency Trends**: Cost per booking trajectory
- **Interactive Chart**: Spend vs bookings over time with trendlines

**Data Sources**:
- Google Ads API (daily spend by campaign)
- Referral analytics (Google-sourced bookings by date)
- Statistical correlation calculation

### 3. Leading Indicators Grid

**Purpose**: Track metrics that can be directly measured and predict booking performance

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│                    LEADING INDICATORS                       │
├─────────────────────────────────────────────────────────────┤
│ 🎯 CTR Health        │ 📊 Impression Share  │ 💰 CPC Trends  │
│    4.8% (+0.3%)      │    32% (-2%)         │   ฿5.20 (+8%)  │
│ ████████████░░       │ ██████░░░░░░         │ ████████████    │
│                                                             │
│ ⭐ Quality Score     │ 🔍 Search Lost       │ 📈 Click Volume │
│    6.8/10 (+0.2)     │    18% Budget        │   1,240 (-5%)  │
│ ███████████░░        │ ███████████░░        │ ██████████░░    │
└─────────────────────────────────────────────────────────────┘
```

**Metrics**:
- **CTR Health**: Average CTR across campaigns with trend
- **Impression Share**: Market visibility percentage
- **CPC Trends**: Average cost per click changes
- **Quality Score**: Average quality score with improvement indicator
- **Search Lost**: % impressions lost to budget/rank
- **Click Volume**: Total clicks with trend direction

**Visual Elements**:
- Progress bars showing metric health (red/yellow/green zones)
- Trend arrows and percentage changes
- Sparkline charts for historical context
- Alert indicators for metrics outside normal ranges

### 4. Campaign Testing Lab

**Purpose**: Systematic A/B testing framework for campaign impact measurement

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│                   CAMPAIGN TESTING LAB                      │
├─────────────────────────────────────────────────────────────┤
│ 🧪 Active Tests (2)                                         │
├─────────────────────────────────────────────────────────────┤
│ Test: Brand Search Pause                                    │
│ Status: ⏳ Day 5 of 14    Impact: 📊 Bookings stable (-2%) │
│ Action: Continue test     Confidence: 🟡 Moderate          │
├─────────────────────────────────────────────────────────────┤
│ Test: B2B Campaign Pause                                    │
│ Status: ✅ Completed       Impact: 📈 No booking decline    │
│ Action: 💰 Permanent pause Savings: ฿5,176/month          │
├─────────────────────────────────────────────────────────────┤
│ 📋 Recommended Tests                                        │
│ • Performance Max budget +50% (2-week test)                │
│ • Thai campaign keyword refinement                         │
│ • Generic English dayparting optimization                  │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- **Active Test Tracking**: Current tests with day counters
- **Impact Measurement**: Booking volume changes during tests
- **Statistical Confidence**: Confidence levels for test results
- **Test Queue**: Recommended tests based on performance patterns
- **Historical Results**: Archive of past test outcomes

**Test Types Supported**:
- Campaign pause/resume tests
- Budget allocation tests
- Dayparting experiments
- Keyword refinement tests
- Ad copy variations

### 5. Budget Allocation Matrix

**Purpose**: Visual budget optimization based on correlation analysis

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│                 BUDGET ALLOCATION MATRIX                    │
├─────────────────────────────────────────────────────────────┤
│ Campaign Type        │Current│Target│Action│Efficiency│     │
├──────────────────────┼───────┼──────┼──────┼──────────┼─────┤
│ Generic English      │ 28%   │ 40%  │  ↑   │   High   │ 🟢  │
│ Performance Max      │ 13%   │ 25%  │  ↑   │  Medium  │ 🟡  │
│ Thai Search          │ 13%   │ 20%  │  ↑   │   Low    │ 🟠  │
│ Brand Search         │ 17%   │  ?   │  🧪  │ Testing  │ 🔵  │
│ B2B Campaigns        │ 28%   │  0%  │  ❌  │   None   │ 🔴  │
├──────────────────────┼───────┼──────┼──────┼──────────┼─────┤
│ Total Monthly Budget │           ฿18,163 (No Increase)     │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- **Current vs Target Allocation**: Visual comparison
- **Action Indicators**: Clear direction for each campaign
- **Efficiency Ratings**: Based on booking correlation
- **Testing Status**: Shows campaigns under A/B testing
- **Budget Conservation**: Emphasis on reallocation, not increase

**Interactive Elements**:
- Drag-and-drop budget sliders (for scenario planning)
- Efficiency calculator (projects booking impact)
- Savings calculator (shows freed budget from pauses)

### 6. Attribution Enhancement Panel

**Purpose**: Track progress on enhanced attribution implementation

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│               ATTRIBUTION ENHANCEMENT STATUS                │
├─────────────────────────────────────────────────────────────┤
│ Current Attribution: Overall Source (Google) ✅            │
│ Attribution Coverage: ~70% of bookings                     │
├─────────────────────────────────────────────────────────────┤
│ Enhancement Status:                                         │
│ ✅ UTM Parameter Setup      📱 Phone Tracking: 🟡 Planned  │
│ 🟡 Enhanced Conversions     🔍 Walk-in Attribution: 🔴 N/A │
│ ❌ Call Tracking Setup      📧 Email Matching: 🟡 Ready   │
├─────────────────────────────────────────────────────────────┤
│ Estimated Attribution Improvement: +25% visibility         │
│ Implementation Priority: Phone Call Tracking (High ROI)    │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Tracking**:
- **Current State**: What attribution you have now
- **Enhancement Progress**: Step-by-step implementation status
- **Impact Estimation**: Expected improvement in attribution visibility
- **Priority Queue**: Most impactful enhancements first

### 7. Action Recommendations Engine

**Purpose**: Auto-generated, prioritized action items based on data

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│                   RECOMMENDED ACTIONS                       │
├─────────────────────────────────────────────────────────────┤
│ 🔥 URGENT (Action within 24 hours)                         │
│ • B2B campaigns showing 0 bookings for 14+ days           │
│   Action: Pause immediately, save ฿172/day                │
├─────────────────────────────────────────────────────────────┤
│ ⚠️  HIGH PRIORITY (Action within 1 week)                   │
│ • Brand search test shows stable bookings                  │
│   Action: Consider permanent pause, reallocate ฿100/day    │
│ • Generic English CTR improved 15%                         │
│   Action: Increase budget by ฿50/day to scale wins         │
├─────────────────────────────────────────────────────────────┤
│ 💡 OPTIMIZATION (Action within 1 month)                    │
│ • Thai campaign CPC increased 20%                          │
│   Action: Keyword refinement, add negative keywords        │
│ • Quality scores below 7 in Performance Max                │
│   Action: Landing page optimization needed                 │
└─────────────────────────────────────────────────────────────┘
```

**Action Types**:
- **Urgent**: Immediate budget waste or opportunities
- **High Priority**: Proven optimization opportunities
- **Optimization**: Incremental improvements

**Features**:
- **Priority Scoring**: Algorithm-based priority calculation
- **Impact Estimation**: Expected savings or booking increase
- **Action Detail**: Specific steps to take
- **Implementation Tracking**: Mark actions as complete

## Technical Implementation

### API Endpoints Required

#### 1. Enhanced Google Ads Analytics
```typescript
// Existing endpoint enhanced for correlation analysis
GET /api/google-ads/analytics
// New parameters:
{
  correlationWindow: 14, // days
  includeBookingData: true,
  leadingIndicators: true
}
```

#### 2. Booking Correlation API
```typescript
// New endpoint for correlation analysis
GET /api/google-ads/booking-correlation
{
  startDate: string,
  endDate: string,
  granularity: 'daily' | 'weekly'
}

Response: {
  correlation: number, // -1 to 1
  spendData: Array<{date, spend}>,
  bookingData: Array<{date, bookings}>,
  efficiency: {
    costPerBooking: number,
    bookingShare: number,
    trend: 'up' | 'down' | 'stable'
  }
}
```

#### 3. Campaign Testing API
```typescript
// New endpoint for A/B test management
POST /api/google-ads/campaign-tests
{
  testType: 'pause' | 'budget_change' | 'keyword_test',
  campaignId: string,
  testDuration: number, // days
  hypothesis: string
}

GET /api/google-ads/campaign-tests
// Returns active and completed tests with results
```

#### 4. Attribution Enhancement API
```typescript
// Track attribution improvement progress
GET /api/google-ads/attribution-status
Response: {
  currentCoverage: number, // % of bookings attributed
  enhancements: {
    utmTracking: 'complete' | 'in_progress' | 'not_started',
    callTracking: 'complete' | 'in_progress' | 'not_started',
    enhancedConversions: 'complete' | 'in_progress' | 'not_started'
  },
  estimatedImprovement: number
}
```

### Database Schema Additions

```sql
-- Campaign testing tracking
CREATE TABLE marketing.google_ads_campaign_tests (
  id SERIAL PRIMARY KEY,
  test_type TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  hypothesis TEXT,
  baseline_metrics JSONB,
  test_metrics JSONB,
  result TEXT, -- 'positive', 'negative', 'neutral'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Booking correlation cache
CREATE TABLE marketing.booking_correlation_cache (
  date DATE PRIMARY KEY,
  google_ads_spend DECIMAL(10,2),
  google_bookings INTEGER,
  total_bookings INTEGER,
  correlation_score DECIMAL(5,4),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Attribution enhancement tracking
CREATE TABLE marketing.attribution_enhancements (
  enhancement_type TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  implementation_date DATE,
  estimated_improvement DECIMAL(5,2),
  actual_improvement DECIMAL(5,2),
  notes TEXT
);
```

### Component Architecture

```typescript
interface GoogleAdsStrategicDashboard {
  // Executive overview
  performanceScore: number;
  urgentActions: Action[];
  budgetUtilization: number;
  
  // Booking correlation
  correlationAnalysis: CorrelationData;
  bookingEfficiency: EfficiencyMetrics;
  
  // Leading indicators
  leadingIndicators: LeadingIndicatorMetrics;
  
  // Testing framework
  activeTests: CampaignTest[];
  recommendedTests: TestRecommendation[];
  
  // Budget allocation
  currentAllocation: BudgetAllocation;
  recommendedAllocation: BudgetAllocation;
  
  // Attribution status
  attributionCoverage: number;
  enhancementStatus: AttributionEnhancement[];
}

interface CorrelationData {
  strength: number; // -1 to 1
  period: DateRange;
  spendTrend: TrendData[];
  bookingTrend: TrendData[];
  efficiency: {
    costPerBooking: number;
    previousCostPerBooking: number;
    change: number;
  };
}

interface CampaignTest {
  id: string;
  type: 'pause' | 'budget_change' | 'keyword_test';
  campaignName: string;
  status: 'active' | 'completed';
  daysElapsed: number;
  totalDays: number;
  impact: {
    bookingChange: number;
    confidenceLevel: 'low' | 'medium' | 'high';
  };
  action: string;
}
```

## Visual Design Elements

### Color Scheme
- **Primary**: Deep blue (#1e40af) - Trust, stability
- **Success**: Green (#059669) - Positive performance
- **Warning**: Amber (#d97706) - Needs attention
- **Danger**: Red (#dc2626) - Urgent action required
- **Info**: Sky blue (#0284c7) - Testing/analysis
- **Neutral**: Gray (#6b7280) - Secondary information

### Typography
- **Headers**: Inter Bold, 18-24px
- **Metrics**: JetBrains Mono, 16-20px (monospace for numbers)
- **Body**: Inter Regular, 14px
- **Labels**: Inter Medium, 12px

### Iconography
- 🎯 Performance/targeting
- 📊 Analytics/data
- 🧪 Testing/experiments
- 💰 Budget/financial
- 📈 Growth/positive trends
- ⚠️ Warnings/attention needed
- ✅ Completed/successful
- 🔄 In progress/ongoing

### Layout Principles
- **Grid System**: 12-column responsive grid
- **Card-based Design**: Each section in distinct cards
- **Progressive Disclosure**: Summary → details on interaction
- **Mobile First**: Responsive design starting from 320px width
- **Dark Mode Support**: Toggle between light/dark themes

## User Experience Flow

### Initial Load
1. **Performance Score** immediately visible
2. **Urgent actions** highlighted if any exist
3. **Booking correlation** loads with latest 14-day data
4. **Leading indicators** populate with current metrics

### Interaction Patterns
- **Drill Down**: Click metric cards to see detailed breakdowns
- **Time Range Selection**: Global date picker affects all components
- **Test Management**: Start new tests directly from recommendations
- **Export Functionality**: Download data for offline analysis

### Mobile Responsiveness
- **Executive Overview**: Stacked cards on mobile
- **Booking Correlation**: Horizontal scroll for table data
- **Leading Indicators**: 2x3 grid on mobile vs 3x2 on desktop
- **Testing Lab**: Collapsed accordion view on mobile

## Implementation Phases

### Phase 1: Core Dashboard (Week 1-2)
- Executive overview panel
- Booking correlation analysis
- Leading indicators grid
- Basic action recommendations

### Phase 2: Testing Framework (Week 3-4)
- Campaign testing lab
- A/B test management
- Budget allocation matrix
- Enhanced recommendations engine

### Phase 3: Attribution Enhancement (Week 5-6)
- Attribution status tracking
- UTM parameter integration
- Enhanced conversion setup preparation
- Call tracking readiness assessment

### Phase 4: Optimization (Week 7-8)
- Performance optimization
- Advanced correlation algorithms
- Predictive analytics
- Automated alert system

## Success Metrics for Dashboard

### User Adoption Metrics
- **Daily Active Users**: Admin users checking dashboard daily
- **Session Duration**: Time spent analyzing data (target: 5+ minutes)
- **Action Implementation**: % of recommendations acted upon

### Business Impact Metrics
- **Decision Speed**: Time from insight to action (target: <48 hours)
- **Test Velocity**: Number of A/B tests run per month (target: 4+)
- **Budget Efficiency**: Improvement in cost per Google booking

### Technical Performance
- **Load Time**: Dashboard fully loaded in <3 seconds
- **Data Freshness**: All data updated within last 24 hours
- **Correlation Accuracy**: Statistical significance of correlations

This dashboard design transforms the challenge of offline business attribution into a systematic, data-driven optimization framework that works within LENGOLF's existing infrastructure while providing actionable insights for budget allocation decisions.

---

**Next Steps**: 
1. Review and approve dashboard design
2. Begin Phase 1 implementation
3. Set up enhanced analytics endpoints
4. Create initial booking correlation analysis

*Dashboard Design Document v1.0*  
*Optimized for Offline Business Attribution*  
*LENGOLF Google Ads Strategic Management*