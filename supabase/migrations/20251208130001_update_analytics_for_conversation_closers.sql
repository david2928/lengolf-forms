-- ============================================================================
-- Migration: Update Analytics Functions for Conversation Closers
-- Date: 2025-12-08
-- Description:
--   Update all 4 analytics functions to exclude "conversation_ended" status
--   from SLA calculations. Conversation closers (>12 business hours) are
--   tracked separately but don't affect SLA metrics.
-- ============================================================================

-- ============================================================================
-- Update get_chat_sla_overview - Add conversation_ended_count
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_chat_sla_overview(
  start_date DATE,
  end_date DATE,
  channel_filter TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      -- SLA metrics (excluding abandoned and conversation_ended)
      'sla_met_count', COUNT(*) FILTER (WHERE sla_status = 'met' AND is_staff_response = true AND message_in_business_hours = true),
      'sla_breached_count', COUNT(*) FILTER (WHERE sla_status = 'breached' AND is_staff_response = true AND message_in_business_hours = true),
      'sla_compliance_rate', ROUND(
        (COUNT(*) FILTER (WHERE sla_status = 'met' AND is_staff_response = true AND message_in_business_hours = true)::NUMERIC /
         NULLIF(COUNT(*) FILTER (WHERE sla_status IN ('met', 'breached') AND is_staff_response = true AND message_in_business_hours = true), 0) * 100),
        2
      ),

      -- Response time metrics (excluding abandoned and conversation_ended)
      'avg_response_minutes', ROUND(
        (AVG(business_hours_response_seconds / 60.0) FILTER (
          WHERE first_staff_response_time IS NOT NULL
          AND sla_status NOT IN ('abandoned', 'conversation_ended')
        ))::NUMERIC,
        2
      ),
      'median_response_minutes', ROUND(
        (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY business_hours_response_seconds / 60.0) FILTER (
          WHERE first_staff_response_time IS NOT NULL
          AND sla_status NOT IN ('abandoned', 'conversation_ended')
        ))::NUMERIC,
        2
      ),

      -- Message counts
      'unanswered_count', COUNT(*) FILTER (WHERE sla_status = 'unanswered'),
      'abandoned_count', COUNT(*) FILTER (WHERE sla_status = 'abandoned'),
      'conversation_ended_count', COUNT(*) FILTER (WHERE sla_status = 'conversation_ended'),
      'business_hours_messages', COUNT(*) FILTER (WHERE message_in_business_hours = true),
      'total_messages_tracked', COUNT(*) FILTER (WHERE sla_status IN ('met', 'breached', 'unanswered')),

      -- Channel breakdown
      'line_messages', COUNT(*) FILTER (WHERE channel_type = 'line'),
      'website_messages', COUNT(*) FILTER (WHERE channel_type = 'website'),
      'meta_messages', COUNT(*) FILTER (WHERE channel_type IN ('facebook', 'instagram', 'whatsapp', 'meta')),

      -- Owner metrics (excluding conversation_ended)
      'owner_fast_responses', COUNT(*) FILTER (
        WHERE response_category = 'owner_response'
        AND message_in_business_hours = true
      ),
      'owner_forced_after_10min', COUNT(*) FILTER (
        WHERE response_category = 'owner_forced_after_10min'
        AND message_in_business_hours = true
      ),
      'total_owner_responses', COUNT(*) FILTER (
        WHERE responding_staff_email IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')
        AND message_in_business_hours = true
        AND sla_status NOT IN ('abandoned', 'conversation_ended')
      )
    )
    FROM public.chat_sla_metrics
    WHERE message_date >= start_date
      AND message_date <= end_date
      AND (channel_filter IS NULL OR channel_type = channel_filter)
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_sla_overview IS
'Get overall SLA performance metrics for a date range with optional channel filter.
Excludes abandoned (>24hr) and conversation_ended (>12hr business hours) from SLA calculations.
Returns JSON with SLA rates, response times, message counts, and owner intervention metrics.';

