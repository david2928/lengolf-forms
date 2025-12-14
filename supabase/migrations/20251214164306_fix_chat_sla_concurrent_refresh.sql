-- Fix chat_sla_metrics for CONCURRENT refresh by adding unique index
-- This migration adds the required unique index and updates the cron job

-- Step 1: Unschedule the existing cron job (it will fail without unique index)
SELECT cron.unschedule('refresh-chat-sla-metrics-15min');

-- Step 2: Add a unique index to enable CONCURRENT refresh
-- The combination of channel_type, conversation_id, and customer_message_id is unique
CREATE UNIQUE INDEX idx_chat_sla_metrics_unique
ON public.chat_sla_metrics(channel_type, conversation_id, customer_message_id);

-- Step 3: Re-schedule the cron job with CONCURRENT refresh (now that unique index exists)
SELECT cron.schedule(
  'refresh-chat-sla-metrics-15min',  -- Job name
  '*/15 * * * *',                     -- Cron schedule: every 15 minutes
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.chat_sla_metrics$$
);

-- Step 4: Perform initial refresh to verify it works
REFRESH MATERIALIZED VIEW CONCURRENTLY public.chat_sla_metrics;
