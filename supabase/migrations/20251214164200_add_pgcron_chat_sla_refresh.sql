-- Enable pg_cron extension for scheduled tasks
-- This allows automatic refresh of materialized views on a schedule

-- Enable pg_cron extension (idempotent - safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant necessary permissions to postgres role for cron jobs
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule automatic refresh of chat_sla_metrics materialized view
-- Runs every 15 minutes to keep SLA data current
-- Uses CONCURRENTLY to avoid locking the view during refresh
SELECT cron.schedule(
  'refresh-chat-sla-metrics-15min',  -- Job name
  '*/15 * * * *',                     -- Cron schedule: every 15 minutes
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.chat_sla_metrics$$
);

-- Verify the job was created
-- Query to check: SELECT * FROM cron.job;

-- Note: To unschedule this job in the future, run:
-- SELECT cron.unschedule('refresh-chat-sla-metrics-15min');
