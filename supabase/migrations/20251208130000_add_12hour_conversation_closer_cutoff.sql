-- ============================================================================
-- Migration: Add 12-Hour Conversation Closer Cutoff
-- Date: 2025-12-08
-- Description:
--   Filter out conversation closers (e.g., "thank you" → "hello next day")
--   from SLA tracking. Responses >12 business hours are likely new
--   conversations, not delayed responses to be tracked for SLA.
-- ============================================================================

-- Drop and recreate materialized view with conversation_ended status
DROP MATERIALIZED VIEW IF EXISTS public.chat_sla_metrics CASCADE;

CREATE MATERIALIZED VIEW public.chat_sla_metrics AS
WITH all_messages AS (
  -- Union all 3 channels: LINE, Website, Meta
  SELECT 'line' AS channel_type,
         id AS message_id,
         conversation_id,
         created_at,
         sender_type,
         staff_email,
         sender_name
  FROM public.line_messages
  WHERE created_at >= NOW() - INTERVAL '90 days'

  UNION ALL

  SELECT 'website' AS channel_type,
         id AS message_id,
         conversation_id,
         created_at,
         sender_type,
         staff_email,
         sender_name
  FROM public.web_chat_messages
  WHERE created_at >= NOW() - INTERVAL '90 days'

  UNION ALL

  SELECT COALESCE(mc.platform, 'meta') AS channel_type,
         mm.id AS message_id,
         mm.conversation_id,
         mm.created_at,
         mm.sender_type,
         mm.staff_email,
         mm.sender_name
  FROM public.meta_messages mm
  LEFT JOIN public.meta_conversations mc ON mc.id = mm.conversation_id
  WHERE mm.created_at >= NOW() - INTERVAL '90 days'
),
customer_message_sequences AS (
  -- Identify message sequences: Group messages within 3 minutes as one sequence
  SELECT
    cm.channel_type,
    cm.conversation_id,
    cm.message_id,
    cm.created_at,
    -- Find next customer message in same conversation
    LEAD(cm.created_at) OVER (
      PARTITION BY cm.conversation_id
      ORDER BY cm.created_at
    ) AS next_customer_message_time,
    -- Check if this is the LAST message in a sequence
    CASE
      WHEN LEAD(cm.created_at) OVER (
             PARTITION BY cm.conversation_id
             ORDER BY cm.created_at
           ) IS NULL THEN true
      WHEN EXTRACT(EPOCH FROM (
             LEAD(cm.created_at) OVER (
               PARTITION BY cm.conversation_id
               ORDER BY cm.created_at
             ) - cm.created_at
           )) > 180 THEN true
      ELSE false
    END AS is_last_in_sequence
  FROM all_messages cm
  WHERE cm.sender_type IN ('user', 'customer')
),
customer_messages_with_responses AS (
  -- For each LAST message in a sequence, find first staff response
  SELECT
    cm.channel_type,
    cm.conversation_id,
    cm.message_id AS customer_message_id,
    cm.created_at AS customer_message_time,
    -- Find first staff response after this customer message
    (SELECT MIN(sm.created_at)
     FROM all_messages sm
     WHERE sm.conversation_id = cm.conversation_id
       AND sm.created_at > cm.created_at
       AND sm.sender_type IN ('admin', 'staff')
    ) AS first_staff_response_time,
    -- Get responding staff email
    (SELECT sm.staff_email
     FROM all_messages sm
     WHERE sm.conversation_id = cm.conversation_id
       AND sm.created_at > cm.created_at
       AND sm.sender_type IN ('admin', 'staff')
     ORDER BY sm.created_at ASC LIMIT 1
    ) AS responding_staff_email
  FROM customer_message_sequences cm
  WHERE cm.is_last_in_sequence = true
)
SELECT
  channel_type,
  conversation_id,
  customer_message_id,
  customer_message_time,
  first_staff_response_time,
  responding_staff_email,
  -- Calculate response times
  EXTRACT(EPOCH FROM (first_staff_response_time - customer_message_time))::INTEGER
    AS actual_response_seconds,
  public.calculate_business_hours_interval(
    customer_message_time,
    COALESCE(first_staff_response_time, NOW())
  ) AS business_hours_response_seconds,
  -- Check if message was sent during business hours
  public.is_within_business_hours(customer_message_time) AS message_in_business_hours,
  -- SLA status with conversation closer detection
  CASE
    -- No response at all
    WHEN first_staff_response_time IS NULL THEN
      CASE
        WHEN customer_message_time < NOW() - INTERVAL '24 hours' THEN 'abandoned'
        ELSE 'unanswered'
      END

    -- Response came after 24 actual hours = abandoned
    WHEN EXTRACT(EPOCH FROM (first_staff_response_time - customer_message_time)) > 86400 THEN 'abandoned'

    -- Response within 24 hours - check if it's a conversation closer
    -- If business hours response time > 12 hours (43200 seconds), it's likely a new conversation
    WHEN public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) > 43200 THEN 'conversation_ended'

    -- Message outside business hours - don't track for SLA
    WHEN NOT public.is_within_business_hours(customer_message_time) THEN 'outside_business_hours'

    -- Normal SLA tracking: within business hours, response < 12 hours
    WHEN public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 600 THEN 'met'

    ELSE 'breached'
  END AS sla_status,
  -- Response category (owner vs staff, critical tracking)
  CASE
    -- CRITICAL: Owner forced to respond after 10min
    WHEN responding_staff_email IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) > 600
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 43200
    THEN 'owner_forced_after_10min'

    -- Owner quick response (within 10 min)
    WHEN responding_staff_email IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 600
    THEN 'owner_response'

    -- Staff response
    WHEN first_staff_response_time IS NOT NULL
         AND responding_staff_email NOT IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 43200
    THEN 'staff_response'

    -- Historical data (no staff tracking)
    WHEN first_staff_response_time IS NOT NULL
         AND responding_staff_email IS NULL
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 43200
    THEN 'historical_staff'

    -- Conversation ended (>12 hours)
    ELSE 'conversation_ended_response'
  END AS response_category,
  -- Is this a staff response for SLA calculation?
  CASE
    WHEN responding_staff_email NOT IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 43200
    THEN true
    WHEN responding_staff_email IS NULL
         AND first_staff_response_time IS NOT NULL
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 43200
    THEN true
    ELSE false
  END AS is_staff_response,
  -- Date for grouping
  DATE(customer_message_time AT TIME ZONE 'Asia/Bangkok') AS message_date
