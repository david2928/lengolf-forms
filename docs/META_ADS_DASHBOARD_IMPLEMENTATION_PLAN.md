# Meta Ads Dashboard - Complete Implementation Plan

*Comprehensive Deep-Dive Dashboard Design - September 2025*

---

## 🎯 Project Overview

**Purpose:** Create a dedicated Meta Ads dashboard page that provides in-depth analysis following the simple plan approach, with enhanced creative performance tracking and monthly calendar view.

**Location:** `/admin/meta-ads-dashboard` (separate from main marketing dashboard)

**Link:** Accessible via button/link from main marketing dashboard Overview tab

---

## 📋 Database Analysis Summary

### Available Data (marketing schema)
```sql
-- Tables Available:
- meta_ads_campaigns (campaign metadata)
- meta_ads_campaign_performance (daily metrics by campaign)
- meta_ads_ad_creatives (creative assets with thumbnails)  
- meta_ads_creative_performance (daily metrics by creative)
- meta_ads_ads (ad metadata)
- meta_ads_ad_performance (daily metrics by ad)
- meta_ads_ad_sets (adset metadata)
- meta_ads_adset_performance (daily metrics by adset)

-- Data Range: August 2025 - September 2025
-- Creative Count: 686 performance records
-- Rich metadata: thumbnails, titles, bodies, creative types
```

### Key Data Fields
- **Creative Assets:** `thumbnail_url`, `image_url`, `video_url`, `title`, `body`, `creative_type`
- **Performance:** `impressions`, `clicks`, `spend_cents`, `conversions`, `ctr`, `reach`, `frequency`
- **Platform Split:** Available via campaign/adset targeting data
- **Time Series:** Daily granularity for all metrics

---

## 🏗️ Page Architecture

### URL Structure
```
/admin/meta-ads-dashboard
├── ?tab=overview (default)
├── ?tab=campaigns  
├── ?tab=creatives
└── ?tab=calendar
```

### Component Hierarchy
```
MetaAdsDashboardPage
├── MetaAdsHeader (controls, date picker, export)
├── MetaAdsTabNavigation
├── MetaAdsOverviewTab
│   ├── MetaAdsKPICards (8 cards)
│   ├── MetaAdsPerformanceChart
│   ├── MetaAdsPlatformBreakdown
│   └── MetaAdsQuickSummary
├── MetaAdsCampaignsTab
│   ├── MetaAdsCampaignTable
│   └── MetaAdsCampaignFilters
├── MetaAdsCreativesTab
│   ├── MetaAdsCreativeGallery
│   └── MetaAdsCreativeFilters
└── MetaAdsCalendarTab
    ├── MetaAdsMonthSelector
    ├── MetaAdsCreativeCalendar
    └── MetaAdsCalendarLegend
```

---

## 📊 Tab 1: Overview (Default)

### KPI Cards (Top Priority)
Following the simple plan's 8-card layout:

```typescript
interface MetaAdsKPIs {
  totalSpend: number;           // Sum of spend_cents/100
  metaBookings: number;         // From referral_source 'Facebook'+'Instagram'
  totalImpressions: number;     // Sum of impressions
  totalClicks: number;          // Sum of clicks
  averageCtr: number;           // Weighted average CTR
  conversions: number;          // Sum of conversions (Meta pixel)
  costPerBooking: number;       // totalSpend / metaBookings
  costPerConversion: number;    // totalSpend / conversions
  
  // Each with trend indicators and 30d comparison
  spendChange: number;
  bookingsChange: number;
  impressionsChange: number;
  clicksChange: number;
  ctrChange: number;
  conversionsChange: number;
  costPerBookingChange: number;
  costPerConversionChange: number;
}
```

### Platform Breakdown Chart
Side-by-side comparison of Facebook vs Instagram:
- Spend distribution (pie chart)
- Booking distribution (pie chart)  
- Performance metrics table
- Trend arrows for each platform

### Performance Chart (Main)
- **X-axis:** Date range (default 30 days)
- **Primary Y-axis:** Spend (bar chart, blue)
- **Secondary Y-axis:** Meta Bookings (line chart, green)
- **Toggle Options:** Impressions, Clicks, Conversions, CTR

---

## 📈 Tab 2: Campaign Performance

