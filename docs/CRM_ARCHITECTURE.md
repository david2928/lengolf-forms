# CRM Architecture: Hybrid Cloud Run + Vercel Solution

## 🏗️ Architecture Overview

Our CRM integration uses a **hybrid approach** that leverages the strengths of different platforms while avoiding their limitations:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │     Vercel      │    │   Google Cloud  │
│   (Scheduler)   │───▶│   (API Layer)   │───▶│   (Browser Bot) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         │                       │              ┌─────────────────┐
         │                       │              │    Qashier      │
         │                       │              │   (Data Source) │
         │                       │              └─────────────────┘
         │                       ▼
         │              ┌─────────────────┐
         └─────────────▶│   Supabase      │
                        │   (Database)    │
                        └─────────────────┘
```

## 🎯 Why This Architecture?

### ❌ **Vercel Limitations for Browser Automation**
- **Timeout**: 10-15 seconds (our sync takes ~30-60 seconds)
- **Memory**: Limited for browser processes
- **Dependencies**: Chromium (~150MB) exceeds size limits
- **Cold starts**: Browser initialization is too slow

### ✅ **Solution: Keep Each Service in Its Optimal Environment**
- **Google Cloud Run**: Perfect for long-running browser automation
- **Vercel**: Excellent for API endpoints and authentication
- **Supabase**: Reliable for scheduling and data storage

## 🔧 Components

### 1. **Supabase Cron Job** 
- **Schedule**: Daily at 2:00 AM Thailand time
- **Action**: HTTP GET to Vercel endpoint
- **Purpose**: Reliable daily trigger

```sql
SELECT cron.schedule(
  'daily-customer-sync-via-vercel',
  '0 19 * * *', -- 7:00 PM GMT = 2:00 AM GMT+7
  $$
  SELECT status, content::json->>'batch_id' as batch_id
  FROM http_get('https://lengolf-forms.vercel.app/api/crm/update-customers');
  $$
);
```

### 2. **Vercel API Endpoint**
- **File**: `app/api/crm/update-customers/route.ts`
- **Method**: GET
- **Purpose**: Authentication layer and integration point

```typescript
export async function GET() {
  // 1. Authenticate with Google Cloud
  // 2. Call Cloud Run service
  // 3. Return formatted response
}
```

### 3. **Google Cloud Run Service**
- **URL**: `lengolf-crm-1071951248692.asia-southeast1.run.app`
- **Technology**: Python + Playwright
- **Purpose**: Browser automation and data extraction

### 4. **Manual Trigger**
- **UI**: "Update Customer Data" button on dashboard
- **Flow**: Button → Vercel API → Cloud Run → Database
- **Feedback**: Real-time status updates to user

## 🔐 Authentication Flow

```
1. User clicks button OR Cron triggers
2. Vercel receives request
3. Vercel creates Google Auth token
4. Vercel calls Cloud Run with auth token
5. Cloud Run validates token
6. Cloud Run executes browser automation
7. Cloud Run updates Supabase database
8. Cloud Run returns success/failure
9. Vercel forwards response to user/cron
```

## 📊 Data Flow

```
Qashier (CSV Export) 
    ↓ [Playwright Browser]
Cloud Run (Processing)
    ↓ [Supabase Client]
Database (backoffice.customers)
    ↓ [API Queries]
Next.js App (Customer Lists)
```

## 🚀 Benefits

### ✅ **Reliability**
- Cloud Run handles timeouts and resource requirements
- Vercel provides fast API responses
- Supabase ensures scheduled execution

### ✅ **Maintainability**
- Single source of truth for customer data
- Unified API endpoint in main application
- Centralized error handling and logging

### ✅ **Scalability**
- Cloud Run can handle increased load
- Vercel scales API endpoints automatically
- Supabase manages database connections

### ✅ **Cost Efficiency**
- Cloud Run only runs when needed
- Vercel functions are fast and cheap
- No redundant infrastructure

## 🔍 Monitoring

### Daily Health Checks
```sql
-- Check cron job execution
SELECT * FROM cron.job_run_details 
WHERE jobid = 12 
ORDER BY start_time DESC LIMIT 5;

-- Verify data freshness
SELECT 
  update_time,
  batch_id,
  COUNT(*) as customer_count
FROM backoffice.customers 
GROUP BY update_time, batch_id 
ORDER BY update_time DESC LIMIT 5;
```

### Error Detection
- **Cron failures**: Check `cron.job_run_details` for failed status
- **API errors**: Monitor Vercel function logs
- **Data issues**: Compare customer counts over time

## 🛠️ Maintenance

### Weekly Tasks
- [ ] Verify cron job executed successfully
- [ ] Check customer data was updated with new batch_id
- [ ] Review any error logs in Vercel/Cloud Run

### Monthly Tasks
- [ ] Test manual sync button functionality
- [ ] Verify Cloud Run service is running
- [ ] Update credentials if needed

### Troubleshooting Common Issues

#### 1. **Cron Job Fails**
```sql
-- Check recent job runs
SELECT * FROM cron.job_run_details WHERE jobid = 12 ORDER BY start_time DESC LIMIT 3;

-- If failing, manually test the endpoint
SELECT status FROM http_get('https://lengolf-forms.vercel.app/api/crm/update-customers');
```

#### 2. **Vercel Timeout**
- Check Vercel function logs for timeout errors
- Verify Google Cloud authentication is working
- Ensure Cloud Run service is responsive

#### 3. **Authentication Issues**
- Verify environment variables in Vercel
- Check Google service account permissions
- Test Cloud Run service directly

#### 4. **Data Not Updating**
- Check if batch_id is changing in database
- Verify Cloud Run service is connecting to correct Supabase project
- Review Qashier website for any changes

## 🔄 Future Improvements

### Potential Enhancements
1. **Retry Logic**: Add automatic retries for failed syncs
2. **Incremental Sync**: Only sync changed customers instead of full replacement
3. **Notifications**: Email alerts for sync failures
4. **Monitoring Dashboard**: Real-time sync status display

### Alternative Approaches (for future consideration)
1. **Qashier API**: If they develop a proper API, we could eliminate browser automation
2. **Puppeteer on Railway/Render**: Alternative platforms that support browser automation
3. **Scheduled GitHub Actions**: Could run the sync on GitHub's infrastructure

---

## 📝 Quick Reference

### Manual Sync
```bash
# Test production endpoint
curl https://lengolf-forms.vercel.app/api/crm/update-customers
```

### Cron Management
```sql
-- Check current jobs
SELECT * FROM cron.job WHERE jobname LIKE '%customer%';

-- Disable job temporarily
SELECT cron.unschedule('daily-customer-sync-via-vercel');

-- Re-enable job
SELECT cron.schedule('daily-customer-sync-via-vercel', '0 19 * * *', 
  'SELECT status FROM http_get(''https://lengolf-forms.vercel.app/api/crm/update-customers'')');
```

**Status**: ✅ Production Ready  
**Last Updated**: January 2025  
**Architecture Version**: 2.0 (Hybrid Cloud) 