-- ============================================================================
-- Update get_chat_sla_by_staff - Exclude conversation_ended
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_chat_sla_by_staff(
  start_date DATE,
  end_date DATE,
  channel_filter TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(staff_data ORDER BY total_responses DESC)
    FROM (
      SELECT
        COALESCE(responding_staff_email, 'historical@lengolf.local') AS staff_email,
        CASE
          WHEN responding_staff_email IS NULL THEN 'Historical Data (No Staff Tracking)'
          ELSE COALESCE(au.display_name, SPLIT_PART(responding_staff_email, '@', 1), 'Unknown Staff')
        END AS staff_name,
        COUNT(*) FILTER (WHERE sla_status NOT IN ('abandoned', 'conversation_ended')) AS total_responses,
        COUNT(*) FILTER (WHERE sla_status = 'met') AS sla_met,
        COUNT(*) FILTER (WHERE sla_status = 'breached') AS sla_breached,
        ROUND(
          (COUNT(*) FILTER (WHERE sla_status = 'met')::NUMERIC /
           NULLIF(COUNT(*) FILTER (WHERE sla_status IN ('met', 'breached')), 0) * 100),
          2
        ) AS sla_compliance_rate,
        ROUND(
          (AVG(business_hours_response_seconds / 60.0) FILTER (WHERE sla_status NOT IN ('abandoned', 'conversation_ended')))::NUMERIC,
          2
        ) AS avg_response_minutes
      FROM public.chat_sla_metrics
      LEFT JOIN backoffice.allowed_users au ON au.email = responding_staff_email
      WHERE message_date >= start_date
        AND message_date <= end_date
        AND (channel_filter IS NULL OR channel_type = channel_filter)
        AND message_in_business_hours = true
        AND is_staff_response = true
        AND sla_status NOT IN ('abandoned', 'conversation_ended')
      GROUP BY responding_staff_email, au.display_name
    ) staff_data
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_sla_by_staff IS
'Get per-staff SLA performance metrics for a date range with optional channel filter.
Excludes abandoned (>24hr) and conversation_ended (>12hr) conversations.
Returns JSON array with staff names, response counts, SLA compliance rates, and average response times.';

-- ============================================================================
-- Update get_chat_sla_daily_trends - Exclude conversation_ended
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_chat_sla_daily_trends(
  start_date DATE,
  end_date DATE,
  channel_filter TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(daily_data ORDER BY date ASC)
    FROM (
      SELECT
        message_date AS date,
        COUNT(*) FILTER (WHERE sla_status = 'met' AND is_staff_response = true) AS sla_met,
        COUNT(*) FILTER (WHERE sla_status = 'breached' AND is_staff_response = true) AS sla_breached,
        COUNT(*) FILTER (WHERE sla_status = 'unanswered') AS unanswered,
        COUNT(*) FILTER (WHERE sla_status = 'abandoned') AS abandoned,
        COUNT(*) FILTER (WHERE sla_status = 'conversation_ended') AS conversation_ended,
        ROUND(
          (COUNT(*) FILTER (WHERE sla_status = 'met' AND is_staff_response = true)::NUMERIC /
           NULLIF(COUNT(*) FILTER (WHERE sla_status IN ('met', 'breached') AND is_staff_response = true), 0) * 100),
          2
        ) AS sla_compliance_rate,
        ROUND(
          (AVG(business_hours_response_seconds / 60.0) FILTER (
            WHERE first_staff_response_time IS NOT NULL
            AND sla_status NOT IN ('abandoned', 'conversation_ended')
          ))::NUMERIC,
          2
        ) AS avg_response_minutes
      FROM public.chat_sla_metrics
      WHERE message_date >= start_date
        AND message_date <= end_date
        AND (channel_filter IS NULL OR channel_type = channel_filter)
        AND message_in_business_hours = true
      GROUP BY message_date
    ) daily_data
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_sla_daily_trends IS
'Get daily SLA trend data for charting.
Excludes abandoned (>24hr) and conversation_ended (>12hr) from SLA calculations but includes counts.
Returns JSON array with daily metrics including compliance rate, response times, and message counts by status.';

-- ============================================================================
-- get_chat_sla_conversation_details - Already correct (no changes needed)
-- ============================================================================
-- This function returns ALL conversations including conversation_ended status
-- for drill-down analysis, so no changes are needed. The frontend can filter
-- by status if desired.

COMMENT ON FUNCTION public.get_chat_sla_conversation_details IS
'Get detailed conversation-level SLA data with customer information.
Returns ALL conversations including conversation_ended (>12hr), abandoned (>24hr), and normal SLA statuses.
Falls back to LINE display_name (via line_users table) or channel-specific customer name when customer record is not linked.';
