-- Add function alignment as 5th judge dimension
-- Scores whether the AI called the right tool for the situation (1-5 scale)

-- Add to eval_samples
ALTER TABLE ai_eval.eval_samples
  ADD COLUMN IF NOT EXISTS judge_function_alignment INT CHECK (judge_function_alignment BETWEEN 1 AND 5);

-- Add to eval_runs
ALTER TABLE ai_eval.eval_runs
  ADD COLUMN IF NOT EXISTS avg_function_alignment DECIMAL(4,2);

-- Update sample_count from 150 to 200 for weekly cron
SELECT cron.unschedule('ai-eval-weekly');
SELECT cron.schedule(
  'ai-eval-weekly',
  '0 4 * * 0',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_functions_url') || '/ai-eval-run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"action":"start","sample_count":200,"batch_size":10}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);
