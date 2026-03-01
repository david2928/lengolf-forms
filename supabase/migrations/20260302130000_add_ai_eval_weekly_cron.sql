-- Weekly AI eval cron job
-- Runs every Sunday at 04:00 UTC (11:00 AM Bangkok time)
--
-- Prerequisites: Store the anon key in Vault:
--   SELECT vault.create_secret('eyJ...your_anon_key...', 'supabase_anon_key', 'Supabase anon key for cron edge function calls');

SELECT cron.schedule(
  'ai-eval-weekly',
  '0 4 * * 0',
  $$
    SELECT net.http_post(
        url := 'https://bisimqmtxjsptehhqpeg.supabase.co/functions/v1/ai-eval-run',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1)
        ),
        body := '{"action":"start","sample_count":150,"batch_size":10}'::jsonb,
        timeout_milliseconds := 150000
    ) AS request_id;
  $$
);

-- To unschedule: SELECT cron.unschedule('ai-eval-weekly');
-- To check status: SELECT * FROM cron.job WHERE jobname = 'ai-eval-weekly';