### Campaign Table Structure
```typescript
interface MetaCampaignRow {
  campaignName: string;         // Parsed, not raw "marketyze" names
  campaignStatus: string;       // Active/Paused/Ended
  spend: number;                // Period total spend
  impressions: number;          // Period total impressions
  clicks: number;               // Period total clicks
  ctr: number;                  // Weighted average CTR
  conversions: number;          // Meta pixel conversions
  metaBookings: number;         // Time-correlated estimate
  costPerBooking: number;       // spend / metaBookings
  platform: 'Facebook' | 'Instagram' | 'Both';
  dateRange: string;            // Campaign active period
}
```

### Features
- **Sort by:** Spend (default), Cost per Booking, Meta Bookings, CTR
- **Filters:** Platform, Status, Date Range
- **Campaign Name Parsing:** Utility to clean "marketyze" names
- **Pagination:** 20 campaigns per page
- **Export:** CSV download

### Campaign Booking Estimation Logic
```sql
-- Simple time-based estimate from simple plan
Campaign Meta Bookings = 
  Total Meta Bookings in Period × (Campaign Spend / Total Spend in Period)
```

---

## 🎨 Tab 3: Creative Performance

### Creative Gallery Layout
Grid layout with creative cards:

```typescript
interface MetaCreativeCard {
  creativeId: string;
  creativeName: string;
  thumbnail: string;            // thumbnail_url or image_url
  creativeType: 'image' | 'video' | 'carousel';
  title: string;
  body: string;                 // Truncated to 100 chars
  
  // Performance metrics
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  reach: number;
  frequency: number;
  
  // Platform breakdown
  facebookSpend: number;
  instagramSpend: number;
  facebookImpressions: number;
  instagramImpressions: number;
  
  // Time period
  daysActive: number;
  firstSeen: string;
  lastSeen: string;
}
```

### Creative Gallery Features
- **Grid:** 3 columns desktop, 2 mobile, 1 small mobile
- **Thumbnail Display:** 150x150px with aspect ratio maintained
- **Video Indicators:** Play icon overlay for video creatives
- **Carousel Indicators:** Multi-image icon for carousels
- **Performance Badges:** Top performer, High CTR, etc.
- **Click to Expand:** Modal with full creative and detailed metrics

### Filters
- **Platform:** All, Facebook Only, Instagram Only
- **Creative Type:** All, Image, Video, Carousel  
- **Performance:** All, Top Performers, High CTR, Low Cost
- **Date Range:** Last 7/30/60/90 days
- **Sort:** Spend, Impressions, CTR, Conversions

---

## 📅 Tab 4: Creative Calendar (NEW)

### Monthly Calendar View
Inspired by the Facebook image you shared:

```
┌─────────────────────────────────────────────────────────────┐
│                     January 2025                           │
├─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┤
│ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │     │     │     │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│     │     │ 1   │ 2   │ 3   │ 4   │ 5   │     │     │     │
│     │     │[Ad1]│[Ad2]│[Ad3]│[Ad4]│[Ad5]│     │     │     │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ 6   │ 7   │ 8   │ 9   │ 10  │ 11  │ 12  │     │     │     │
│[Ad6]│[Ad7]│[Ad8]│[Ad9]│[Ad10]│[Ad11]│[Ad12]│    │     │     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

### Calendar Cell Structure
Each date cell shows active creatives for that day:
```typescript
interface CalendarCreative {
  creativeId: string;
  thumbnail: string;            // 50x50px thumbnail
  platform: 'Facebook' | 'Instagram';
  creativeType: 'Photo' | 'Video' | 'Carousel';
  
  // Key metrics for the day
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  
  // Video-specific (like Facebook image)
  hookRate?: number;            // For videos
  threeSecondViews?: number;    // For videos
  
  // Engagement indicators
  engagement: number;           // likes + comments + shares
  reach: number;
}
```

### Calendar Features
- **Month Navigation:** Previous/Next month buttons
- **Creative Thumbnails:** 50x50px with platform indicator
- **Hover Details:** Popup with key metrics
- **Click to Drill Down:** Open creative detail modal
- **Platform Icons:** Small FB/IG icons on thumbnails
- **Performance Indicators:** Color-coded borders (green=good, yellow=ok, red=poor)
- **Density Control:** Show top 3 performers per day to avoid clutter

### Calendar Legend
- **Platform Icons:** Facebook (F), Instagram (IG)
- **Creative Types:** Photo, Video, Carousel icons
- **Performance:** Green (top quartile), Yellow (mid), Red (bottom quartile)
- **Metrics:** Hover shows Reach, Engagement, CTR, Hook Rate

---

## 🔌 API Endpoints Design

### 1. Overview Metrics
```typescript
GET /api/meta-ads/overview-metrics
Query Parameters:
  - days: number (default: 30)
  - referenceDate: string (ISO date)
  - comparisonDays: number (default: 30)

