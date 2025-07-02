# Calendar Sync Service Documentation

## Overview

The Calendar Sync Service automatically synchronizes booking data from the native Lengolf Forms booking database to Google Calendar as busy time entries. This service runs every 15 minutes using PostgreSQL's pg_cron extension and ensures that external integrations relying on Google Calendar have an accurate view of bay availability.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   pg_cron Job   │───▶│  Trigger API     │───▶│   Calendar Sync     │
│  (Every 15min)  │    │  (Database)      │    │   API Endpoint      │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│ Google Calendar │◀───│  Google Auth     │◀───│   Booking Data      │
│   Bay Events    │    │  Service Account │    │   Processing        │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
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

### Step 1: Deploy the API Endpoints
The API endpoints are automatically deployed with your Next.js application:
- `/api/admin/calendar-sync` - Main sync service
- `/api/admin/calendar-sync/trigger` - Manual trigger

### Step 2: Run the Database Setup Script
Execute the pg_cron setup script in your Supabase SQL Editor:

```bash
# Execute this script in Supabase SQL Editor
scripts/setup-calendar-sync-cron.sql
```

This script will:
1. ✅ Verify pg_cron is enabled
2. ✅ Create HTTP request functions
3. ✅ Create the trigger function
4. ✅ Set up the cron job
5. ✅ Verify the installation

### Step 3: Verify Installation
Check that the cron job was created successfully:

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job 
WHERE jobname = 'calendar-sync-15min';
```

Expected result:
```
jobid | jobname            | schedule     | command                           | active
------|--------------------|--------------|------------------------------------|--------
  25  | calendar-sync-15min| */15 * * * * | SELECT public.trigger_calendar_sync(); | t
```

## Testing

### Manual Testing via API
```bash
# Test the sync endpoint directly
curl -X POST https://your-domain.com/api/admin/calendar-sync \
  -H "Content-Type: application/json"

# Expected response:
{
  "success": true,
  "message": "Successfully synced 6 calendars in 2341ms",
  "stats": {
    "bays_processed": 3,
    "coaching_calendars_processed": 3,
    "events_created": 12,
    "events_updated": 3,
    "events_deleted": 1,
    "errors": 0
  }
}
```

### Manual Testing via Database
```sql
-- Test the trigger function directly in Supabase
SELECT public.trigger_calendar_sync();

-- Expected result includes response details and timing
```

### Manual Testing via Admin Trigger
```bash
# Authenticated request to manual trigger
curl -X POST https://your-domain.com/api/admin/calendar-sync/trigger \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie"
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

### Common Issues

#### 1. Cron Job Not Running
**Symptoms**: No sync logs, calendars not updating
**Diagnosis**:
```sql
-- Check if job is active
SELECT active FROM cron.job WHERE jobname = 'calendar-sync-15min';

-- Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```
**Solution**: Ensure job is active and pg_cron is enabled

#### 2. Authentication Errors
**Symptoms**: `Authentication failed` in logs
**Diagnosis**: Google service account credentials
**Solution**: Verify `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` environment variables

#### 3. Calendar ID Errors
**Symptoms**: `Calendar not found` or permission errors
**Solution**: Verify calendar IDs in environment variables and ensure service account has access

#### 4. HTTP Timeout Errors
**Symptoms**: `timeout after 300000ms` in logs
**Solution**: Check network connectivity and consider increasing timeout in `http_post_calendar_sync` function

#### 5. Booking Data Issues
**Symptoms**: No events created despite having bookings
**Diagnosis**:
```sql
-- Check for confirmed bookings
SELECT COUNT(*) FROM bookings 
WHERE status = 'confirmed' 
  AND date >= CURRENT_DATE 
  AND date <= CURRENT_DATE + INTERVAL '14 days';
```

### Debugging Steps

1. **Test Manual Trigger**:
   ```sql
   SELECT public.trigger_calendar_sync();
   ```

2. **Check API Endpoint**:
   ```bash
   curl -X GET https://your-domain.com/api/admin/calendar-sync
   ```

3. **Verify Database Functions**:
   ```sql
   SELECT proname FROM pg_proc 
   WHERE proname IN ('trigger_calendar_sync', 'http_post_calendar_sync');
   ```

4. **Monitor Application Logs**: Check Vercel/hosting platform logs for sync activity and errors

## Performance Considerations

### Sync Efficiency
- **Batch Processing**: Processes all calendars in parallel where possible
- **Smart Updates**: Only updates events when booking times change
- **Efficient Queries**: Uses indexed queries on booking status and dates
- **Connection Reuse**: Reuses Google Calendar API connections across calendars

### Resource Usage
- **Sync Duration**: Typically 1-3 seconds for 10-20 bookings across 6 calendars
- **API Calls**: ~2-5 Google Calendar API calls per calendar per sync
- **Database Load**: Minimal - single query to fetch bookings
- **Memory Usage**: Low - processes bookings in streaming fashion

### Scaling Considerations
- **High Booking Volume**: Consider increasing sync frequency for busy periods
- **Multiple Locations**: Extend to support additional bay/coaching calendars
- **Rate Limiting**: Google Calendar API has rate limits - monitor usage
- **Error Recovery**: Built-in error isolation prevents one calendar failure from affecting others

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: Production Ready 