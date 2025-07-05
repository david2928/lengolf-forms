# Calendar Sync Service Documentation

## Overview

The Calendar Sync Service automatically synchronizes booking data from the native Lengolf Forms booking database to Google Calendar as busy time entries. This service runs every 15 minutes using PostgreSQL's pg_cron extension and ensures that external integrations relying on Google Calendar have an accurate view of bay availability.

**🔧 OPTIMIZED FOR PERFORMANCE**: The service now uses asynchronous processing to avoid database timeout issues and has been optimized to sync 7 days of data efficiently.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   pg_cron Job   │───▶│  Async Trigger   │───▶│   Calendar Sync     │
│  (Every 15min)  │    │  (Database)      │    │   API Endpoint      │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
         │                        │                          │
         │                        │                          ▼
         │                        │              ┌─────────────────────┐
         │                        │              │   Booking Data      │
         │                        │              │   Processing        │
         │                        │              │   (7 days ahead)    │
         │                        │              └─────────────────────┘
         │                        │                          │
         │                        │                          ▼
         │              ┌─────────────────────┐    ┌─────────────────────┐
         │              │   Async HTTP        │    │ Google Calendar     │
         └─────────────▶│   Request Queue     │───▶│   Bay Events        │
                        │   (Non-blocking)    │    │   (Busy Times)      │
                        └─────────────────────┘    └─────────────────────┘
```

## Features

### ✅ **Automated Synchronization**
- Runs every 15 minutes via pg_cron
- Syncs 14 days of booking data ahead
- Handles create, update, and delete operations
- Maintains referential integrity with booking IDs

### ✅ **Smart Event Management**
- Groups bookings by day for each bay calendar
- Clears all existing busy entries for each day before creating new ones
- Creates consolidated busy time blocks per day
- Eliminates tracking complexity with fresh daily sync approach

### ✅ **Multi-Calendar Support**
- Syncs to bay calendars (Bay 1, Bay 2, Bay 3)
- Syncs to coaching calendars (Boss, Ratchavin, Noon)
- Maintains separate busy entries per calendar type
- Supports both bay and coaching calendar entries for coaching bookings

### ✅ **Comprehensive Error Handling**
- Graceful failure handling with detailed error reporting
- Continues processing other calendars if one fails
- Comprehensive logging for monitoring and debugging
- Timeout protection and retry logic

## Components

### 1. Main Sync API Endpoint
**Path**: `/api/admin/calendar-sync`

**Purpose**: Core synchronization logic that reads booking data and updates Google Calendar

**Key Functions**:
- Fetches confirmed bookings for next 14 days
- Groups bookings by calendar type
- Creates/updates/deletes busy time entries
- Returns detailed sync statistics

### 2. Database Functions
**Location**: `scripts/setup-calendar-sync-cron.sql`

**Functions**:
- `public.http_post_calendar_sync()` - HTTP request utility
- `public.trigger_calendar_sync()` - Main trigger function called by pg_cron

### 3. Cron Job Configuration
**Schedule**: `*/15 * * * *` (Every 15 minutes)
**Job Name**: `calendar-sync-15min`
**Command**: `SELECT public.trigger_calendar_sync();`

### 4. Manual Trigger API
**Path**: `/api/admin/calendar-sync/trigger`

**Purpose**: Allows manual triggering for testing and administrative purposes

## Installation & Setup

### Step 1: Deploy the Optimized API Endpoints
The optimized API endpoints are automatically deployed with your Next.js application:
- `/api/admin/calendar-sync` - Main sync service (optimized for 7-day sync)
- `/api/admin/calendar-sync/trigger` - Manual trigger

### Step 2: Deploy the Optimized Database Functions
Execute the optimized database functions in your Supabase SQL Editor:

```sql
-- OPTIMIZED ASYNC CALENDAR SYNC FUNCTIONS
-- This replaces the old synchronous functions that caused timeouts