FROM customer_messages_with_responses;

-- Create indexes for fast querying
CREATE INDEX idx_chat_sla_metrics_date ON public.chat_sla_metrics(message_date);
CREATE INDEX idx_chat_sla_metrics_staff ON public.chat_sla_metrics(responding_staff_email) WHERE responding_staff_email IS NOT NULL;
CREATE INDEX idx_chat_sla_metrics_sla_status ON public.chat_sla_metrics(sla_status);
CREATE INDEX idx_chat_sla_metrics_response_category ON public.chat_sla_metrics(response_category);
CREATE INDEX idx_chat_sla_metrics_channel ON public.chat_sla_metrics(channel_type);
CREATE INDEX idx_chat_sla_metrics_business_hours ON public.chat_sla_metrics(message_in_business_hours);
CREATE INDEX idx_chat_sla_metrics_staff_response ON public.chat_sla_metrics(is_staff_response) WHERE is_staff_response = true;

COMMENT ON MATERIALIZED VIEW public.chat_sla_metrics IS
'Pre-calculated SLA metrics for all customer messages across LINE, Website, and Meta platforms.
Includes 12-hour conversation closer detection: responses >12 business hours marked as "conversation_ended".
Refreshed every 15 minutes. Covers last 90 days of message history.';

-- Refresh the materialized view with new data
REFRESH MATERIALIZED VIEW public.chat_sla_metrics;
