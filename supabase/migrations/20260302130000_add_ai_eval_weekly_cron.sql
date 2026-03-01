-- Weekly AI eval cron job
-- Runs every Sunday at 04:00 UTC (11:00 AM Bangkok time)
-- Note: The anon key below is intentionally public (same as NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY).
-- Abuse is prevented by input bounds in the edge function (max 200 samples, max 25 batch).
-- Wrapped in DO block so preview branches without pg_cron/pg_net skip gracefully.

DO $$
BEGIN
  PERFORM cron.schedule(
    'ai-eval-weekly',
    '0 4 * * 0',
    $cron$
      SELECT net.http_post(
          url := 'https://bisimqmtxjsptehhqpeg.supabase.co/functions/v1/ai-eval-run',
          headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpc2ltcW10eGpzcHRlaGhxcGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzOTY5MzEsImV4cCI6MjA1Mzk3MjkzMX0.NZ_mEOOoaKEG1p9LBXkULWwSIr-rWmCbksVZq3OzSYE"}'::jsonb,
          body := '{"action":"start","sample_count":150,"batch_size":10}'::jsonb,
          timeout_milliseconds := 150000
      ) AS request_id;
    $cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron/pg_net not available — skipping ai-eval cron setup: %', SQLERRM;
END;
$$;

-- To unschedule: SELECT cron.unschedule('ai-eval-weekly');
-- To check status: SELECT * FROM cron.job WHERE jobname = 'ai-eval-weekly';