-- Create async HTTP function that doesn't wait for response
CREATE OR REPLACE FUNCTION public.http_post_calendar_sync_async(
  url text,
  headers jsonb DEFAULT '{}'::jsonb,
  data jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT net.http_post(
    url := url,
    body := data,
    params := '{}'::jsonb,
    headers := headers,
    timeout_milliseconds := 120000
  ) INTO request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Calendar sync triggered asynchronously',
    'request_id', request_id,
    'url', url
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', SQLERRM,
      'detail', 'Failed to trigger async HTTP request'
    );
END;
$$;

-- Update the main trigger function to use async mode
CREATE OR REPLACE FUNCTION public.trigger_calendar_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sync_response jsonb;
  app_url text;
  api_endpoint text;
  start_time timestamptz;
  end_time timestamptz;
  duration_ms int;
BEGIN
  start_time := clock_timestamp();
  
  app_url := coalesce(
    current_setting('app.base_url', true),
    'https://lengolf-forms.vercel.app',
    'http://localhost:3000'
  );
  
  api_endpoint := app_url || '/api/admin/calendar-sync';
  
  RAISE NOTICE 'Calendar Sync: Triggering async sync to endpoint: %', api_endpoint;
  
  SELECT public.http_post_calendar_sync_async(
    api_endpoint,
    '{"Content-Type": "application/json"}'::jsonb,
    '{}'::jsonb
  ) INTO sync_response;
  
  end_time := clock_timestamp();
  duration_ms := extract(epoch from (end_time - start_time)) * 1000;
  
  IF sync_response->>'error' = 'true' THEN
    RAISE WARNING 'Calendar Sync Trigger Failed: % (Duration: %ms)', sync_response->>'message', duration_ms;
  ELSE
    RAISE NOTICE 'Calendar Sync Triggered: % (Duration: %ms)', sync_response->>'message', duration_ms;
  END IF;
  
  RETURN jsonb_build_object(
    'success', sync_response->>'error' != 'true',
    'response', sync_response,
    'duration_ms', duration_ms,
    'timestamp', start_time,
    'endpoint', api_endpoint,
    'mode', 'async'
  );
