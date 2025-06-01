# Supabase Cron Setup for Weekly Inventory Reports

This document explains how to set up Supabase Cron to automatically send weekly inventory reports using a simple HTTP POST approach.

## Prerequisites

1. ✅ Historical data imported (`scripts/import-historical-inventory.js`)
2. ✅ Thresholds configured (`scripts/update-thresholds.js`) 
3. ✅ Weekly report API working (`app/api/inventory/weekly-report/route.ts`)
4. ✅ Enhanced report format with categories and date display
5. **Enable HTTP Extension** in Supabase:
   ```sql
   CREATE EXTENSION IF NOT EXISTS http;
   ```

## Step 1: Enable Supabase Cron

1. Go to your Supabase project dashboard: https://bisimqmtxjsptehhqpeg.supabase.co
2. Navigate to **Integrations** > **Cron**
3. Enable the **Cron** Postgres Module

## Step 2: Create Simple Cron Job

Execute this SQL in your Supabase SQL Editor to schedule the weekly report:

```sql
-- Schedule weekly inventory reports every Monday at 2 AM UTC (9 AM Thailand time)
SELECT cron.schedule(
    'weekly-inventory-report',           -- Job name
    '0 2 * * 1',                        -- Cron schedule (Monday 2 AM UTC)
    $$
    SELECT net.http_post(
        url := 'https://your-app-domain.vercel.app/api/inventory/weekly-report',
        headers := jsonb_build_object(
            'Content-Type', 'application/json'
        ), 
        body := '{}',
        timeout_milliseconds := 10000
    );
    $$
);
```

**IMPORTANT**: Replace `your-app-domain.vercel.app` with your actual deployment domain.

## Step 3: Verify the Setup

Check that your cron job is scheduled:

```sql
-- View scheduled cron jobs
SELECT jobid, jobname, schedule, command FROM cron.job;
```

You should see your job listed with:
- `jobname`: `weekly-inventory-report`
- `schedule`: `0 2 * * 1`
- `command`: `SELECT net.http_post(...)`

## Step 4: Test the Cron Job

Test the HTTP call manually:

```sql
-- Test the API call manually (replace with your actual domain)
SELECT net.http_post(
    url := 'https://your-app-domain.vercel.app/api/inventory/weekly-report',
    headers := jsonb_build_object(
        'Content-Type', 'application/json'
    ), 
    body := '{}',
    timeout_milliseconds := 10000
);
```

Check the response and your app logs to confirm the report was generated and sent to LINE.

## Environment Variables Required

Make sure these are set in your deployment environment:

```env
# Supabase Configuration
NEXT_PUBLIC_REFAC_SUPABASE_URL="https://bisimqmtxjsptehhqpeg.supabase.co"
REFAC_SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# LINE Messaging Configuration  
LINE_CHANNEL_ACCESS_TOKEN="your-line-token"
# Note: Inventory reports use hardcoded group ID C6a28e92972002dd392e8cc4f005afce2
# LINE_GROUP_ID environment variable is used for other notifications
```

## Current Implementation Status

✅ **Task 1 - Historical Data Import**: Completed
- 16,925 submissions imported with corrected date format
- Data spans April 28, 2024 to June 1, 2025
- All 66 CSV products mapped to database products

✅ **Task 2 - Enhanced Weekly LINE Reports**: Completed  
- Reports send to hardcoded group `C6a28e92972002dd392e8cc4f005afce2` (separate from general LINE_GROUP_ID)
- Enhanced format with categories, date display, and special cash handling
- Supabase Cron with simple `net.http_post` approach
- Monday 2 AM UTC (9 AM Thailand time) schedule

✅ **Task 3 - Set Thresholds**: Completed
- 59/60 products updated with suppliers and reorder thresholds
- Ice supplier updated to "Ice Vendor"

✅ **Task 4 - Slider Products**: Completed
- Only "Need to order" slider products flagged for reorder
- Verified with real data analysis

## Management Commands

```sql
-- List all cron jobs
SELECT jobid, jobname, schedule, command FROM cron.job;

-- Remove a cron job  
SELECT cron.unschedule('weekly-inventory-report');

-- Re-create the cron job (replace URL with your domain)
SELECT cron.schedule(
    'weekly-inventory-report',
    '0 2 * * 1',
    $$
    SELECT net.http_post(
        url := 'https://your-app-domain.vercel.app/api/inventory/weekly-report',
        headers := jsonb_build_object('Content-Type', 'application/json'), 
        body := '{}',
        timeout_milliseconds := 10000
    );
    $$
);
```

## Example Enhanced Report Output

```
🛒 Weekly Inventory Report 🛒
📅 Report Date: Monday, May 26, 2025
📊 Status Summary: 9 items need attention

🚨 ITEMS REQUIRING ACTION:

🍽️ FOOD & SUPPLIES
───────────────────
• Ice: Need to order (Re-order from Ice Vendor)
• Napkins (wet): Need to order (Re-order from Makro)

🍷 WINE
────────
• Red Wine (Middle Expensive): 2 in stock (Re-order from IWS)
• Sparkling Wine: 0 in stock (Re-order from IWS)

📦 OTHER
─────────
💰 Cash (only Bills): 15444 - NEEDS COLLECTION
• Golf Balls (only Inventory): 24 in stock (Supplier: TBD)

══════════════════════════════════════════════════
📋 ACTION REQUIRED:
💰 PRIORITY: Collect cash from register
🛒 Order 8 items from suppliers

✅ Please complete these actions by end of day.
```

## Troubleshooting

1. **HTTP extension not found**: Run `CREATE EXTENSION IF NOT EXISTS http;`
2. **API URL incorrect**: Update the URL with your actual deployment domain
3. **Timeout issues**: Increase `timeout_milliseconds` if needed
4. **LINE not sending**: Verify `LINE_CHANNEL_ACCESS_TOKEN` environment variable (group ID is hardcoded)
5. **Check cron logs**: Monitor Supabase logs for any execution errors 