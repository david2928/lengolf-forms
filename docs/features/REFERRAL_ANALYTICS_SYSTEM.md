# Referral Analytics System Documentation

## Overview

The Referral Analytics System provides comprehensive tracking and analysis of customer referral sources across the Lengolf Forms golf academy management system. This system integrates data from multiple sources to provide real-time insights into customer acquisition channels, referral effectiveness, and marketing performance.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Sources](#data-sources)
3. [Analytics Dashboard](#analytics-dashboard)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Technical Implementation](#technical-implementation)
7. [Recent Fixes and Improvements](#recent-fixes-and-improvements)
8. [Usage Guide](#usage-guide)
9. [Troubleshooting](#troubleshooting)

## System Architecture

### Data Flow Overview

```
Booking System → referral_source field → Database
     ↓
Analytics Engine → Data Processing → Dashboard Display
     ↓
Weekly/Monthly Reports → Business Intelligence
```

### Key Components

1. **Data Collection Layer**
   - Booking form referral source capture
   - POS system integration
   - Historical data migration

2. **Processing Layer**
   - SQL functions for data aggregation
   - Multi-source data reconciliation
   - Real-time analytics computation

3. **Presentation Layer**
   - Interactive dashboard components
   - Weekly/Monthly breakdown tables
   - Export functionality

## Data Sources

### Primary Data Sources

#### 1. Bookings Table (`bookings`)
- **Purpose**: Primary source for current referral data
- **Key Fields**: 
  - `referral_source` (TEXT): Customer's referral source
  - `is_new_customer` (BOOLEAN): New customer flag
  - `date` (DATE): Booking date
  - `status` (TEXT): Booking status (confirmed/cancelled)
- **Usage**: Used for data from July 9, 2025 onwards

#### 2. Legacy Referral Data (`referral_data`)
- **Purpose**: Historical referral analytics data
- **Key Fields**:
  - `date` (DATE): Data date
  - `referral_source` (TEXT): Referral source
  - `count` (INTEGER): Number of customers
- **Usage**: Used for historical data before July 9, 2025

#### 3. POS Sales Data (`pos.lengolf_sales`)
- **Purpose**: Customer first-seen date calculation
- **Key Fields**:
  - `customer_phone_number` (TEXT): Customer identifier
  - `date` (DATE): Transaction date
  - `is_voided` (BOOLEAN): Transaction validity
- **Usage**: Determines new customer counts for analytics

### Data Integration Strategy

The system uses a hybrid approach:
- **Recent Data (July 9, 2025+)**: Direct from `bookings` table
- **Historical Data (Before July 9, 2025)**: From `referral_data` table
- **Customer Counts**: Calculated from POS sales data

## Analytics Dashboard

### Dashboard Location
- **URL**: `http://localhost:3000/admin/sales-dashboard`
- **Tab**: "Referral Analytics"
- **Access**: Admin users only

### Dashboard Components

#### 1. Summary Cards
- **Total New Customers**: Aggregate count across all sources
- **Top Channel**: Highest performing referral source
- **Growing Channel**: Source with highest growth rate
- **Declining Channel**: Source with negative trend

#### 2. Visualization Charts
- **Referral Source Distribution (Pie Chart)**
  - Shows percentage breakdown of all referral sources
  - Color-coded by source type
  - Interactive tooltips

- **Customer Count by Source (Bar Chart)**
  - Horizontal bar chart showing customer counts
  - Sorted by volume
  - Filterable by time period

- **Trend Analysis (Line Chart)**
  - Monthly/Weekly trend visualization
  - Multi-line chart with source breakdown
  - Time-based filtering

#### 3. Data Tables

##### Weekly Referral Breakdown Table
- **Structure**: Horizontal layout with referral sources as rows
- **Columns**: Week periods (most recent first)
- **Data**: Customer counts and percentages
- **Features**:
  - Sticky source column
  - Week number display (W29, W30, etc.)
  - Hover tooltips with full date ranges
  - Color-coded source indicators

##### Monthly Referral Breakdown Table
- **Structure**: Similar to weekly but with monthly periods
- **Columns**: Month periods
- **Data**: Aggregated monthly customer counts
- **Features**:
  - Monthly trend analysis
  - Year-over-year comparisons

### Analysis Types

#### 1. Daily Analysis
- **Granularity**: Daily customer acquisition
- **Data Source**: Combined booking and POS data
- **Use Case**: Short-term trend analysis

#### 2. Weekly Analysis
- **Granularity**: Weekly customer acquisition
- **Week Definition**: Monday-Sunday (ISO week)
- **Current Week**: Real-time updates
- **Use Case**: Weekly performance reviews

#### 3. Monthly Analysis
- **Granularity**: Monthly customer acquisition
- **Month Definition**: Calendar month
- **Use Case**: Monthly reporting and planning

## API Endpoints

### Primary Endpoint

#### POST `/api/sales/referral-analytics`

**Request Body:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2025-12-31",
  "analysisType": "weekly" | "monthly" | "daily"
}
```

**Response Structure:**
```json
{
  "analysisType": "weekly",
  "data": [
    {
      "week_start": "2025-07-14",
      "week_end": "2025-07-20",
      "referral_source": "Google",
      "customer_count": 10,
      "percentage": 66.67,
      "total_new_customers": 15,
      "data_method": "pos_with_bookings_referral_data"
    }
  ],
  "summary": {
    "totalCustomers": 571,
    "sourceBreakdown": {
      "Google": {
        "count": 288,
        "percentage": 50.44
      }
    },
    "weeklyTrends": {
      "2025-07-14 - 2025-07-20": {
        "total": 14,
        "sources": {
          "Google": 10,
          "TikTok": 1
        }
      }
    },
    "dataSourceBreakdown": {
      "pos_with_bookings_referral_data": 14,
      "historical_csv_with_pos_counts": 557
    },
    "weeksAnalyzed": 12
  }
}
```

### Data Method Types

- **`pos_with_bookings_referral_data`**: Current week data from bookings
- **`historical_csv_with_pos_counts`**: Historical data from legacy system
- **`pos_only_no_referral_data`**: POS data without referral information

## Database Schema

### Core Tables

#### bookings
```sql
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL,
  referral_source TEXT,
  is_new_customer BOOLEAN DEFAULT false,
  date DATE NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### referral_data
```sql
CREATE TABLE referral_data (
  date DATE,
  referral_source TEXT,
  count INTEGER
);
```

### Key Functions

#### get_pos_weekly_referral_analytics()
- **Purpose**: Primary analytics function for weekly data
- **Returns**: Weekly referral breakdown with customer counts
- **Logic**: Hybrid data source approach with intelligent fallback

**Function Signature:**
```sql
get_pos_weekly_referral_analytics(weeks_back INTEGER DEFAULT 12)
RETURNS TABLE (
  week_start DATE,
  week_end DATE,
  referral_source TEXT,
  customer_count INTEGER,
  percentage NUMERIC,
  total_new_customers INTEGER,
  data_method TEXT
)
```

## Technical Implementation

### Frontend Components

#### 1. ReferralAnalyticsReport Component
- **Location**: `src/components/admin/sales/referral-analytics-report.tsx`
- **Purpose**: Main dashboard component
- **Features**:
  - Toggle between weekly/monthly views
  - Interactive charts with Recharts
  - Data export functionality
  - Real-time data refreshing

#### 2. Dashboard Integration
- **Location**: `app/admin/sales-dashboard/page.tsx`
- **Integration**: Tab-based navigation
- **State Management**: React hooks for data fetching

### Backend Processing

#### 1. Data Processing Pipeline
1. **Data Collection**: Referral sources captured in booking form
2. **Data Storage**: Stored in `bookings.referral_source` field
3. **Analytics Processing**: SQL functions aggregate data
4. **API Response**: Formatted for dashboard consumption

#### 2. Week Calculation Logic
- **Current Week**: `DATE_TRUNC('week', CURRENT_DATE)`
- **Week Range**: Monday to Sunday (ISO standard)
- **Historical Weeks**: Calculated backwards from current week

#### 3. Data Reconciliation
- **New Customer Identification**: First appearance in POS data
- **Referral Attribution**: Matched to booking referral source
- **Data Validation**: Confirmed bookings only

## Recent Fixes and Improvements

### Issue Resolution (July 17, 2025)

#### Problem Identified
- Weekly referral breakdown table was not showing the current week
- Current week (July 14-20, 2025) had 15 new customers but showed as "Unknown"
- Data pipeline was not utilizing booking referral data

#### Root Cause Analysis
1. **Week Calculation Bug**: Function used `((i-1) || ' weeks')` causing week 0 to be next week instead of current week
2. **Data Source Gap**: `referral_data` table only had data through July 8, 2025
3. **Missing Integration**: Analytics function wasn't checking bookings table for recent referral data

#### Solution Implemented
1. **Fixed Week Calculation**: Changed to `(i || ' weeks')` for proper current week calculation
2. **Hybrid Data Source**: Updated function to use bookings table for recent data (July 9+)
3. **Data Method Tracking**: Added `data_method` field to identify data source
4. **Real-time Updates**: Current week now shows live referral data from bookings

#### Results
- ✅ Current week (July 14-20, 2025) now displays with actual referral sources
- ✅ Google: 10 customers (66.67%), TikTok: 1 customer (8.33%), etc.
- ✅ Automatic updates as new bookings are created
- ✅ Maintains historical data accuracy

### Performance Improvements
- **Query Optimization**: Efficient CTE-based data processing
- **Caching Strategy**: API response caching for dashboard performance
- **Real-time Updates**: Live data refresh without page reload

## Usage Guide

### For Business Users

#### Accessing Referral Analytics
1. Navigate to Admin Sales Dashboard
2. Click "Referral Analytics" tab
3. Select analysis type (Weekly/Monthly)
4. View summary cards and charts

#### Interpreting Data
- **Total New Customers**: All new customers in selected period
- **Top Channel**: Most effective referral source
- **Growing/Declining Channels**: Trend analysis for optimization
- **Weekly Breakdown**: Detailed week-by-week performance

#### Exporting Data
1. Click "Export CSV" button
2. Choose desired time period
3. Download formatted CSV file

### For Developers

#### Adding New Referral Sources
1. Update booking form with new source options
2. Ensure `referral_source` field captures new values
3. Update color mapping in dashboard component
4. Test analytics calculation

#### Modifying Analytics Logic
1. Edit `get_pos_weekly_referral_analytics()` function
2. Update API endpoint processing
3. Modify frontend components as needed
4. Test with various date ranges

## Troubleshooting

### Common Issues

#### Current Week Not Showing
- **Symptoms**: Current week appears as "Unknown" or missing
- **Cause**: Data pipeline issue or week calculation bug
- **Solution**: Verify bookings table has referral data for current week

#### Incorrect Customer Counts
- **Symptoms**: Customer counts don't match POS data
- **Cause**: New customer identification logic error
- **Solution**: Check first-seen date calculation in POS data

#### Missing Historical Data
- **Symptoms**: Older weeks show no data
- **Cause**: `referral_data` table missing entries
- **Solution**: Verify historical data migration

### Debug Steps

1. **Check Data Sources**:
   ```sql
   SELECT date, referral_source, COUNT(*) 
   FROM bookings 
   WHERE date >= '2025-07-14' 
   GROUP BY date, referral_source;
   ```

2. **Verify Analytics Function**:
   ```sql
   SELECT * FROM get_pos_weekly_referral_analytics(4);
   ```

3. **Test API Endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/sales/referral-analytics \
   -H "Content-Type: application/json" \
   -d '{"analysisType": "weekly", "startDate": "2025-07-01", "endDate": "2025-07-31"}'
   ```

### Data Validation

#### Referral Source Validation
- **Google**: Search engine referrals
- **Facebook**: Social media referrals
- **Instagram**: Social media referrals
- **TikTok**: Social media referrals
- **Friends**: Word-of-mouth referrals
- **Mall Advertisement**: Physical advertising
- **Other**: Miscellaneous sources
- **Unknown**: No referral source specified

#### Customer Count Validation
- Only confirmed bookings counted
- Only new customers (is_new_customer = true)
- Duplicate customers filtered by phone number
- Cancelled bookings excluded

## Future Enhancements

### Planned Features
1. **Advanced Filtering**: Date range selection, source filtering
2. **Comparative Analysis**: Period-over-period comparisons
3. **Predictive Analytics**: Trend forecasting
4. **Mobile Optimization**: Responsive dashboard design
5. **Real-time Alerts**: Performance threshold notifications

### Technical Improvements
1. **Data Pipeline Automation**: Scheduled data synchronization
2. **Performance Optimization**: Query caching and indexing
3. **Error Handling**: Comprehensive error reporting
4. **Testing Coverage**: Automated test suite

---

**Last Updated**: July 17, 2025  
**Version**: 1.0  
**Status**: Production Ready

This documentation covers the complete Referral Analytics System as implemented in the Lengolf Forms golf academy management system, including recent fixes and improvements made to ensure accurate current week reporting.