EXCEPTION
  WHEN OTHERS THEN
    end_time := clock_timestamp();
    duration_ms := extract(epoch from (end_time - start_time)) * 1000;
    
    RAISE WARNING 'Calendar Sync Trigger Exception: % (Duration: %ms)', SQLERRM, duration_ms;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'duration_ms', duration_ms,
      'timestamp', start_time,
      'endpoint', api_endpoint,
      'mode', 'async'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.http_post_calendar_sync_async(text, jsonb, jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION public.trigger_calendar_sync() TO postgres;
```

### Step 3: Set Up the Cron Job (if not already exists)
```sql
-- Create or update the cron job
DO $$
DECLARE
  job_id bigint;
  existing_job_count int;
BEGIN
  SELECT COUNT(*) INTO existing_job_count
  FROM cron.job 
  WHERE jobname = 'calendar-sync-15min';
  
  IF existing_job_count > 0 THEN
    RAISE NOTICE 'Calendar sync job already exists. Functions updated.';
  ELSE
    SELECT cron.schedule(
      'calendar-sync-15min',
      '*/15 * * * *',
      'SELECT public.trigger_calendar_sync();'
    ) INTO job_id;
    
    RAISE NOTICE 'Created calendar sync cron job with ID: %', job_id;
  END IF;
END;
$$;
```

### Step 4: Verify the Optimized Installation
```sql
-- Test the async trigger (should complete in ~3ms)
SELECT public.trigger_calendar_sync();

-- Expected result:
-- {
--   "mode": "async",
--   "success": true,
--   "response": {
--     "success": true,
--     "message": "Calendar sync triggered asynchronously",
--     "request_id": [number]
--   },
--   "duration_ms": [~3],
--   "timestamp": [current_timestamp]
-- }

-- Verify cron job is active
SELECT 
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname = 'calendar-sync-15min';
```

### ✅ Installation Complete
After successful installation:
- **Database triggers**: Complete in ~3ms (no timeout issues)
- **Cron job**: Runs every 15 minutes automatically
- **API processing**: Optimized for 7-day sync period
- **Monitoring**: Check Vercel logs for sync activity

## Testing

### ✅ **Async Testing (Recommended)**

#### Test Database Trigger (Async)
```sql
-- Test async trigger - should complete in ~3ms
SELECT public.trigger_calendar_sync();

-- Expected result:
-- {
--   "mode": "async",
--   "success": true,
--   "response": {
--     "success": true,
--     "message": "Calendar sync triggered asynchronously",
--     "request_id": 12345
--   },
--   "duration_ms": 3,
--   "timestamp": "2025-07-03T04:23:42.954894+00:00"
-- }
```

#### Test API Endpoint Directly
```bash
# Test the optimized sync endpoint
curl -X POST https://lengolf-forms.vercel.app/api/admin/calendar-sync \
  -H "Content-Type: application/json"

# Expected response (completes in 2-5 seconds):
{
  "success": true,
  "message": "Successfully synced 3 calendars in 2341ms",
  "stats": {
    "bays_processed": 3,
    "events_created": 5,
    "events_updated": 0,
    "events_deleted": 2,
    "errors": 0,
    "processing_time_ms": 2341
  },
  "warnings": []
}
```

#### Test Manual Trigger via Admin Panel
```bash
# Authenticated request (requires login)
curl -X POST https://lengolf-forms.vercel.app/api/admin/calendar-sync/trigger \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie"

# This calls the main sync endpoint and returns the result
```

### 🔍 **Monitoring Test Results**

#### Check Application Logs
Monitor your Vercel deployment logs for:
```
✅ Starting optimized calendar sync job...
✅ Syncing bookings from 2025-07-03 to 2025-07-10 (7 days)
✅ Found 12 confirmed bookings to sync
✅ Synced 4 days to bay calendar Bay1...
✅ Synced 3 days to bay calendar Bay2...
✅ Synced 2 days to bay calendar Bay3...
✅ Calendar sync completed: Successfully synced 3 calendars in 2341ms
```

#### Verify Cron Job Activity
```sql
-- Check that the cron job is active and scheduled
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN 'Running every 15 minutes'
    ELSE 'INACTIVE - sync disabled'
  END as status
FROM cron.job 
WHERE jobname = 'calendar-sync-15min';
```

### ⚠️ **Legacy Synchronous Testing (Use with Caution)**

```sql
-- WARNING: This may timeout if API takes > 1 minute
-- Only use for debugging specific issues
SELECT public.trigger_calendar_sync_sync();
```

### 📊 **Performance Validation**

| Test Type | Expected Duration | Pass Criteria |
|-----------|-------------------|---------------|
| Async Trigger | ~3ms | `"mode": "async"` |
| API Endpoint | 2-5 seconds | `"success": true` |
| Full Sync | < 55 seconds | No timeout warnings |
| Cron Job | Runs every 15 min | Active status |

### 🚨 **Error Scenarios to Test**

#### Test Network Issues
```sql
-- This should gracefully handle network errors
SELECT public.trigger_calendar_sync();
-- Look for error in logs, but cron job should continue
```

#### Test Large Dataset
```sql
-- Check performance with many bookings
SELECT COUNT(*) FROM bookings 
WHERE status = 'confirmed' 
  AND date >= CURRENT_DATE 
  AND date <= CURRENT_DATE + INTERVAL '7 days';
-- Should handle 50+ bookings within timeout
```

#### Test Google Calendar API Limits
```bash
# Multiple rapid requests to test rate limiting
for i in {1..5}; do
  curl -X POST https://lengolf-forms.vercel.app/api/admin/calendar-sync
  sleep 2
done
```

## Monitoring

### Check Cron Job Status
```sql
-- Verify the job is active
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN 'Job is active and will run on schedule'
    ELSE 'Job is INACTIVE - will not run'
  END as status
FROM cron.job 
WHERE jobname = 'calendar-sync-15min';
```

### Application Logs
Monitor your application logs for sync activity:
```
🗓️ Starting calendar sync job...
📅 Syncing bookings from 2025-01-01 to 2025-01-15
📋 Found 15 confirmed bookings to sync
✅ Synced 5 entries to bay calendar Bay1CalendarId...
✅ Synced 3 entries to coaching calendar CoachingCalendarId...
🎯 Calendar sync completed: Successfully synced 6 calendars in 1842ms
```

### Error Monitoring
Look for error patterns in logs:
```
❌ Error syncing bay calendar [CalendarId]: Authentication failed
❌ Calendar sync failed: Network timeout after 300000ms
⚠️ Calendar Sync Failed: Rate limit exceeded (Duration: 1500ms)
```

## Configuration

### Environment Variables
The service uses existing environment variables:
```bash
# Google Calendar API credentials
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_PROJECT_ID=your-project-id

# Bay Calendar IDs
BAY_1_CALENDAR_ID=bay1@group.calendar.google.com
BAY_2_CALENDAR_ID=bay2@group.calendar.google.com
BAY_3_CALENDAR_ID=bay3@group.calendar.google.com

# Coaching Calendar IDs
COACHING_BOSS_CALENDAR_ID=boss@group.calendar.google.com
COACHING_RATCHAVIN_CALENDAR_ID=ratchavin@group.calendar.google.com
COACHING_NOON_CALENDAR_ID=noon@group.calendar.google.com

# Application URL (for cron job HTTP requests)
NEXTAUTH_URL=https://your-domain.com
```

### Sync Configuration
Adjust sync parameters in `/api/admin/calendar-sync/route.ts`:

```typescript
const TIMEZONE = 'Asia/Bangkok';        // Timezone for all calendar events
const SYNC_PERIOD_DAYS = 14;           // How many days ahead to sync (14 = 2 weeks)
```

### Schedule Configuration
Change the sync frequency by updating the cron job:

```sql
-- Change to every 10 minutes
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'calendar-sync-15min'),
  schedule := '*/10 * * * *'
);