Response: MetaAdsKPIs
```

### 2. Performance Chart Data  
```typescript
GET /api/meta-ads/performance-chart
Query Parameters:
  - days: number (default: 30)
  - referenceDate: string
  - metrics: string[] (spend,bookings,impressions,clicks)

Response: {
  dates: string[],
  spend: number[],
  bookings: number[],
  impressions: number[],
  clicks: number[]
}
```

### 3. Platform Breakdown
```typescript
GET /api/meta-ads/platform-breakdown  
Query Parameters:
  - days: number (default: 30)
  - referenceDate: string

Response: {
  facebook: {
    spend: number,
    bookings: number, 
    impressions: number,
    clicks: number,
    ctr: number,
    conversions: number
  },
  instagram: { ... },
  comparison: {
    spendSplit: { facebook: number, instagram: number },
    bookingSplit: { facebook: number, instagram: number }
  }
}
```

### 4. Campaign Performance
```typescript
GET /api/meta-ads/campaigns
Query Parameters:
  - days: number (default: 30)
  - referenceDate: string
  - sortBy: string (spend|bookings|ctr)
  - platform: string (all|facebook|instagram)
  - limit: number (default: 20)
  - offset: number (default: 0)

Response: {
  campaigns: MetaCampaignRow[],
  total: number,
  hasMore: boolean
}
```

### 5. Creative Gallery
```typescript
GET /api/meta-ads/creatives
Query Parameters:
  - days: number (default: 30)
  - referenceDate: string
  - platform: string (all|facebook|instagram)
  - creativeType: string (all|image|video|carousel)
  - sortBy: string (spend|impressions|ctr)
  - limit: number (default: 24)
  - offset: number (default: 0)

Response: {
  creatives: MetaCreativeCard[],
  total: number,
  hasMore: boolean
}
```

### 6. Creative Calendar
```typescript
GET /api/meta-ads/calendar
Query Parameters:
  - year: number
  - month: number (1-12)
  - platform: string (all|facebook|instagram)

Response: {
  [date: string]: CalendarCreative[]
}
```

### 7. Meta Bookings Calculation
```typescript
GET /api/meta-ads/bookings
Query Parameters:
  - startDate: string
  - endDate: string
  - platform: string (all|facebook|instagram)

Response: {
  totalBookings: number,
  facebookBookings: number,
  instagramBookings: number,
  bookingsByDate: {
    [date: string]: {
      facebook: number,
      instagram: number,
      total: number
    }
  }
}
```

---

## 🗄️ Database Queries

### Core Performance Query Pattern
```sql
-- Base creative performance with metadata
SELECT 
  c.creative_id,
  c.creative_name,
  c.creative_type,
  c.thumbnail_url,
  c.image_url,
  c.title,
  c.body,
  
  -- Aggregated performance
  SUM(cp.impressions) as total_impressions,
  SUM(cp.clicks) as total_clicks,
  SUM(cp.spend_cents) as total_spend_cents,
  SUM(cp.conversions) as total_conversions,
  SUM(cp.reach) as total_reach,
  AVG(cp.ctr) as avg_ctr,
  AVG(cp.frequency) as avg_frequency,
  
  -- Time range
  MIN(cp.date) as first_seen,
  MAX(cp.date) as last_seen,
  COUNT(DISTINCT cp.date) as days_active

FROM marketing.meta_ads_ad_creatives c
LEFT JOIN marketing.meta_ads_creative_performance cp ON c.creative_id = cp.creative_id
WHERE cp.date BETWEEN $1 AND $2
GROUP BY c.creative_id, c.creative_name, c.creative_type, c.thumbnail_url, 
         c.image_url, c.title, c.body
