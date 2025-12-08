-- ============================================================================
-- Migration: Fix SLA Customer Fallback and Outside Hours Logic
-- Date: 2025-12-08
-- Description:
--   1. Add LINE user display name fallback for unknown customers
--   2. Fix outside hours SLA calculation to start counting from business hours start
-- ============================================================================

-- ============================================================================
-- Update get_chat_sla_conversation_details to include customer info with LINE fallback
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_chat_sla_conversation_details(
  start_date DATE,
  end_date DATE,
  sla_status_filter TEXT DEFAULT NULL,
  channel_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 100
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'conversation_id', details.conversation_id,
        'channel_type', details.channel_type,
        'customer_message_time', details.customer_message_time,
        'first_staff_response_time', details.first_staff_response_time,
        'responding_staff_email', details.responding_staff_email,
        'responding_staff_name', COALESCE(au.display_name, SPLIT_PART(details.responding_staff_email, '@', 1), 'Unknown Staff'),
        'response_time_minutes', ROUND((details.business_hours_response_seconds / 60.0)::NUMERIC, 2),
        'sla_status', details.sla_status,
        'response_category', details.response_category,
        'is_owner_response', CASE
          WHEN details.responding_staff_email IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local') THEN true
          ELSE false
        END,
        'is_critical', CASE
          WHEN details.response_category = 'owner_forced_after_10min' THEN true
          ELSE false
        END,
        'customer_name', COALESCE(c.customer_name, lc.display_name, wc.customer_name, mc.customer_name, 'Unknown Customer'),
        'customer_id', conv.customer_id
      )
    )
    FROM (
      SELECT * FROM public.chat_sla_metrics
      WHERE message_date >= start_date
        AND message_date <= end_date
        AND (sla_status_filter IS NULL OR sla_status = sla_status_filter)
        AND (channel_filter IS NULL OR channel_type = channel_filter)
      ORDER BY customer_message_time DESC
      LIMIT limit_count
    ) details
    LEFT JOIN backoffice.allowed_users au ON au.email = details.responding_staff_email
    LEFT JOIN (
      -- Union all conversation tables to get customer_id
      SELECT id, customer_id, 'line' AS source FROM public.line_conversations
      UNION ALL
      SELECT id, customer_id, 'website' AS source FROM public.web_chat_sessions
      UNION ALL
      SELECT id, customer_id, 'meta' AS source FROM public.meta_conversations
    ) conv ON conv.id = details.conversation_id
    LEFT JOIN public.customers c ON c.id = conv.customer_id
    -- LEFT JOIN for LINE display_name fallback
    LEFT JOIN public.line_conversations lc ON lc.id = details.conversation_id AND details.channel_type = 'line'
    -- LEFT JOIN for website customer_name fallback
    LEFT JOIN public.web_chat_sessions wc ON wc.id = details.conversation_id AND details.channel_type = 'website'
    -- LEFT JOIN for meta customer_name fallback
    LEFT JOIN public.meta_conversations mc ON mc.id = details.conversation_id AND details.channel_type IN ('facebook', 'instagram', 'whatsapp', 'meta')
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_sla_conversation_details IS
'Get detailed conversation-level SLA data with customer information. Falls back to LINE display_name or channel-specific customer name when customer record is not linked. Returns individual customer messages with response times, staff information, and SLA status.';


-- ============================================================================
-- Update materialized view to fix outside hours SLA calculation
-- ============================================================================

-- Drop existing view
DROP MATERIALIZED VIEW IF EXISTS public.chat_sla_metrics CASCADE;

-- Recreate with fixed outside hours logic
CREATE MATERIALIZED VIEW public.chat_sla_metrics AS
WITH all_messages AS (
  -- Union all channels: LINE, Website, Meta platforms
  SELECT
    'line' AS channel_type,
    conversation_id,
    id AS message_id,
    created_at,
    sender_type,
    staff_email,
    sender_name
  FROM public.line_messages
  WHERE created_at >= NOW() - INTERVAL '90 days'

  UNION ALL

  SELECT
    'website' AS channel_type,
    conversation_id,
    id AS message_id,
    created_at,
    sender_type,
    staff_email,
    sender_name
  FROM public.web_chat_messages
  WHERE created_at >= NOW() - INTERVAL '90 days'

  UNION ALL

  SELECT
    COALESCE(mc.platform, 'meta') AS channel_type,
    mm.conversation_id,
    mm.id AS message_id,
    mm.created_at,
    mm.sender_type,
    mm.staff_email,
    mm.sender_name
  FROM public.meta_messages mm
  LEFT JOIN public.meta_conversations mc ON mc.id = mm.conversation_id
  WHERE mm.created_at >= NOW() - INTERVAL '90 days'
),

