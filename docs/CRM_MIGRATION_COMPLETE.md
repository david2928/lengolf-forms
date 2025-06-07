# CRM Migration Complete: From Cloud Run to Local API

## 🎉 Migration Summary

The lengolf_crm functionality has been successfully migrated from a separate Google Cloud Run service into the main Next.js application as a local API endpoint. This eliminates the need for external service dependencies and simplifies the architecture.

## 📋 What Was Migrated

### From: Google Cloud Run Service
- **Service**: `lengolf-crm-1071951248692.asia-southeast1.run.app`
- **Language**: Python Flask with Playwright
- **Dependencies**: Separate Docker container, Google Cloud authentication
- **Maintenance**: Required separate deployment and monitoring

### To: Next.js API Endpoint
- **Endpoint**: `/api/crm/sync-customers` (POST)
- **Language**: TypeScript with Playwright for Node.js
- **Dependencies**: Integrated into main application
- **Maintenance**: Single deployment and monitoring system

## 🔧 Technical Implementation

### New API Endpoint
- **File**: `app/api/crm/sync-customers/route.ts`
- **Method**: POST
- **Functionality**: 
  - Downloads customer data from Qashier using Playwright
  - Processes CSV data with proper data cleaning
  - Updates `backoffice.customers` table in Supabase
  - Returns batch information for tracking

### Updated Existing Endpoint
- **File**: `app/api/crm/update-customers/route.ts`
- **Change**: Now calls local endpoint instead of Cloud Run service
- **Benefit**: Faster response times, no external authentication needed

### Dependencies Added
- **Playwright**: `^1.43.0` for browser automation
- **Chromium**: Installed via `npx playwright install chromium`

## 🕐 Automated Scheduling

### Supabase Cron Job
- **Name**: `daily-customer-sync`
- **Schedule**: `0 19 * * *` (7:00 PM GMT = 2:00 AM Thailand time)
- **Action**: HTTP POST to `/api/crm/sync-customers`
- **Extensions Used**: `pg_cron`, `http`

### Manual Trigger
- **UI Button**: "Update Customer Data" on main dashboard
- **Endpoint**: `/api/crm/update-customers` (GET)
- **Flow**: Button → update-customers → sync-customers → Supabase

## 🔐 Environment Variables Required

The following environment variables must be set for the CRM sync to work:

```bash
# Qashier Credentials (Base64 encoded)
QASHIER_LOGIN=<base64_encoded_username>
QASHIER_PASSWORD=<base64_encoded_password>

# Supabase Configuration (already configured)
NEXT_PUBLIC_REFAC_SUPABASE_URL=https://bisimqmtxjsptehhqpeg.supabase.co
REFAC_SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Application URL (for cron job)
NEXTAUTH_URL=https://lengolf-forms.vercel.app
```

## 📊 Data Processing

### CSV Processing Features
- **Phone Number Cleaning**: Handles Thai phone number formats (+66, 66, 0)
- **Date Parsing**: Converts DD/MM/YYYY to YYYY-MM-DD format
- **Numeric Cleaning**: Removes commas from numbers
- **PDPA Mapping**: Converts Yes/No to boolean values
- **Batch Tracking**: Assigns unique batch IDs for tracking

### Database Operations
- **Clear Existing**: Truncates `backoffice.customers` table
- **Batch Insert**: Inserts data in batches of 100 records
- **Error Handling**: Comprehensive error logging and rollback

## 🔍 Monitoring and Debugging

### Cron Job Monitoring
```sql
-- Check cron job status
SELECT * FROM cron.job WHERE jobname = 'daily-customer-sync';

-- View job execution history
SELECT * FROM cron.job_run_details 
WHERE jobid = 11 
ORDER BY start_time DESC 
LIMIT 10;
```

### API Endpoint Logs
- Check Vercel function logs for detailed execution information
- Monitor response times and error rates
- Track batch IDs for data lineage

## 🚀 Benefits of Migration

### 1. **Simplified Architecture**
- ✅ Single deployment pipeline
- ✅ Unified monitoring and logging
- ✅ No external service dependencies

### 2. **Cost Reduction**
- ✅ Eliminated Google Cloud Run costs
- ✅ No separate container management
- ✅ Reduced complexity overhead

### 3. **Improved Reliability**
- ✅ Faster response times (no network latency)
- ✅ Better error handling and debugging
- ✅ Integrated with existing monitoring

### 4. **Enhanced Security**
- ✅ No cross-service authentication
- ✅ Environment variables managed in one place
- ✅ Simplified credential management

## 🔄 Rollback Plan

If issues arise, you can temporarily revert to the Cloud Run service:

1. **Revert API endpoint**:
   ```typescript
   // In app/api/crm/update-customers/route.ts
   // Change back to call Cloud Run URL instead of local endpoint
   ```

2. **Disable cron job**:
   ```sql
   SELECT cron.unschedule('daily-customer-sync');
   ```

3. **Re-enable Cloud Run service** if needed

## 📝 Next Steps

### Optional Improvements
1. **Add retry logic** for failed sync attempts
2. **Implement incremental sync** instead of full replacement
3. **Add email notifications** for sync failures
4. **Create dashboard** for sync monitoring

### Maintenance Tasks
1. **Monitor cron job execution** weekly
2. **Review error logs** for any issues
3. **Update credentials** when they expire
4. **Test sync functionality** monthly

## 🎯 Success Metrics

The migration is considered successful based on:

- ✅ **Functionality**: Customer sync works identically to before
- ✅ **Reliability**: Daily automated sync runs without issues
- ✅ **Performance**: Sync completes within expected timeframe
- ✅ **Monitoring**: Clear visibility into sync status and errors
- ✅ **Maintenance**: Simplified deployment and management

---

**Migration Completed**: January 2025  
**Status**: ✅ Production Ready  
**Next Review**: February 2025 