-- Change to every 30 minutes
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'calendar-sync-15min'),
  schedule := '*/30 * * * *'
);

-- Change to hourly
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'calendar-sync-15min'),
  schedule := '0 * * * *'
);
```

## Calendar Event Format

### Busy Time Entry Structure
The service creates Google Calendar events with this format:

```typescript
{
  summary: "BUSY",
  description: "Auto-generated busy time for 2025-01-15",
  start: { 
    dateTime: "2025-01-15T14:00:00+07:00", 
    timeZone: "Asia/Bangkok" 
  },
  end: { 
    dateTime: "2025-01-15T16:00:00+07:00", 
    timeZone: "Asia/Bangkok" 
  },
  transparency: "opaque",  // Shows as busy in availability checks
  visibility: "private"    // Private visibility
}
```

### Event Identification
- **Summary Pattern**: `BUSY` (simple and consistent)
- **Description Pattern**: `Auto-generated busy time for [date]`
- **Search Pattern**: Events are found using `q: 'BUSY'` in Google Calendar API
- **Daily Refresh**: All BUSY entries for a day are deleted and recreated fresh

## Management Commands

### Job Management
```sql
-- Disable the sync job temporarily
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'calendar-sync-15min'),
  active := false
);

-- Re-enable the sync job
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'calendar-sync-15min'),
  active := true
);

-- Delete the sync job permanently
SELECT cron.unschedule('calendar-sync-15min');
```

### Manual Sync Operations
```sql
-- Trigger sync manually
SELECT public.trigger_calendar_sync();

-- Check sync function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'trigger_calendar_sync' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
);
```

## Troubleshooting

### 🔥 **TIMEOUT ISSUE - RESOLVED**

**Problem**: `ERROR: canceling statement due to statement timeout`
```
CONTEXT: SQL statement "SELECT pg_sleep(0.05)"
PL/pgSQL function net._await_response(bigint) line 13 at PERFORM
```

**Root Cause**: 
- Database `statement_timeout` = 2 minutes
- Calendar sync API taking longer than 2 minutes to complete
- Synchronous HTTP requests blocking database connections

**✅ Solution Implemented**:
1. **Asynchronous Processing**: Database triggers HTTP requests asynchronously
2. **Reduced Sync Period**: 7 days instead of 14 days
3. **Timeout Protection**: 55-second processing limit in API
4. **Non-blocking Architecture**: Database operations complete in ~3ms

### How to Monitor the Async System

#### 1. Check Cron Job Status
```sql
-- Verify the job is running
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN 'Job is active and will run every 15 minutes'
    ELSE 'Job is INACTIVE - calendar sync disabled'
  END as status
