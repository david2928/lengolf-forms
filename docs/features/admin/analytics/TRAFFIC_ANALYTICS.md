# Traffic Analytics Dashboard

## Overview

The Traffic Analytics Dashboard provides Google Analytics 4 (GA4) traffic insights across all LENGOLF web properties. It aggregates data from the main website, booking application, and LIFF pages into a unified dashboard with KPI cards, daily trend charts, page-level drill-down, booking funnel analysis, and channel breakdowns.

**Location**: `/admin/traffic-analytics`
**Access Level**: Authenticated users (admin recommended)
**Primary Purpose**: Unified web traffic monitoring with conversion tracking across all LENGOLF domains

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Features](#key-features)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [Component Architecture](#component-architecture)
6. [GA4 Integration](#ga4-integration)
7. [Property Filtering](#property-filtering)
8. [Funnel Analysis](#funnel-analysis)
9. [User Interface](#user-interface)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Components

```
┌─────────────────────┐
│  Google Analytics 4  │
│  (External ETL)      │
└─────────┬───────────┘
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    marketing schema (Supabase)                  │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ google_analytics_    │  │ google_analytics_    │           │
│  │ traffic              │  │ pages                │           │
│  └──────────────────────┘  └──────────────────────┘           │
│  ┌──────────────────────┐                                      │
│  │ google_analytics_    │                                      │
│  │ funnel               │                                      │
│  └──────────────────────┘                                      │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              GET /api/traffic-analytics                          │
│  Fetches current + comparison periods, aggregates KPIs,         │
│  channels, devices, pages, funnel data                          │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                Traffic Analytics Page                            │
│  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ KPI Cards  │ │ Overview │ │  Pages   │ │ Funnel   │       │
│  └────────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                              ┌──────────┐                      │
│                              │ Channels │                      │
│                              └──────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React 19 with client-side rendering, custom `useTrafficAnalytics` hook with in-memory caching (5-minute TTL)
- **Backend**: Next.js API route querying Supabase `marketing` schema
- **Data Source**: GA4 data populated by an external ETL service (not part of this application)
- **UI Components**: shadcn/ui Cards, Tabs, Select, Calendar, Badge

---

## Key Features

### KPI Cards (Always All Properties)

The dashboard displays 7 KPI cards with period-over-period comparison:

| KPI | Description | Trend Logic |
|-----|-------------|-------------|
| Sessions | Total sessions across all properties | Higher is better (green) |
| Avg. DAU | Total users divided by number of days | Higher is better |
| Avg. Daily New | Total new users divided by number of days | Higher is better |
| Page Views | Total page views | Higher is better |
| Bounce Rate | Session-weighted average bounce rate | **Inverse** -- lower is better (green) |
| Conversions | Total booking conversions | Higher is better |
| Conversion Rate | Conversions / Sessions as percentage | Higher is better |

Each KPI shows a percentage change badge comparing the current period against the equivalent prior period (e.g., last 30 days vs. the 30 days before that).

### Tab Views

The dashboard is organized into four tabs:

1. **Overview** -- Daily trend charts (sessions, users, conversions), device breakdown, channel breakdown, and top pages
2. **Pages** -- Detailed page-level analytics with property filtering, section classification, and per-page daily trends
3. **Funnel** -- 6-stage booking funnel analysis with channel-level breakdown and drop-off identification
4. **Channels** -- Channel performance table with sessions, users, conversions, and period-over-period change

### Controls

- **Property Filter**: All Properties, Website (`www.len.golf`), Booking App (`booking.len.golf`), LIFF Pages
- **Time Range**: 7, 30, 60, 90, 180, or 365 days
- **Reference Date**: Calendar picker (defaults to yesterday)
- **Refresh**: Manual refresh button that clears the client-side cache

---

## Database Schema

All traffic data resides in the `marketing` schema. Data is populated by an external ETL service.

### `marketing.google_analytics_traffic`

Aggregated daily traffic metrics by channel and device.

| Column | Type | Description |
|--------|------|-------------|
| `date` | date | Report date |
| `channel_grouping` | text | GA4 default channel grouping (Organic Search, Paid Search, Direct, etc.) |
| `device_category` | text | Device type (desktop, mobile, tablet) |
| `sessions` | integer | Session count |
| `users` | integer | Active user count |
| `new_users` | integer | New user count |
| `page_views` | integer | Total page views |
| `bounce_rate` | numeric | Bounce rate (0-100) |
| `avg_session_duration` | numeric | Average session duration in seconds |
| `booking_conversions` | integer | Booking conversion count |

### `marketing.google_analytics_pages`

Daily page-level metrics.

| Column | Type | Description |
|--------|------|-------------|
| `date` | date | Report date |
| `page_path` | text | Full page URL/path |
| `page_title` | text | Page title |
| `page_views` | integer | Page view count |
| `unique_page_views` | integer | Unique page view count |
| `entrances` | integer | Number of sessions starting on this page |
| `bounce_rate` | numeric | Page-level bounce rate |
| `avg_time_on_page` | numeric | Average time on page in seconds |
| `exit_rate` | numeric | Exit rate percentage |
| `booking_conversions` | integer | Booking conversions attributed to this page |

### `marketing.google_analytics_funnel`

Daily booking funnel stage data by channel.

| Column | Type | Description |
|--------|------|-------------|
| `date` | date | Report date |
| `channel_grouping` | text | Traffic channel |
| `stage_1_users` | integer | Landing Page users |
| `stage_2_users` | integer | Book Now Click users |
| `stage_3_users` | integer | Booking Page users |
| `stage_4_users` | integer | Form Start users |
| `stage_5_users` | integer | Login/Register users |
| `stage_6_users` | integer | Confirmation users |

---

## API Reference

### `GET /api/traffic-analytics`

Returns all traffic analytics data for the requested time range and property filter.

**Authentication**: Required (session or Bearer token)

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | `30` | Number of days in the reporting period |
| `referenceDate` | string (YYYY-MM-DD) | Yesterday | End date of the reporting period |
| `property` | string | `all` | Property filter: `all`, `www`, `booking`, `liff` |

**Response Shape**:

```json
{
  "kpis": {
    "sessions": 1234,
    "sessionsChange": 12.5,
    "users": 890,
    "usersChange": 8.3,
    "newUsers": 450,
    "newUsersChange": 15.2,
    "pageViews": 3500,
    "pageViewsChange": -2.1,
    "bounceRate": 45.6,
    "bounceRateChange": -5.3,
    "avgDuration": 120.5,
    "avgDurationChange": 3.8,
    "conversions": 25,
    "conversionsChange": 20.0,
    "conversionRate": 2.03,
    "conversionRateChange": 6.7
  },
  "topPages": [
    {
      "path": "https://www.len.golf/",
      "title": "LENGOLF - Golf Simulator Bangkok",
      "pageViews": 500,
      "uniquePageViews": 380,
      "entrances": 200,
      "bounceRate": 42.5,
      "avgTimeOnPage": 35.2,
      "exitRate": 30.1,
      "bookingConversions": 5,
      "property": "www",
      "section": "Home"
    }
  ],
  "pageDailyTrends": {
    "https://www.len.golf/": [
      { "date": "2026-03-01", "pageViews": 20, "uniquePageViews": 15, "entrances": 8, "conversions": 1 }
    ]
  },
  "funnelData": [
    {
      "channel": "Organic Search",
      "stage1Users": 500,
      "stage2Users": 200,
      "stage3Users": 150,
      "stage4Users": 100,
      "stage5Users": 80,
      "stage6Users": 25,
      "overallConversionRate": 5.0
    }
  ],
  "channelBreakdown": [
    {
      "channel": "Organic Search",
      "sessions": 600,
      "users": 450,
      "conversions": 12,
      "conversionRate": 2.0,
      "sessionsChange": 15.3,
      "conversionRateChange": 8.2
    }
  ],
  "channelDailyTrends": {},
  "deviceBreakdown": [
    { "device": "mobile", "sessions": 800, "percentage": 64.9, "conversionRate": 1.5 }
  ],
  "dailyTrends": [
    { "date": "2026-03-01", "sessions": 45, "users": 30, "conversions": 2, "conversionRate": 4.44 }
  ],
  "propertyFilter": "all"
}
```

**Period Comparison Logic**: The API automatically calculates a comparison period of equal length immediately preceding the current period. For example, with `days=30` and `referenceDate=2026-03-20`, the current period is Feb 19 -- Mar 20 and the comparison period is Jan 20 -- Feb 18.

**Important**: KPIs, funnel data, channel breakdown, and device breakdown always reflect all properties regardless of the `property` filter. The property filter only affects `topPages` and `pageDailyTrends`.

---

## Component Architecture

### Page Component

**File**: `app/admin/traffic-analytics/page.tsx`

Client-side rendered page that manages filter state (time range, property, reference date, active tab) and passes data to child components.

### Hook

**File**: `src/hooks/useTrafficAnalytics.ts`

Custom hook with built-in caching:

- Uses an in-memory `SimpleCache` with 5-minute TTL
- Cache key is derived from `timeRange`, `property`, and `referenceDate`
- Manual refresh clears the cache entry before re-fetching
- Returns `isLoading` (initial load) and `isValidating` (refresh) states separately

### UI Components

| Component | File | Purpose |
|-----------|------|---------|
| `TrafficKPICards` | `src/components/traffic-analytics/TrafficKPICards.tsx` | 7 KPI cards with trend badges and skeleton loading |
| `TrafficOverview` | `src/components/traffic-analytics/TrafficOverview.tsx` | Daily trends chart, device breakdown, channel summary, top pages preview |
| `TrafficTopPages` | `src/components/traffic-analytics/TrafficTopPages.tsx` | Detailed page table with per-page trends, property and section classification |
| `TrafficFunnel` | `src/components/traffic-analytics/TrafficFunnel.tsx` | 6-stage funnel visualization with channel filter, drop-off analysis, and conversion stats |
| `TrafficChannels` | `src/components/traffic-analytics/TrafficChannels.tsx` | Channel performance table with period-over-period comparison |

---

## GA4 Integration

### Data Pipeline

GA4 data flows into the `marketing` schema through an **external ETL service** (not part of this application). The ETL populates three tables daily:

1. `google_analytics_traffic` -- Aggregated session-level data by channel and device
2. `google_analytics_pages` -- Page-level engagement metrics
3. `google_analytics_funnel` -- Booking funnel stage progression by channel

The dashboard reads from these pre-aggregated tables; it does not call the GA4 API directly.

### Tracked Properties

| Property | Domain | Filter Value |
|----------|--------|--------------|
| Website | `www.len.golf` / `len.golf` | `www` |
| Booking App | `booking.len.golf` (excluding `/liff/`) | `booking` |
| LIFF Pages | `booking.len.golf/liff/*` | `liff` |

---

## Property Filtering

The API classifies each page path into a property using URL pattern matching:

```
booking.len.golf/liff/*  --> liff
booking.len.golf/*       --> booking
www.len.golf/* or len.golf/*  --> www
```

When a property filter is active (not `all`), a badge appears:

> "Property filter affects page data only. KPIs, funnel, and channel data show all properties."

### Page Section Classification

Pages are further classified into content sections for grouping in the Pages tab:

| Section | URL Pattern |
|---------|-------------|
| Home | `/` (root) |
| Golf | `/golf*` |
| Lessons | `/lesson*`, `/coaching*` |
| Events | `/event*` |
| Tournaments | `/tournament*` |
| About | `/about*` |
| Blog | `/blog*`, `/news*` |
| Location | `/location*`, `/contact*` |
| Booking | `/booking*`, `/book*` |
| LIFF | `/liff*` |
| Other | Everything else |

Thai language pages (`/th/*`) are classified by the path after stripping the `/th/` prefix.

---

## Funnel Analysis

The Funnel tab visualizes a 6-stage booking conversion funnel:

| Stage | Name | Description |
|-------|------|-------------|
| 1 | Landing Page | User arrives on any LENGOLF page |
| 2 | Book Now Click | User clicks a "Book Now" CTA |
| 3 | Booking Page | User reaches the booking page |
| 4 | Form Start | User begins filling out the booking form |
| 5 | Login/Register | User authenticates or creates an account |
| 6 | Confirmation | Booking is completed |

### Funnel Features

- **Channel filter**: View funnel for all channels combined or a specific channel (Organic Search, Paid Search, Direct, etc.)
- **Drop-off analysis**: Automatically identifies the stage with the largest drop-off percentage
- **Key statistics**:
  - Overall Conversion Rate (Stage 1 to Stage 6)
  - Biggest Drop-off (stage name and percentage)
  - Form Completion Rate (Stage 4 to Stage 6)

---

## User Interface

### Filter Bar

Located at the top of the page:

1. **Property selector** -- Dropdown with All Properties, Website, Booking App, LIFF Pages
2. **Time range selector** -- 7, 30, 60, 90, 180, or 365 days
3. **Reference date picker** -- Calendar popover, defaults to yesterday
4. **Refresh button** -- Spinner animation while revalidating

### Loading States

- KPI cards display animated skeleton placeholders during initial load
- Tab content is hidden during loading (`!isLoading &&` guard)
- Refresh shows a spinning icon without hiding existing data

### Error Handling

- Red error banner displayed on API failure with a "try refreshing" message
- Console error logging for debugging

---

## Troubleshooting

### No Data Displayed

1. **Verify ETL is running** -- The external ETL service must be populating `marketing.google_analytics_*` tables
2. **Check date range** -- Ensure the reference date and time range cover a period with data
3. **Inspect browser console** -- Look for fetch errors or authentication issues
4. **Check API directly** -- `curl http://localhost:3000/api/traffic-analytics?days=7`

### Stale Data

- The client caches responses for 5 minutes; click the refresh button to force a fresh fetch
- The ETL service populates data daily; same-day data may not yet be available

### Property Filter Not Working

The property filter only affects page data (top pages and page daily trends). KPIs, funnel, channel, and device data always show all properties. This is by design.

---

*Last updated: 2026-03-21*
