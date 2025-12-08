-- Migration: Create Chat SLA Tracking System
-- Purpose: Business hours functions and materialized view for SLA metrics
-- Date: 2025-12-07
-- Author: Chat SLA Tracking System

-- ============================================================================
-- PART 1: Business Hours Helper Functions
-- ============================================================================

-- Function: Check if a timestamp is within business hours (10am-10pm Bangkok Time)
CREATE OR REPLACE FUNCTION public.is_within_business_hours(
  ts TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
  bangkok_ts TIMESTAMPTZ;
  hour_of_day INTEGER;
BEGIN
  -- Convert to Bangkok timezone (UTC+7)
  bangkok_ts := ts AT TIME ZONE 'Asia/Bangkok';
  hour_of_day := EXTRACT(HOUR FROM bangkok_ts);

  -- Business hours: 10am to 10pm (10-22)
  RETURN hour_of_day >= 10 AND hour_of_day < 22;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.is_within_business_hours IS
'Check if timestamp falls within business hours (10am-10pm Bangkok Time). Returns true if within hours, false otherwise.';


-- Function: Calculate business hours interval between two timestamps
-- Returns interval in SECONDS, excluding non-business hours
CREATE OR REPLACE FUNCTION public.calculate_business_hours_interval(
  start_ts TIMESTAMPTZ,
  end_ts TIMESTAMPTZ
) RETURNS INTEGER AS $$
DECLARE
  current_ts TIMESTAMPTZ;
  end_of_business TIMESTAMPTZ;
  start_of_business TIMESTAMPTZ;
  total_seconds INTEGER := 0;
  bangkok_start TIMESTAMPTZ;
  bangkok_end TIMESTAMPTZ;
  current_date DATE;
BEGIN
  -- Convert to Bangkok timezone
  bangkok_start := start_ts AT TIME ZONE 'Asia/Bangkok';
  bangkok_end := end_ts AT TIME ZONE 'Asia/Bangkok';

  -- If start is after end, return 0
  IF bangkok_start >= bangkok_end THEN
    RETURN 0;
  END IF;

  -- Iterate through each day between start and end
  current_date := DATE(bangkok_start);

  WHILE current_date <= DATE(bangkok_end) LOOP
    -- Define business hours for this date: 10am-10pm Bangkok time
    start_of_business := (current_date::TEXT || ' 10:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok';
    end_of_business := (current_date::TEXT || ' 22:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok';

    -- Calculate overlap with business hours for this day
    current_ts := GREATEST(bangkok_start, start_of_business);

    -- If there's overlap on this day, add the seconds
    IF current_ts < LEAST(bangkok_end, end_of_business) THEN
      total_seconds := total_seconds + EXTRACT(EPOCH FROM (
        LEAST(bangkok_end, end_of_business) - current_ts
      ))::INTEGER;
    END IF;

    -- Move to next day
    current_date := current_date + INTERVAL '1 day';
  END LOOP;

  RETURN total_seconds;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_business_hours_interval IS
'Calculate the number of seconds between two timestamps, counting only business hours (10am-10pm Bangkok Time). Excludes overnight and weekend non-business hours.';


-- ============================================================================
-- PART 2: SLA Metrics Materialized View
-- ============================================================================

-- Create materialized view for SLA tracking
-- This pre-calculates response times for all customer messages across all channels
-- IMPORTANT: Historical messages (staff_email = NULL) are included in overall SLA
CREATE MATERIALIZED VIEW IF NOT EXISTS public.chat_sla_metrics AS
WITH all_messages AS (
  -- Union all channels: LINE, Website, Meta
  SELECT
    'line' AS channel_type,
    conversation_id,
    id AS message_id,
    created_at,
    sender_type,
    staff_email,
    sender_name
  FROM public.line_messages

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

  UNION ALL

  SELECT
    COALESCE(platform, 'meta') AS channel_type,
    conversation_id,
    id AS message_id,
    created_at,
    sender_type,
    staff_email,
    sender_name
  FROM public.meta_messages
),
customer_message_sequences AS (
  -- Identify message sequences: Group customer messages within 3 minutes as one sequence
  -- SLA timer starts from LAST message in sequence
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
    -- (next message >3min away OR no next message)
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
           )) > 180 THEN true  -- More than 3 minutes = new sequence
      ELSE false
    END AS is_last_in_sequence
  FROM all_messages cm
  WHERE cm.sender_type IN ('user', 'customer')  -- Only customer messages
    AND cm.created_at >= NOW() - INTERVAL '90 days'  -- Keep last 90 days for performance
),
customer_messages_with_responses AS (
  -- For each LAST message in a sequence, find first staff/owner response
  SELECT
    cm.channel_type,
    cm.conversation_id,
    cm.message_id AS customer_message_id,
    cm.created_at AS customer_message_time,

    -- Find first staff/owner response after this customer message
    (
      SELECT MIN(sm.created_at)
      FROM all_messages sm
      WHERE sm.conversation_id = cm.conversation_id
        AND sm.created_at > cm.created_at
        AND sm.sender_type IN ('admin', 'staff', 'business')  -- All staff types across channels
    ) AS first_staff_response_time,

    -- Get the staff member who responded
    (
      SELECT sm.staff_email
      FROM all_messages sm
      WHERE sm.conversation_id = cm.conversation_id
        AND sm.created_at > cm.created_at
        AND sm.sender_type IN ('admin', 'staff', 'business')
      ORDER BY sm.created_at ASC
      LIMIT 1
    ) AS responding_staff_email,

    -- Check if message was sent during business hours
    public.is_within_business_hours(cm.created_at) AS message_in_business_hours

  FROM customer_message_sequences cm
  WHERE cm.is_last_in_sequence = true  -- Only track LAST message in each sequence
)
SELECT
  channel_type,
  conversation_id,
  customer_message_id,
  customer_message_time,
  first_staff_response_time,
  responding_staff_email,
  message_in_business_hours,

  -- Calculate actual response time in seconds (wall clock time)
  CASE
    WHEN first_staff_response_time IS NOT NULL THEN
      EXTRACT(EPOCH FROM (first_staff_response_time - customer_message_time))::INTEGER
    ELSE NULL
  END AS actual_response_seconds,

  -- Calculate business hours response time (excludes non-business hours)
  CASE
    WHEN first_staff_response_time IS NOT NULL AND message_in_business_hours THEN
      public.calculate_business_hours_interval(customer_message_time, first_staff_response_time)
    ELSE NULL
  END AS business_hours_response_seconds,

  -- SLA status (10 minutes = 600 seconds within business hours)
  CASE
    WHEN first_staff_response_time IS NULL THEN 'unanswered'
    WHEN message_in_business_hours = FALSE THEN 'outside_business_hours'
    WHEN public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) <= 600 THEN 'met'
    ELSE 'breached'
  END AS sla_status,

  -- Owner tracking (separate from staff SLA)
  -- Owner emails: dgeiermann@gmail.com, dgeie@gmail.com, dev@lengolf.local
  -- Historical messages (staff_email = NULL) treated as generic staff
  CASE
    WHEN responding_staff_email IS NULL THEN 'historical_staff'  -- Historical data before staff tracking
    WHEN responding_staff_email IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
         AND public.calculate_business_hours_interval(customer_message_time, first_staff_response_time) > 600
         THEN 'owner_forced_after_10min'  -- CRITICAL: Owner had to respond because staff didn't
    WHEN responding_staff_email IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
         THEN 'owner_response'  -- Owner responded within 10min
    ELSE 'staff_response'  -- Normal staff response
  END AS response_category,

  -- Is this a staff response (for SLA calculation)?
  -- Owner responses are excluded from staff SLA metrics
  -- Historical messages (NULL staff_email) are INCLUDED in overall SLA
  CASE
    WHEN responding_staff_email IS NULL THEN true  -- Historical: count as staff for overall SLA
    WHEN responding_staff_email NOT IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
         THEN true  -- Known staff response
    ELSE false  -- Owner response (excluded from staff SLA)
  END AS is_staff_response,

  -- Date for daily aggregations (Bangkok timezone)
  DATE(customer_message_time AT TIME ZONE 'Asia/Bangkok') AS message_date

FROM customer_messages_with_responses;

-- Create indexes on materialized view for fast queries
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

COMMENT ON MATERIALIZED VIEW public.chat_sla_metrics IS
'Pre-calculated SLA metrics for all customer messages across channels (LINE, Website, Meta). Tracks response times, SLA compliance, and owner involvement. Historical messages (staff_email = NULL) are included in overall SLA as generic staff. Refresh periodically via refresh_chat_sla_metrics() function. Only tracks LAST message in customer message sequences (messages within 3min treated as one sequence).';


-- ============================================================================
-- PART 3: Materialized View Refresh Function
-- ============================================================================

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION public.refresh_chat_sla_metrics()
RETURNS VOID AS $$
BEGIN
  -- Refresh materialized view concurrently to avoid locking
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.chat_sla_metrics;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.refresh_chat_sla_metrics IS
'Refresh the chat_sla_metrics materialized view. Should be called periodically (e.g., every 15 minutes) via cron job or manually from admin dashboard.';


-- ============================================================================
-- PART 4: Initial Data Population
-- ============================================================================

-- Initial refresh of materialized view
REFRESH MATERIALIZED VIEW public.chat_sla_metrics;
