-- Setup Calendar Sync Automation with pg_cron
-- Following the same pattern as the existing POS data pipeline automation

-- ==========================================
-- 1. VERIFY pg_cron EXTENSION
-- ==========================================

-- Check if pg_cron extension is available (should already be enabled)
SELECT 
  name,
  default_version,
  installed_version,
  comment
FROM pg_available_extensions 
WHERE name = 'pg_cron';

-- Verify pg_cron is enabled (should show rows if enabled)
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  database
FROM cron.job 
WHERE active = true
ORDER BY jobid;

-- ==========================================
-- 2. CREATE HTTP REQUEST FUNCTION
-- ==========================================

-- Create function to make HTTP requests to our calendar sync API
-- Following the pattern from existing sales sync automation
CREATE OR REPLACE FUNCTION public.http_post_calendar_sync(
  url text,
  headers jsonb DEFAULT '{}'::jsonb,
  data jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id int;
  response jsonb;
  timeout_seconds int := 300; -- 5 minutes timeout for calendar sync
BEGIN
  -- Use pg_net extension for HTTP requests (available in Supabase)
  SELECT net.http_post(
    url := url,
    headers := headers,
    body := data::text
  ) INTO request_id;
  
  -- Wait for response with timeout
  SELECT net.http_get_result(request_id, timeout_seconds) INTO response;
  
  RETURN response;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', SQLERRM,
      'detail', 'HTTP request failed'
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.http_post_calendar_sync(text, jsonb, jsonb) TO postgres;

-- ==========================================
-- 3. CREATE CALENDAR SYNC TRIGGER FUNCTION  
-- ==========================================

-- Main function that will be called by pg_cron
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
  
  -- Get the application URL from environment or use default
  -- In production, this should be your actual domain
  app_url := coalesce(
    current_setting('app.base_url', true),
    'https://lengolf-forms.vercel.app',
    'http://localhost:3000'
  );
  
  api_endpoint := app_url || '/api/admin/calendar-sync';
  
  -- Log the sync attempt
  RAISE NOTICE 'Calendar Sync: Calling API endpoint: %', api_endpoint;
  
  -- Make HTTP POST request to trigger calendar sync
  SELECT public.http_post_calendar_sync(
    api_endpoint,
    '{"Content-Type": "application/json"}'::jsonb,
    '{}'::jsonb
  ) INTO sync_response;
  
  end_time := clock_timestamp();
  duration_ms := extract(epoch from (end_time - start_time)) * 1000;
  
  -- Log the result
  IF sync_response->>'error' = 'true' THEN
    RAISE WARNING 'Calendar Sync Failed: % (Duration: %ms)', sync_response->>'message', duration_ms;
  ELSE
    RAISE NOTICE 'Calendar Sync Completed: % (Duration: %ms)', sync_response->>'message', duration_ms;
  END IF;
  
  -- Return the response with timing information
  RETURN jsonb_build_object(
    'success', sync_response->>'error' != 'true',
    'response', sync_response,
    'duration_ms', duration_ms,
    'timestamp', start_time,
    'endpoint', api_endpoint
  );
  
EXCEPTION
  WHEN OTHERS THEN
    end_time := clock_timestamp();
    duration_ms := extract(epoch from (end_time - start_time)) * 1000;
    
    RAISE WARNING 'Calendar Sync Exception: % (Duration: %ms)', SQLERRM, duration_ms;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'duration_ms', duration_ms,
      'timestamp', start_time,
      'endpoint', api_endpoint
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.trigger_calendar_sync() TO postgres;

-- ==========================================
-- 4. CREATE pg_cron JOB
-- ==========================================

-- Create the calendar sync cron job to run every 15 minutes
-- This follows the same pattern as the existing sales sync jobs

DO $$
DECLARE
  job_id bigint;
  existing_job_count int;
BEGIN
  -- Check if a calendar sync job already exists
  SELECT COUNT(*) INTO existing_job_count
  FROM cron.job 
  WHERE jobname = 'calendar-sync-15min'
     OR command LIKE '%trigger_calendar_sync%';
  
  IF existing_job_count > 0 THEN
    RAISE NOTICE 'Calendar sync job already exists. Skipping creation.';
    RAISE NOTICE 'To update: SELECT cron.alter_job(job_id, schedule := ''*/15 * * * *'', command := ''SELECT public.trigger_calendar_sync();'');';
  ELSE
    -- Create the new cron job
    SELECT cron.schedule(
      'calendar-sync-15min',           -- Job name
      '*/15 * * * *',                  -- Every 15 minutes
      'SELECT public.trigger_calendar_sync();'  -- Command to execute
    ) INTO job_id;
    
    RAISE NOTICE 'Created calendar sync cron job with ID: %', job_id;
    RAISE NOTICE 'Schedule: Every 15 minutes (*/15 * * * *)';
    RAISE NOTICE 'Command: SELECT public.trigger_calendar_sync();';
  END IF;
END;
$$;

-- ==========================================
-- 5. VERIFY SETUP
-- ==========================================

-- Show the calendar sync job details
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  database,
  username
FROM cron.job 
WHERE jobname = 'calendar-sync-15min'
   OR command LIKE '%trigger_calendar_sync%'
ORDER BY jobid DESC;

-- ==========================================
-- 6. MANUAL TESTING
-- ==========================================

-- Test the calendar sync function manually (optional)
-- Uncomment the line below to test immediately:

-- SELECT public.trigger_calendar_sync();

-- ==========================================
-- 7. MONITORING QUERIES
-- ==========================================

-- Query to check recent calendar sync job executions
-- Note: pg_cron doesn't store execution history by default in Supabase
-- But you can check the logs or create your own logging table

-- Example monitoring query for cron jobs:
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN 'Job is active and will run on schedule'
    ELSE 'Job is INACTIVE - will not run'
  END as status
FROM cron.job 
WHERE jobname = 'calendar-sync-15min';

-- ==========================================
-- 8. MANAGEMENT COMMANDS
-- ==========================================

/*
-- Useful commands for managing the calendar sync job:

-- To disable the job:
-- SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'calendar-sync-15min'), active := false);

-- To enable the job:
-- SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'calendar-sync-15min'), active := true);

-- To change the schedule (e.g., every 10 minutes):
-- SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'calendar-sync-15min'), schedule := '*/10 * * * *');

-- To change the schedule (e.g., every 30 minutes):
-- SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'calendar-sync-15min'), schedule := '*/30 * * * *');

-- To delete the job:
-- SELECT cron.unschedule('calendar-sync-15min');

-- To manually trigger the sync:
-- SELECT public.trigger_calendar_sync();
*/

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================

SELECT 
  '✅ Calendar Sync Automation Setup Complete!' as message,
  'Calendar sync will run every 15 minutes' as schedule_info,
  'Use: SELECT public.trigger_calendar_sync(); to test manually' as manual_test,
  'Check cron.job table to verify job is active' as verification; 