customer_message_sequences AS (
  -- Identify customer message sequences (within 3 minutes = one sequence)
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
           )) > 180 THEN true -- More than 3 minutes
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
     ORDER BY sm.created_at ASC
     LIMIT 1
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

  -- Calculate actual response time (total elapsed time)
  EXTRACT(EPOCH FROM (first_staff_response_time - customer_message_time))::INTEGER
    AS actual_response_seconds,

  -- Calculate business hours response time with outside hours handling
  CASE
    -- If message is outside business hours, calculate from next business hour start
    WHEN NOT public.is_within_business_hours(customer_message_time) AND first_staff_response_time IS NOT NULL THEN
      -- Find next business hour start
      CASE
        WHEN EXTRACT(HOUR FROM customer_message_time AT TIME ZONE 'Asia/Bangkok') < 10 THEN
          -- Before 10am - next business hour is 10am same day
          public.calculate_business_hours_interval(
            (DATE(customer_message_time AT TIME ZONE 'Asia/Bangkok') || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok',
            first_staff_response_time
          )
        ELSE
          -- After 10pm - next business hour is 10am next day
          public.calculate_business_hours_interval(
            ((DATE(customer_message_time AT TIME ZONE 'Asia/Bangkok') + 1) || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok',
            first_staff_response_time
          )
      END
    -- If message is within business hours, calculate normally
    WHEN first_staff_response_time IS NOT NULL THEN
      public.calculate_business_hours_interval(customer_message_time, first_staff_response_time)
    ELSE
      NULL
  END AS business_hours_response_seconds,

  -- Track if original message was in business hours (for filtering)
  public.is_within_business_hours(customer_message_time) AS message_in_business_hours,

  -- SLA status determination
  CASE
    WHEN first_staff_response_time IS NULL THEN 'unanswered'
    -- For messages outside business hours that got a response, check business hours response time
    WHEN NOT public.is_within_business_hours(customer_message_time) AND first_staff_response_time IS NOT NULL THEN
      CASE
        WHEN (
          CASE
            WHEN EXTRACT(HOUR FROM customer_message_time AT TIME ZONE 'Asia/Bangkok') < 10 THEN
              public.calculate_business_hours_interval(
                (DATE(customer_message_time AT TIME ZONE 'Asia/Bangkok') || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok',
                first_staff_response_time
              )
            ELSE
              public.calculate_business_hours_interval(
                ((DATE(customer_message_time AT TIME ZONE 'Asia/Bangkok') + 1) || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok',
                first_staff_response_time
              )
          END
        ) <= 600 THEN 'met'
        ELSE 'breached'
      END
    -- For messages in business hours, use normal calculation
    WHEN public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 600 THEN 'met'
    ELSE 'breached'
  END AS sla_status,

  -- Response category (owner vs staff tracking)
  CASE
    -- CRITICAL: Owner had to respond after 10min because staff didn't
    WHEN responding_staff_email IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
         AND (
           -- For messages outside business hours
           CASE
             WHEN NOT public.is_within_business_hours(customer_message_time) THEN
               CASE
                 WHEN EXTRACT(HOUR FROM customer_message_time AT TIME ZONE 'Asia/Bangkok') < 10 THEN
                   public.calculate_business_hours_interval(
                     (DATE(customer_message_time AT TIME ZONE 'Asia/Bangkok') || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok',
                     first_staff_response_time
                   )
                 ELSE
                   public.calculate_business_hours_interval(
                     ((DATE(customer_message_time AT TIME ZONE 'Asia/Bangkok') + 1) || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok',
                     first_staff_response_time
                   )
               END
             -- For messages in business hours
             ELSE
               public.calculate_business_hours_interval(customer_message_time, first_staff_response_time)
           END
         ) > 600 THEN 'owner_forced_after_10min'
    -- Owner response within 10min (good, not critical)
    WHEN responding_staff_email IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local') THEN 'owner_response'
    -- Historical data (no staff email tracked)
    WHEN responding_staff_email IS NULL THEN 'historical_staff'
    -- Regular staff response
    ELSE 'staff_response'
  END AS response_category,

  -- Is this a staff response (for SLA calculation, excluding owner)
  CASE
    WHEN responding_staff_email NOT IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
      OR responding_staff_email IS NULL THEN true
    ELSE false
  END AS is_staff_response,

  -- Date for daily aggregation (Bangkok timezone)
  DATE(customer_message_time AT TIME ZONE 'Asia/Bangkok') AS message_date

FROM customer_messages_with_responses;

-- Create indexes for fast querying
CREATE INDEX idx_chat_sla_metrics_date ON public.chat_sla_metrics(message_date);
CREATE INDEX idx_chat_sla_metrics_staff ON public.chat_sla_metrics(responding_staff_email);
CREATE INDEX idx_chat_sla_metrics_sla_status ON public.chat_sla_metrics(sla_status);
CREATE INDEX idx_chat_sla_metrics_response_category ON public.chat_sla_metrics(response_category);
CREATE INDEX idx_chat_sla_metrics_channel ON public.chat_sla_metrics(channel_type);
CREATE INDEX idx_chat_sla_metrics_business_hours ON public.chat_sla_metrics(message_in_business_hours);

COMMENT ON MATERIALIZED VIEW public.chat_sla_metrics IS
'Pre-calculated SLA metrics for all customer messages across all channels (LINE, Website, Meta). Includes message sequencing logic (3-minute grouping), business hours calculations with outside hours handling, owner vs staff tracking, and SLA status determination. Messages sent outside business hours calculate SLA from when business hours begin (10am Bangkok time).';

-- Initial refresh
REFRESH MATERIALIZED VIEW public.chat_sla_metrics;