ORDER BY total_spend_cents DESC;
```

### Platform Split Query
```sql
-- Platform breakdown via campaign/adset targeting
SELECT 
  CASE 
    WHEN targeting_data->>'publisher_platforms' LIKE '%facebook%' 
         AND targeting_data->>'publisher_platforms' LIKE '%instagram%' 
    THEN 'Both'
    WHEN targeting_data->>'publisher_platforms' LIKE '%facebook%' 
    THEN 'Facebook'
    WHEN targeting_data->>'publisher_platforms' LIKE '%instagram%' 
    THEN 'Instagram'
    ELSE 'Unknown'
  END as platform,
  
  SUM(cp.spend_cents) as platform_spend,
  SUM(cp.impressions) as platform_impressions,
  SUM(cp.clicks) as platform_clicks
  
FROM marketing.meta_ads_creative_performance cp
JOIN marketing.meta_ads_ads a ON cp.ad_id = a.ad_id
JOIN marketing.meta_ads_ad_sets ads ON a.adset_id = ads.adset_id
WHERE cp.date BETWEEN $1 AND $2
GROUP BY platform;
```

### Meta Bookings Query
```sql
-- Simple referral source calculation from simple plan
SELECT 
  date,
  SUM(CASE WHEN referral_source = 'Facebook' THEN 1 ELSE 0 END) as facebook_bookings,
  SUM(CASE WHEN referral_source = 'Instagram' THEN 1 ELSE 0 END) as instagram_bookings,
  SUM(CASE WHEN referral_source IN ('Facebook', 'Instagram') THEN 1 ELSE 0 END) as meta_bookings
FROM public.bookings 
WHERE date BETWEEN $1 AND $2
  AND status = 'confirmed'
  AND referral_source IN ('Facebook', 'Instagram')
GROUP BY date
ORDER BY date;
```

### Calendar View Query
```sql
-- Creative activity by date for calendar
SELECT 
  cp.date,
  c.creative_id,
  c.thumbnail_url,
  c.creative_type,
  cp.impressions,
  cp.clicks,
  cp.spend_cents,
  cp.ctr,
  cp.reach,
  
  -- Platform detection (simplified)
  COALESCE(ads.publisher_platforms, 'Both') as platform
  
FROM marketing.meta_ads_creative_performance cp
JOIN marketing.meta_ads_ad_creatives c ON cp.creative_id = c.creative_id
LEFT JOIN marketing.meta_ads_ads a ON cp.ad_id = a.ad_id
LEFT JOIN marketing.meta_ads_ad_sets ads ON a.adset_id = ads.adset_id
WHERE cp.date BETWEEN $1 AND $2
  AND cp.impressions > 0
