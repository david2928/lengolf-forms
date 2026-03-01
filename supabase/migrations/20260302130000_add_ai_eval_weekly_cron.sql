-- Weekly AI eval cron job
-- Runs every Sunday at 04:00 UTC (11:00 AM Bangkok time)

SELECT cron.schedule(
  'ai-eval-weekly',
  '0 4 * * 0',
  $$
    SELECT net.http_post(
        url := 'https://bisimqmtxjsptehhqpeg.supabase.co/functions/v1/ai-eval-run',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpc2ltcW10eGpzcHRlaGhxcGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzOTY5MzEsImV4cCI6MjA1Mzk3MjkzMX0.NZ_mEOOoaKEG1p9LBXkULWwSIr-rWmCbksVZq3OzSYE'
        ),
        body := '{"action":"start","sample_count":150,"batch_size":10}'::jsonb,
        timeout_milliseconds := 150000
    ) AS request_id;
  $$
);

-- To unschedule: SELECT cron.unschedule('ai-eval-weekly');
-- To check status: SELECT * FROM cron.job WHERE jobname = 'ai-eval-weekly';