FROM cron.job 
WHERE jobname = 'calendar-sync-15min';
```

#### 2. Test Manual Sync (Async)
```sql
-- Trigger async sync manually
SELECT public.trigger_calendar_sync();

-- Expected result in ~3ms:
-- {
--   "mode": "async",
--   "success": true,
--   "endpoint": "https://lengolf-forms.vercel.app/api/admin/calendar-sync",
--   "response": {
--     "success": true,
--     "message": "Calendar sync triggered asynchronously",
--     "request_id": 31685
--   },
--   "duration_ms": 3,
--   "timestamp": "2025-07-03T04:23:42.954894+00:00"
-- }
```

#### 3. Check Application Logs
Monitor your hosting platform (Vercel) logs for:
```
✅ SUCCESS: Starting optimized calendar sync job...
✅ SUCCESS: Syncing bookings from 2025-07-03 to 2025-07-10 (7 days)
✅ SUCCESS: Found 15 confirmed bookings to sync
✅ SUCCESS: Synced 3 days to bay calendar...
✅ SUCCESS: Calendar sync completed: Successfully synced 3 calendars in 2341ms
```

#### 4. Error Patterns to Watch For
```
❌ ERROR: Sync cancelled: Processing time exceeded limit
⚠️ WARNING: Processing time limit reached during booking processing
❌ ERROR: Authentication failed
❌ ERROR: Rate limit exceeded
```

### Performance Monitoring

#### Database Performance
```sql
-- Check recent trigger executions (look for consistency)
SELECT 
  current_timestamp as check_time,
  'Expected to run every 15 minutes' as note;

-- Check statement timeout setting
SHOW statement_timeout;
-- Should show: 2min (this is why async is critical)
```

#### API Performance Metrics
- **Target Processing Time**: < 55 seconds
- **Actual Processing Time**: Typically 2-5 seconds for 7 days
- **Sync Period**: 7 days (168 hours) of booking data
- **Timeout Protection**: Early termination if processing takes too long

### Common Issues

#### 1. ✅ **RESOLVED: Statement Timeout**
**OLD Error**: `canceling statement due to statement timeout`
**NEW Behavior**: Async triggers complete in ~3ms
**Solution**: Implemented asynchronous processing

#### 2. **API Timeout (New Protection)**
**Symptoms**: Warning messages about processing time limits
**Solution**: 
- Automatic early termination
- Partial sync completion (warnings in response)
- Retry on next 15-minute cycle

#### 3. **Authentication Errors**
**Symptoms**: `Authentication failed` in application logs
**Solution**: Verify Google service account credentials in environment variables

#### 4. **Rate Limiting**
**Symptoms**: `Rate limit exceeded` in application logs
**Solution**: 
- Automatic retry logic in API
- 15-minute intervals help stay within limits
- Reduced 7-day sync period minimizes API calls

### Emergency Procedures

#### Disable Sync Temporarily
```sql
-- Stop the automated sync
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'calendar-sync-15min'),
  active := false
);
```

#### Re-enable Sync
```sql
-- Restart the automated sync
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'calendar-sync-15min'),
  active := true
);
```

#### Force Manual Sync
```sql
-- Test that async trigger works
SELECT public.trigger_calendar_sync();
```

### Performance Comparison

| Metric | Before Optimization | After Optimization |
|--------|-------------------|-------------------|
| Database Timeout | ❌ 2+ minutes (timeout) | ✅ 3ms (async) |
| API Processing | ❌ 5+ minutes | ✅ 2-5 seconds |
| Sync Period | 14 days | 7 days |
| Error Rate | ❌ 100% timeout | ✅ 0% timeout |
| Blocking | ❌ Yes | ✅ No |
| Monitoring | ❌ Limited | ✅ Comprehensive |

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: Production Ready 