ORDER BY cp.date, cp.impressions DESC;
```

---

## 🎨 UI/UX Design Specifications

### Color Scheme (Meta Brand Alignment)
```css
:root {
  --meta-blue: #1877F2;        /* Facebook Blue */
  --meta-gradient: linear-gradient(135deg, #1877F2 0%, #E91E63 100%);
  --instagram-gradient: linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCB045 100%);
  --success-green: #42B883;    /* Good performance */
  --warning-yellow: #F59E0B;   /* Average performance */
  --danger-red: #EF4444;       /* Poor performance */
}
```

### Typography
- **Headers:** Inter, 24px/28px, weight 600
- **Subheaders:** Inter, 18px/22px, weight 500  
- **Body:** Inter, 14px/20px, weight 400
- **Metrics:** JetBrains Mono, 16px/24px, weight 500

### Layout Specifications

#### Desktop (1200px+)
- **KPI Cards:** 4 cards per row, 290px width
- **Creative Gallery:** 4 cards per row, 280px width  
- **Calendar:** 7 columns (Sun-Sat), equal width
- **Tables:** Full width with sticky headers

#### Tablet (768px - 1199px)  
- **KPI Cards:** 2 cards per row
- **Creative Gallery:** 3 cards per row
- **Calendar:** 7 columns with horizontal scroll
- **Tables:** Horizontal scroll, important columns first

#### Mobile (< 768px)
- **KPI Cards:** 1 card per row, full width
- **Creative Gallery:** 2 cards per row  
- **Calendar:** 1 week view with swipe navigation
- **Tables:** Card layout instead of table

### Creative Card Design
```
┌─────────────────────────────┐
│  [Thumbnail 150x150]       │ ← Platform icon overlay (FB/IG)
│  ┌─────┐                   │ ← Creative type badge
│  │ ▶   │ "Video Ad Title"  │ ← Play button for videos
│  └─────┘                   │
├─────────────────────────────┤
│ ฿1,250 • 45K views • 2.3%  │ ← Key metrics row
│ 📱 Instagram • 5 days      │ ← Platform & duration
└─────────────────────────────┘
```

---

## 📱 Mobile Responsiveness

### Touch Targets
- **Minimum:** 44px x 44px for all interactive elements
- **Buttons:** 48px height minimum  
- **Tab Navigation:** Horizontal scroll on mobile

### Gestures
- **Swipe:** Navigate calendar weeks/months
- **Pinch:** Zoom creative thumbnails (calendar view)
- **Pull to Refresh:** Update data
- **Long Press:** Quick actions menu

### Mobile-Specific Features
- **Simplified Filters:** Drawer instead of inline
- **Condensed Tables:** Card layout for performance data
- **Sticky Elements:** Date picker, tab navigation
- **Optimized Images:** WebP format, lazy loading

---

## 🔄 Data Refresh Strategy

### Real-time Updates
- **Meta API Data:** Refresh every 4 hours (API rate limits)
- **Booking Data:** Real-time from database  
- **Page Load:** On-demand calculations

### Caching Strategy  
```typescript
// Cache configuration
const cacheConfig = {
  overviewMetrics: 60 * 60 * 1000,      // 1 hour
  performanceChart: 30 * 60 * 1000,     // 30 minutes  
  creativeGallery: 60 * 60 * 1000,      // 1 hour
  calendarData: 2 * 60 * 60 * 1000,     // 2 hours
  metaBookings: 15 * 60 * 1000,         // 15 minutes
};
```

### Loading States
- **Initial Load:** Skeleton screens for all components
- **Partial Updates:** Refresh indicators on individual sections
- **Background Sync:** Toast notifications for data updates
- **Error States:** Retry mechanisms with exponential backoff

---

## 🔧 Implementation Timeline

### Week 1: Foundation (Nov 4-8)
- [ ] Create page structure `/admin/meta-ads-dashboard`
- [ ] Implement basic routing and tab navigation
- [ ] Build MetaAdsKPICards component  
- [ ] Create `/api/meta-ads/overview-metrics` endpoint
- [ ] Add link from main marketing dashboard

### Week 2: Overview Tab (Nov 11-15)
- [ ] Build MetaAdsPerformanceChart component
- [ ] Create `/api/meta-ads/performance-chart` endpoint
- [ ] Implement MetaAdsPlatformBreakdown component
- [ ] Create `/api/meta-ads/platform-breakdown` endpoint
- [ ] Add Meta bookings calculation logic

### Week 3: Campaigns Tab (Nov 18-22)
- [ ] Build MetaAdsCampaignTable component
- [ ] Create `/api/meta-ads/campaigns` endpoint  
- [ ] Implement campaign name parsing utility
- [ ] Add filtering and sorting functionality
- [ ] Export functionality for campaign data

### Week 4: Creative Gallery (Nov 25-29)
- [ ] Build MetaAdsCreativeGallery component
- [ ] Create `/api/meta-ads/creatives` endpoint
- [ ] Implement creative card design
- [ ] Add creative filters and sorting
- [ ] Creative detail modal

### Week 5: Creative Calendar (Dec 2-6)
- [ ] Build MetaAdsCreativeCalendar component  
- [ ] Create `/api/meta-ads/calendar` endpoint
- [ ] Implement month navigation
- [ ] Add creative hover details
- [ ] Performance indicators and legend

### Week 6: Polish & Mobile (Dec 9-13)
- [ ] Mobile responsive design
- [ ] Performance optimizations
- [ ] Error handling and loading states  
- [ ] User testing and feedback
- [ ] Documentation updates

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// API endpoint tests
describe('/api/meta-ads/overview-metrics', () => {
  it('returns correct KPI calculations')
  it('handles date range validation') 
  it('calculates Meta bookings correctly')
})

// Component tests  
describe('MetaAdsCreativeGallery', () => {
  it('renders creative cards correctly')
  it('handles empty state gracefully')
  it('filters creatives by platform')
})
```

### Integration Tests
- **Database Queries:** Verify query performance and accuracy
- **API Response Times:** Ensure < 2 second response times
- **Data Consistency:** Cross-reference with Meta Marketing API

