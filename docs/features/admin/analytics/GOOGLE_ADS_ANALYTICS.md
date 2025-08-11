# Google Ads Analytics System

## Overview

The Google Ads Analytics System provides comprehensive tracking and analysis of Google Ads campaigns integrated with the Lengolf booking and sales systems. It offers two primary dashboards for different analytical needs.

## Features

### 1. Operational Dashboard (`/admin/google-ads`)
Real-time campaign performance tracking with:
- **Campaign Performance Metrics**: Cost, clicks, impressions, CTR, CPC
- **Time-based Analytics**: Daily, weekly, monthly performance trends
- **Campaign Type Distribution**: Visual breakdown by campaign type
- **Keyword Performance**: Detailed keyword-level metrics and recommendations
- **Performance Comparison**: Period-over-period analysis

### 2. Strategic Dashboard (`/admin/google-ads-strategic`)
Business-focused strategic insights including:
- **Booking Attribution**: Direct correlation between ad spend and bookings
- **ROI Analysis**: Cost per booking and revenue metrics
- **Campaign Opportunity Scoring**: AI-powered recommendations for optimization
- **Actionable Insights**: Prioritized action items based on performance data
- **Trend Analysis**: Long-term performance patterns and predictions

## API Endpoints

### Core Analytics APIs
- `GET /api/google-ads/analytics` - Fetch campaign analytics data
- `GET /api/google-ads/campaign-comparison` - Compare campaign performance across periods
- `GET /api/google-ads/performance-comparison` - Overall performance metrics comparison
- `GET /api/google-ads/keywords` - Keyword-level performance data
- `GET /api/google-ads/booking-correlation` - Correlate ad spend with bookings

### Data Sync
- `POST /api/google-ads/sync` - Sync latest Google Ads data
- `GET /api/google-ads/test-connection` - Test Google Ads API connectivity

## Database Schema

The system uses the `marketing` schema with the following key tables:
- `google_ads_campaigns` - Campaign metadata
- `google_ads_campaign_performance` - Daily performance metrics
- `google_ads_keywords` - Keyword performance data
- `google_ads_ad_groups` - Ad group organization

## Implementation

### Components
- `GoogleAdsAnalytics.tsx` - Operational dashboard component
- `GoogleAdsPivotDashboard.tsx` - Interactive pivot analysis
- `GoogleAdsStrategicDashboard.tsx` - Strategic insights dashboard

### Key Features
1. **Real-time Data Sync**: Automatic synchronization with Google Ads API
2. **Hybrid Attribution**: Combines Google tracking with POS referral data
3. **Smart Caching**: Optimized queries with intelligent caching
4. **Responsive Design**: Mobile-friendly dashboards
5. **Export Capabilities**: CSV export for all data views

## Security & Permissions

- Requires admin role for access
- Google Ads API credentials stored securely in environment variables
- Read-only access to Google Ads data
- Audit logging for all data sync operations

## Performance Optimizations

- Incremental data sync to minimize API calls
- Aggregated data storage for fast queries
- Client-side caching for dashboard interactions
- Lazy loading of detailed views

## Integration Points

### POS System
- Links ad performance to actual sales transactions
- Tracks customer referral sources
- Calculates true ROI based on revenue

### Booking System
- Correlates ad clicks with booking conversions
- Tracks booking values by campaign source
- Measures campaign effectiveness

## Usage Guidelines

### For Marketing Teams
1. Check Strategic Dashboard daily for actionable insights
2. Review opportunity scores to prioritize optimization efforts
3. Monitor booking correlation to understand true ROI
4. Export data for external reporting

### For Operations
1. Use Operational Dashboard for detailed campaign management
2. Monitor keyword performance for bid adjustments
3. Track period comparisons for trend analysis
4. Review campaign type distribution for budget allocation

## Troubleshooting

### Common Issues
- **No Data Showing**: Check Google Ads API connection and credentials
- **Sync Failures**: Verify API quotas and rate limits
- **Mismatched Data**: Ensure POS referral tracking is properly configured
- **Slow Loading**: Check database indexes and query performance

## Future Enhancements
- Automated bid management based on performance
- Predictive analytics for campaign planning
- Integration with other marketing platforms
- Advanced attribution modeling