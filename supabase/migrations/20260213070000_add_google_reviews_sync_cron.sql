-- Schedule automatic Google Reviews sync via Edge Function
-- Runs every 6 hours to keep review data current
-- Uses pg_net to call the Supabase Edge Function asynchronously

SELECT cron.schedule(
  'google-reviews-sync-6h',
  '0 */6 * * *',
  $$
    SELECT net.http_post(
        url := 'https://bisimqmtxjsptehhqpeg.supabase.co/functions/v1/google-reviews-sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpc2ltcW10eGpzcHRlaGhxcGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzOTY5MzEsImV4cCI6MjA1Mzk3MjkzMX0.NZ_mEOOoaKEG1p9LBXkULWwSIr-rWmCbksVZq3OzSYE'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
    ) AS request_id;
  $$
);

-- To unschedule: SELECT cron.unschedule('google-reviews-sync-6h');
-- To check status: SELECT * FROM cron.job WHERE jobname = 'google-reviews-sync-6h';
