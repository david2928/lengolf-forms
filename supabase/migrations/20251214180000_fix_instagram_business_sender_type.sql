-- ============================================================================
-- Migration: Fix Instagram/Meta Business Sender Type in SLA Metrics
-- Date: 2025-12-14
-- Description:
--   Add 'business' back to sender_type filter in chat_sla_metrics view.
--   Instagram/Meta staff responses use sender_type='business', not 'admin'/'staff'.
--   This was causing all Instagram staff responses to be incorrectly marked as
--   abandoned/unanswered in SLA tracking.
-- ============================================================================

-- Drop and recreate materialized view with 'business' sender type included
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
    -- FIXED: Added 'business' to sender_type filter for Instagram/Meta
    (SELECT MIN(sm.created_at)
     FROM all_messages sm
     WHERE sm.conversation_id = cm.conversation_id
       AND sm.created_at > cm.created_at
       AND sm.sender_type IN ('admin', 'staff', 'business')  -- Include 'business' for Meta/Instagram
    ) AS first_staff_response_time,
    -- Get responding staff email
    -- FIXED: Added 'business' to sender_type filter for Instagram/Meta
    (SELECT sm.staff_email
     FROM all_messages sm
     WHERE sm.conversation_id = cm.conversation_id
       AND sm.created_at > cm.created_at
       AND sm.sender_type IN ('admin', 'staff', 'business')  -- Include 'business' for Meta/Instagram
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
  -- SLA status with conversation closer filtering
  CASE
    -- Unanswered > 24hr: Abandoned
    WHEN first_staff_response_time IS NULL
         AND customer_message_time < NOW() - INTERVAL '24 hours'
         THEN 'abandoned'
    -- Unanswered < 24hr: Still unanswered
    WHEN first_staff_response_time IS NULL THEN 'unanswered'
    -- Response > 12 business hours: Conversation ended (likely "hello" next day)
    WHEN public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) > 43200
         THEN 'conversation_ended'
    -- Answered > 24hr actual time: Abandoned (e.g., weekend response)
    WHEN EXTRACT(EPOCH FROM (first_staff_response_time - customer_message_time)) > 86400
         THEN 'abandoned'
    -- Outside business hours
    WHEN NOT public.is_within_business_hours(customer_message_time)
         THEN 'outside_business_hours'
    -- Within 10 business minutes: Met
    WHEN public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 600
         THEN 'met'
    -- Otherwise: Breached
    ELSE 'breached'
  END AS sla_status,
  -- Response category for owner tracking
  CASE
    -- Owner forced after 10min (CRITICAL)
    WHEN responding_staff_email IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) > 600
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 43200
         THEN 'owner_forced_after_10min'
    -- Owner response within 10min
    WHEN responding_staff_email IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 600
         THEN 'owner_response'
    -- Staff response (non-owner, within 12 business hours)
    WHEN first_staff_response_time IS NOT NULL
         AND responding_staff_email NOT IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 43200
         THEN 'staff_response'
    -- Historical staff (NULL email, within 12 business hours)
    WHEN first_staff_response_time IS NOT NULL
         AND responding_staff_email IS NULL
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 43200
         THEN 'historical_staff'
    -- Conversation ended response (>12 business hours)
    ELSE 'conversation_ended_response'
  END AS response_category,
  -- Is staff response flag (for SLA calculation)
  CASE
    -- Staff response (non-owner, within 12 business hours)
    WHEN responding_staff_email NOT IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 43200
         THEN true
    -- Historical staff (NULL email, within 12 business hours)
    WHEN responding_staff_email IS NULL
         AND first_staff_response_time IS NOT NULL
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 43200
         THEN true
    -- All other cases (owner, conversation ended, unanswered)
    ELSE false
  END AS is_staff_response,
  -- Date for daily aggregations (Bangkok timezone)
  DATE(customer_message_time AT TIME ZONE 'Asia/Bangkok') AS message_date
FROM customer_messages_with_responses;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_chat_sla_metrics_date
ON public.chat_sla_metrics(message_date);

CREATE INDEX IF NOT EXISTS idx_chat_sla_metrics_conversation
ON public.chat_sla_metrics(conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_sla_metrics_staff
ON public.chat_sla_metrics(responding_staff_email)
WHERE responding_staff_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_sla_metrics_sla_status
ON public.chat_sla_metrics(sla_status);

CREATE INDEX IF NOT EXISTS idx_chat_sla_metrics_channel
ON public.chat_sla_metrics(channel_type);

CREATE INDEX IF NOT EXISTS idx_chat_sla_metrics_response_category
ON public.chat_sla_metrics(response_category);

CREATE INDEX IF NOT EXISTS idx_chat_sla_metrics_staff_response
ON public.chat_sla_metrics(is_staff_response)
WHERE is_staff_response = true;

-- Recreate unique index for CONCURRENT refresh
CREATE UNIQUE INDEX idx_chat_sla_metrics_unique
ON public.chat_sla_metrics(channel_type, conversation_id, customer_message_id);

COMMENT ON MATERIALIZED VIEW public.chat_sla_metrics IS
'Pre-calculated SLA metrics for all customer messages across channels (LINE, Website, Meta). Tracks response times, SLA compliance, and owner involvement. Includes Instagram/Meta sender_type=business for staff responses. Refresh periodically via pg_cron or manually. Only tracks LAST message in customer message sequences (messages within 3min treated as one sequence). Filters out conversation closers (>12 business hours = likely new conversation).';

-- Refresh the materialized view to apply fix immediately
REFRESH MATERIALIZED VIEW CONCURRENTLY public.chat_sla_metrics;
