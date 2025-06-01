# Supabase Cron Setup for Weekly Inventory Reports

This document explains how to set up Supabase Cron to automatically send weekly inventory reports instead of using Vercel cron jobs.

## Prerequisites

1. ✅ Historical data imported (`scripts/import-historical-inventory.js`)
2. ✅ Thresholds configured (`scripts/update-thresholds.js`) 
3. ✅ Weekly report API working (`app/api/inventory/weekly-report/route.ts`)
4. ✅ Task 4 implemented: All slider products marked for reorder
5. **Enable HTTP Extension** in Supabase:
   ```sql
   CREATE EXTENSION IF NOT EXISTS http;
   ```

## Step 1: Enable Supabase Cron

1. Go to your Supabase project dashboard: https://bisimqmtxjsptehhqpeg.supabase.co
2. Navigate to **Integrations** > **Cron**
3. Enable the **Cron** Postgres Module
4. This will install the `pg_cron` extension

## Step 2: Create Cron Job Function

Execute this SQL in your Supabase SQL Editor:

```sql
-- Create a database function to call the weekly inventory report API
CREATE OR REPLACE FUNCTION trigger_weekly_inventory_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    response_status int;
    response_body text;
    api_url text;
    auth_header text;
BEGIN
    -- REPLACE WITH YOUR ACTUAL DOMAIN
    api_url := 'https://your-app-domain.vercel.app/api/inventory/weekly-report';
    
    -- Add authentication header if needed (uncomment and add your API key)
    -- auth_header := 'Bearer your-api-key-here';
    
    -- Make HTTP POST request with proper headers
    SELECT status, content INTO response_status, response_body
    FROM http((
        'POST',
        api_url,
        ARRAY[
            http_header('Content-Type', 'application/json')
            -- Uncomment below if you need authentication:
            -- ,http_header('Authorization', auth_header)
        ],
        'application/json',
        '{}'
    ));
    
    IF response_status = 200 THEN
        RAISE NOTICE 'Weekly inventory report triggered successfully: %', response_body;
    ELSE
        RAISE WARNING 'Weekly inventory report failed with status: %, body: %', response_status, response_body;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error triggering weekly inventory report: %', SQLERRM;
END;
$$;
```

## Step 3: Schedule the Cron Job

```sql
-- Create a cron job to run every Monday at 2 AM UTC (9 AM Thailand time)
SELECT cron.schedule(
    'weekly-inventory-report',           -- Job name
    '0 2 * * 1',                        -- Cron schedule (Monday 2 AM UTC)
    'SELECT trigger_weekly_inventory_report();'
);
```

## Step 4: Verify the Setup

Check that your cron job is scheduled:

```sql
-- View scheduled cron jobs
SELECT * FROM cron.job;
```

You should see your job listed with:
- `jobname`: `weekly-inventory-report`
- `schedule`: `0 2 * * 1`
- `command`: `SELECT trigger_weekly_inventory_report();`

## Step 5: Test the Function

Test the function manually:

```sql
-- Test the function manually
SELECT trigger_weekly_inventory_report();
```

Check the logs in your app to see if the report was generated and sent.

## Step 6: Update Your Vercel Configuration

Remove the old cron job from `vercel.json`:

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
  // Remove this cron section:
  // "cron": [
  //   {
  //     "path": "/api/inventory/weekly-report",
  //     "schedule": "0 2 * * 1"
  //   }
  // ]
}
```

## Current Implementation Status

✅ **Task 1 - Historical Data Import**: Completed
- 16,925 submissions imported from `inventory_form_old_data.csv`
- Data spans 04/28/2024 to 09/03/2024
- All 66 CSV products mapped to database products

✅ **Task 2 - Weekly LINE Reports**: Completed  
- Reports now send to normal `LINE_GROUP_ID` instead of specific inventory group
- Supabase Cron replaces Vercel cron jobs
- Monday 2 AM UTC (9 AM Thailand time) schedule

✅ **Task 3 - Set Thresholds**: Completed
- 59/60 products updated with suppliers and reorder thresholds
- Only " Expensive Red wine" not found (extra space in CSV)

✅ **Task 4 - Slider Products**: Completed
- ALL slider products now marked as "Need to order" regardless of current status
- Confirmed working with real data: Ice, Straws, Paper towels, Cleaning supplies, etc.

## Management Commands

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- Remove a cron job
SELECT cron.unschedule('weekly-inventory-report');

-- Re-create a cron job
SELECT cron.schedule(
    'weekly-inventory-report',
    '0 2 * * 1',
    'SELECT trigger_weekly_inventory_report();'
);
```

## Troubleshooting

1. **Function not found**: Make sure the `http` extension is enabled in Supabase
2. **API URL incorrect**: Update the `api_url` variable with your actual domain
3. **LINE not sending**: Check `LINE_CHANNEL_ACCESS_TOKEN` and `LINE_GROUP_ID` env vars
4. **Permissions**: Ensure the function has `SECURITY DEFINER` to run with proper permissions

## Environment Variables Required

```env
# In your deployment environment
NEXT_PUBLIC_REFAC_SUPABASE_URL="https://bisimqmtxjsptehhqpeg.supabase.co"
REFAC_SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
LINE_CHANNEL_ACCESS_TOKEN="your-line-token"
LINE_GROUP_ID="C5029951a062583150a67db2eb6a2a38b"
``` 