### User Acceptance Tests
- **Navigation:** Seamless tab switching and filtering
- **Mobile Usage:** Touch-friendly on tablets and phones  
- **Performance:** Dashboard loads within 3 seconds
- **Accuracy:** Metrics match external Meta Ads Manager

---

## 🚀 Success Metrics

### Performance Benchmarks
- **Page Load Time:** < 3 seconds on 3G connection
- **Time to Interactive:** < 5 seconds  
- **API Response Time:** < 2 seconds for all endpoints
- **Memory Usage:** < 100MB client-side

### User Experience Goals
- **Mobile Usability Score:** 90+ in PageSpeed Insights
- **Accessibility Score:** AA compliance (WCAG 2.1)
- **User Task Completion:** 95% success rate for key flows
- **Error Rate:** < 1% for critical user journeys

### Business Value Targets
- **Usage Adoption:** 80% of marketing team using monthly
- **Decision Speed:** 50% faster creative performance analysis
- **Campaign Optimization:** 20% improvement in cost per booking
- **Creative ROI:** 15% better identification of top performers

---

## 📚 Additional Considerations

### Campaign Name Parsing
```typescript
// Utility to clean "marketyze" campaign names
function parseMetaCampaignName(rawName: string): string {
  // Remove "marketyze" prefix variations
  let cleaned = rawName.replace(/^marketyze[_\s-]*/i, '');
  
  // Parse common patterns:
  // "LENGOLF_Q4_2024_Video_Campaign" → "Q4 2024 Video Campaign"
  cleaned = cleaned
    .replace(/LENGOLF[_\s-]*/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w+/g, word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
    
  return cleaned || rawName; // Fallback to original if parsing fails
}
```

### Error Boundaries
```typescript
// Graceful error handling for API failures
class MetaAdsDashboardErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring service
    console.error('Meta Ads Dashboard Error:', error, errorInfo);
    
    // Show user-friendly message
    this.setState({ 
      hasError: true,
      errorMessage: 'Unable to load Meta Ads data. Please try refreshing.'
    });
  }
}
```

### Performance Optimizations
- **Virtual Scrolling:** For large creative galleries
- **Image Lazy Loading:** Progressive loading of creative thumbnails
- **Data Pagination:** 20-50 items per page maximum
- **Bundle Splitting:** Separate chunks for each tab
- **Service Worker:** Cache static assets and API responses

---

## 📄 File Structure

```
/admin/meta-ads-dashboard/
├── page.tsx                          # Main dashboard page
├── loading.tsx                       # Loading UI
└── error.tsx                         # Error boundary

/api/meta-ads/
├── overview-metrics/route.ts         # KPIs endpoint
├── performance-chart/route.ts        # Chart data
├── platform-breakdown/route.ts      # FB vs IG data  
├── campaigns/route.ts                # Campaign table
├── creatives/route.ts                # Creative gallery
├── calendar/route.ts                 # Calendar view
└── bookings/route.ts                 # Meta bookings calc

/src/components/meta-ads-dashboard/
├── MetaAdsDashboard.tsx              # Main container
├── MetaAdsHeader.tsx                 # Controls & navigation
├── MetaAdsKPICards.tsx              # 8 KPI cards
├── MetaAdsPerformanceChart.tsx      # Main trend chart
├── MetaAdsPlatformBreakdown.tsx     # FB vs IG comparison
├── MetaAdsCampaignTable.tsx         # Campaign performance
├── MetaAdsCreativeGallery.tsx       # Creative grid view
├── MetaAdsCreativeCalendar.tsx      # Monthly calendar
├── MetaAdsCreativeCard.tsx          # Individual creative
└── MetaAdsFilters.tsx               # Reusable filters

/src/hooks/
└── useMetaAdsDashboard.ts            # Custom hook for data

/src/lib/meta-ads/
├── api.ts                            # API client functions
├── utils.ts                          # Parsing & formatting
├── types.ts                          # TypeScript interfaces  
└── constants.ts                      # Configuration values
```

---

**This comprehensive plan provides a complete roadmap for implementing a Meta Ads dashboard that follows the simple plan principles while adding the requested creative calendar view and deep-dive analytics capabilities. The dashboard will be mobile-responsive, performant, and provide actionable insights for optimizing Meta advertising campaigns.**