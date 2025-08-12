# Meta Ads Integration Setup Guide

This guide covers the setup and configuration of Meta Ads data extraction for the Lengolf Forms application, following the same patterns established for Google Ads analytics.

## Overview

The Meta Ads integration provides:
- **Data Extraction**: Automated sync of campaign, ad set, and performance data
- **Analytics APIs**: Campaign comparison, performance analysis, and booking correlation
- **Strategic Dashboard**: Business intelligence similar to Google Ads dashboard
- **Testing Tools**: Connection validation and data verification

## Prerequisites

1. **Meta Business Account**: Access to Meta Business Manager
2. **Ad Account**: Active Meta Ads account with campaigns
3. **API Access**: Meta Marketing API permissions
4. **Database**: Supabase marketing schema (already configured)

## Required Environment Variables

Add these variables to your `.env.local` file:

```env
# Meta Ads API Configuration
META_ACCESS_TOKEN=your_long_lived_access_token_here
META_AD_ACCOUNT_ID=your_ad_account_id_without_act_prefix
META_API_VERSION=v19.0

# Optional: for enhanced features
META_APP_ID=your_facebook_app_id
META_APP_SECRET=your_facebook_app_secret
```

### Getting Your Meta Credentials

#### 1. Meta Access Token
1. Go to [Meta Business Manager](https://business.facebook.com)
2. Navigate to **Business Settings** → **Users** → **System Users**
3. Create a new System User or use existing one
4. Generate a new **Long-Lived Access Token** with these permissions:
   - `ads_management`
   - `ads_read`
   - `business_management`
   - `read_insights`

#### 2. Ad Account ID
1. In Meta Business Manager, go to **Business Settings** → **Accounts** → **Ad Accounts**
2. Find your ad account and copy the Account ID (numbers only, without "act_" prefix)
3. Example: If shown as `act_1234567890`, use `1234567890`

#### 3. API Version
- Use `v19.0` (current stable version as of January 2025)
- Check [Meta API Changelog](https://developers.facebook.com/docs/graph-api/changelog/) for updates

## Database Schema

The Meta Ads integration uses these tables in the `marketing` schema:

```sql
-- Core tables (already created via migration)
marketing.meta_ads_campaigns
marketing.meta_ads_ad_sets  
marketing.meta_ads_ads
marketing.meta_ads_campaign_performance
marketing.meta_ads_adset_performance
marketing.meta_ads_sync_log

-- Views
marketing.meta_ads_campaign_performance_summary
```

## API Endpoints

The following endpoints are available for Meta Ads data:

### Data Extraction
- `POST /api/meta-ads/sync` - Sync campaigns and performance data
- `GET /api/meta-ads/test-connection` - Test API connectivity

### Analytics  
- `GET /api/meta-ads/analytics` - Get performance analytics by date/campaign
- `GET /api/meta-ads/booking-correlation` - Analyze spend vs booking correlation
- `GET /api/meta-ads/campaign-comparison` - Compare campaign performance periods
- `GET /api/meta-ads/performance-comparison` - Detailed performance analysis

## Setup Steps

### 1. Environment Configuration

```bash
# Add to .env.local
META_ACCESS_TOKEN=EAAF...  # Your long-lived token
META_AD_ACCOUNT_ID=1234567890  # Your ad account ID
META_API_VERSION=v19.0
```

### 2. Database Migration

The database schema is already created. Verify with:

```bash
# Check if tables exist
npm run dev
# Navigate to http://localhost:3000/api/meta-ads/test-connection
```

### 3. Test API Connection

```bash
# Test Meta API connectivity
curl http://localhost:3000/api/meta-ads/test-connection
```

Expected response:
```json
{
  "success": true,
  "message": "All Meta Ads API tests passed",
  "results": {
    "environment_check": {
      "meta_access_token": true,
      "meta_ad_account_id": true,
      "meta_api_version": "v19.0"
    },
    "api_tests": [
      {
        "test": "Access Token Validation",
        "success": true,
        "details": "Token is valid"
      }
    ]
  }
}
```

### 4. Initial Data Sync

```bash
# Sync campaigns and ad sets
curl -X POST "http://localhost:3000/api/meta-ads/sync?syncType=campaigns"

# Sync performance data (last 30 days)
curl -X POST "http://localhost:3000/api/meta-ads/sync?syncType=performance&startDate=2025-01-15&endDate=2025-02-14"

# Full sync (campaigns + performance)
curl -X POST "http://localhost:3000/api/meta-ads/sync?syncType=full"
```

### 5. Verify Data

```bash
# Check analytics data
curl "http://localhost:3000/api/meta-ads/analytics?startDate=2025-01-15&endDate=2025-02-14"

# Check booking correlation
curl "http://localhost:3000/api/meta-ads/booking-correlation?startDate=2025-01-15&endDate=2025-02-14"
```

## Usage Examples

### Sync Performance Data
```typescript
const response = await fetch('/api/meta-ads/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const result = await response.json();
```

### Get Campaign Analytics
```typescript
const analytics = await fetch('/api/meta-ads/analytics?groupBy=campaign&startDate=2025-01-01&endDate=2025-01-31');
const data = await analytics.json();
```

### Compare Campaign Performance
```typescript
const comparison = await fetch('/api/meta-ads/campaign-comparison?analysisType=14-day');
const results = await comparison.json();
```

## Data Flow Architecture

```
Meta Marketing API → Sync Endpoints → Supabase (marketing schema) → Analytics APIs → Dashboard
```

1. **Data Extraction**: Meta Marketing API provides campaign and performance data
2. **Data Storage**: Stored in Supabase marketing schema with proper normalization  
3. **Data Processing**: Analytics endpoints aggregate and analyze data
4. **Data Presentation**: Strategic dashboard displays insights and correlations

## Booking Attribution

The system correlates Meta Ads spend with actual bookings using:

- **Referral Source Matching**: Tracks bookings from Meta/Facebook/Instagram sources
- **Correlation Analysis**: Statistical correlation between daily spend and bookings
- **Efficiency Metrics**: Cost per booking, click-to-booking rates
- **Period Comparisons**: Week-over-week and month-over-month analysis

## Error Handling

### Common Issues

1. **Invalid Access Token**
   ```json
   {
     "error": "Invalid access token",
     "details": "The access token expired or is invalid"
   }
   ```
   **Solution**: Generate new long-lived access token

2. **Ad Account Access Denied**
   ```json
   {
     "error": "Cannot access ad account",
     "details": "User does not have access to this ad account"
   }
   ```
   **Solution**: Verify ad account permissions in Business Manager

3. **API Rate Limiting**
   ```json
   {
     "error": "Rate limit exceeded", 
     "details": "Too many requests"
   }
   ```
   **Solution**: The sync endpoint includes automatic rate limiting delays

### Debugging

Enable debug logging:
```env
META_DEBUG=true
```

Check sync logs:
```sql
SELECT * FROM marketing.meta_ads_sync_log ORDER BY created_at DESC LIMIT 10;
```

## Automation

### Scheduled Syncs

For production, set up automated syncs:

```bash
# Daily performance sync (via cron or GitHub Actions)
0 6 * * * curl -X POST "https://your-app.vercel.app/api/meta-ads/sync?syncType=performance"

# Weekly full sync  
0 0 * * 0 curl -X POST "https://your-app.vercel.app/api/meta-ads/sync?syncType=full"
```

### Webhook Integration

For real-time updates, configure Meta webhooks:

```typescript
// webhook endpoint for real-time campaign changes
app.post('/api/meta-ads/webhook', (req, res) => {
  // Handle Meta webhook notifications
  // Trigger selective data sync
});
```

## Performance Optimization

### Data Retention
- Keep 2 years of performance data for trend analysis
- Archive older data to separate tables if needed

### Caching
- API responses cached for 1 hour during business hours
- Dashboard data cached for 15 minutes

### Batch Processing
- Sync processes campaigns in batches of 100
- Performance data synced in daily increments

## Security Considerations

1. **Token Security**: Store access tokens as environment variables only
2. **API Permissions**: Use minimum required permissions for system user
3. **Rate Limiting**: Built-in rate limiting prevents API abuse
4. **Access Control**: All endpoints require authentication
5. **Data Privacy**: No personal user data stored, only aggregate metrics

## Next Steps

After completing the setup:

1. **Dashboard Integration**: Build frontend components for data visualization
2. **Alert System**: Configure alerts for performance changes
3. **Custom Reports**: Create scheduled reports for stakeholders
4. **A/B Testing**: Implement campaign testing framework similar to Google Ads

## Support

For issues or questions:
1. Check the `/api/meta-ads/test-connection` endpoint first
2. Review sync logs in `marketing.meta_ads_sync_log` table
3. Verify environment variables are properly configured
4. Check Meta API status at [developers.facebook.com](https://developers.facebook.com/status/)

---

**Related Documentation**:
- [Google Ads Strategic Dashboard](./GOOGLE_ADS_STRATEGIC_DASHBOARD.md) - Reference implementation
- [Database Documentation](./database/DATABASE_DOCUMENTATION_INDEX.md) - Marketing schema details
- [API Reference](./api/API_REFERENCE.md) - Complete API documentation