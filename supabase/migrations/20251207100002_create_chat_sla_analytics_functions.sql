-- Migration: Create Chat SLA Analytics Functions
-- Purpose: Database functions for SLA dashboard queries
-- Date: 2025-12-07
-- Author: Chat SLA Tracking System

-- ============================================================================
-- FUNCTION 1: Get Overall SLA Overview
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_chat_sla_overview(
  start_date DATE,
  end_date DATE,
  channel_filter TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH metrics AS (
    SELECT
      -- SLA compliance counts
      COUNT(*) FILTER (WHERE sla_status = 'met' AND is_staff_response = true) AS sla_met_count,
      COUNT(*) FILTER (WHERE sla_status = 'breached' AND is_staff_response = true) AS sla_breached_count,
      COUNT(*) FILTER (WHERE sla_status = 'unanswered') AS unanswered_count,
      COUNT(*) FILTER (WHERE message_in_business_hours = TRUE) AS business_hours_messages,

      -- Average response times (only for answered messages in business hours with staff responses)
      AVG(business_hours_response_seconds) FILTER (
        WHERE business_hours_response_seconds IS NOT NULL
          AND message_in_business_hours = TRUE
          AND is_staff_response = true
      ) AS avg_response_seconds,

      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY business_hours_response_seconds) FILTER (
        WHERE business_hours_response_seconds IS NOT NULL
          AND message_in_business_hours = TRUE
          AND is_staff_response = true
      ) AS median_response_seconds,

      -- Owner metrics (SEPARATE from staff SLA)
      COUNT(*) FILTER (WHERE response_category = 'owner_response') AS owner_responses_within_10min,
      COUNT(*) FILTER (WHERE response_category = 'owner_forced_after_10min') AS owner_forced_after_10min,
      COUNT(*) FILTER (WHERE response_category LIKE 'owner%') AS total_owner_responses,
      COUNT(*) FILTER (WHERE response_category = 'historical_staff') AS historical_responses,

      -- Channel breakdown
      COUNT(*) FILTER (WHERE channel_type = 'line') AS line_messages,
      COUNT(*) FILTER (WHERE channel_type = 'website') AS website_messages,
      COUNT(*) FILTER (WHERE channel_type IN ('facebook', 'instagram', 'whatsapp', 'meta')) AS meta_messages

    FROM public.chat_sla_metrics
    WHERE message_date >= start_date
      AND message_date <= end_date
      AND (channel_filter IS NULL OR channel_type = channel_filter)
  )
  SELECT json_build_object(
    'sla_met_count', sla_met_count,
    'sla_breached_count', sla_breached_count,
    'unanswered_count', unanswered_count,
    'business_hours_messages', business_hours_messages,
    'sla_compliance_rate',
      CASE
        WHEN (sla_met_count + sla_breached_count) > 0
        THEN ROUND((sla_met_count::NUMERIC / (sla_met_count + sla_breached_count) * 100), 2)
        ELSE 0
      END,
    'avg_response_seconds', ROUND(COALESCE(avg_response_seconds, 0)::NUMERIC, 2),
    'avg_response_minutes', ROUND(COALESCE(avg_response_seconds / 60, 0)::NUMERIC, 2),
    'median_response_seconds', ROUND(COALESCE(median_response_seconds, 0)::NUMERIC, 2),
    'median_response_minutes', ROUND(COALESCE(median_response_seconds / 60, 0)::NUMERIC, 2),

    -- Owner metrics (CRITICAL METRIC: owner_forced_after_10min)
    'owner_responses_within_10min', owner_responses_within_10min,
    'owner_forced_after_10min', owner_forced_after_10min,  -- RED ALERT metric
    'total_owner_responses', total_owner_responses,
    'owner_response_rate',
      CASE
        WHEN business_hours_messages > 0
        THEN ROUND((total_owner_responses::NUMERIC / business_hours_messages * 100), 2)
        ELSE 0
      END,

    -- Historical data tracking
    'historical_responses', historical_responses,

    -- Channel breakdown
    'line_messages', line_messages,
    'website_messages', website_messages,
    'meta_messages', meta_messages
  ) INTO result
  FROM metrics;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_sla_overview IS
'Get overall SLA metrics for specified date range. Returns SLA compliance rate, response times, owner involvement metrics, and channel breakdown. Owner responses are tracked separately and do NOT count toward staff SLA compliance.';


-- ============================================================================
-- FUNCTION 2: Get Per-Staff SLA Metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_chat_sla_by_staff(
  start_date DATE,
  end_date DATE,
  channel_filter TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'staff_email', COALESCE(responding_staff_email, 'Unknown Staff'),
        'staff_name', COALESCE(au.display_name, SPLIT_PART(responding_staff_email, '@', 1), 'Unknown Staff'),
        'total_responses', total_responses,
        'sla_met', sla_met,
        'sla_breached', sla_breached,
        'sla_compliance_rate', sla_compliance_rate,
        'avg_response_minutes', avg_response_minutes,
        'median_response_minutes', median_response_minutes,
        'is_owner', is_owner,
        'is_historical', is_historical
      )
      ORDER BY total_responses DESC
    )
    FROM (
      SELECT
        responding_staff_email,
        COUNT(*) AS total_responses,
        COUNT(*) FILTER (WHERE sla_status = 'met') AS sla_met,
        COUNT(*) FILTER (WHERE sla_status = 'breached') AS sla_breached,
        ROUND(
          (COUNT(*) FILTER (WHERE sla_status = 'met')::NUMERIC /
           NULLIF(COUNT(*) FILTER (WHERE sla_status IN ('met', 'breached')), 0) * 100),
          2
        ) AS sla_compliance_rate,
        ROUND(AVG(business_hours_response_seconds / 60.0), 2) AS avg_response_minutes,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY business_hours_response_seconds) / 60.0, 2) AS median_response_minutes,
        BOOL_OR(responding_staff_email IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local')) AS is_owner,
        BOOL_OR(responding_staff_email IS NULL) AS is_historical
      FROM public.chat_sla_metrics
      WHERE message_date >= start_date
        AND message_date <= end_date
        AND message_in_business_hours = TRUE
        AND is_staff_response = TRUE  -- Only include staff responses (excludes owner unless historical)
        AND (channel_filter IS NULL OR channel_type = channel_filter)
      GROUP BY responding_staff_email
    ) staff_metrics
    LEFT JOIN backoffice.allowed_users au ON au.email = staff_metrics.responding_staff_email
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_sla_by_staff IS
'Get per-staff SLA performance metrics. Returns array of staff members with their response counts, SLA compliance rates, and average response times. Includes historical data (NULL staff_email) as "Unknown Staff".';


-- ============================================================================
-- FUNCTION 3: Get Daily SLA Trends
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_chat_sla_daily_trends(
  start_date DATE,
  end_date DATE,
  channel_filter TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'date', message_date,
        'total_messages', total_messages,
        'sla_met', sla_met,
        'sla_breached', sla_breached,
        'unanswered', unanswered,
        'sla_compliance_rate', sla_compliance_rate,
        'avg_response_minutes', avg_response_minutes,
        'owner_forced_count', owner_forced_count  -- Critical daily metric
      ) ORDER BY message_date
    )
    FROM (
      SELECT
        message_date,
        COUNT(*) AS total_messages,
        COUNT(*) FILTER (WHERE sla_status = 'met' AND is_staff_response = true) AS sla_met,
        COUNT(*) FILTER (WHERE sla_status = 'breached' AND is_staff_response = true) AS sla_breached,
        COUNT(*) FILTER (WHERE sla_status = 'unanswered') AS unanswered,
        ROUND(
          (COUNT(*) FILTER (WHERE sla_status = 'met' AND is_staff_response = true)::NUMERIC /
           NULLIF(COUNT(*) FILTER (WHERE sla_status IN ('met', 'breached') AND is_staff_response = true), 0) * 100),
          2
        ) AS sla_compliance_rate,
        ROUND(AVG(business_hours_response_seconds / 60.0) FILTER (WHERE is_staff_response = true), 2) AS avg_response_minutes,
        COUNT(*) FILTER (WHERE response_category = 'owner_forced_after_10min') AS owner_forced_count
      FROM public.chat_sla_metrics
      WHERE message_date >= start_date
        AND message_date <= end_date
        AND message_in_business_hours = TRUE
        AND (channel_filter IS NULL OR channel_type = channel_filter)
      GROUP BY message_date
      ORDER BY message_date
    ) daily_metrics
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_sla_daily_trends IS
'Get daily SLA compliance trends for chart visualization. Returns daily aggregations of SLA metrics including compliance rate, response times, and critical owner intervention counts.';


-- ============================================================================
-- FUNCTION 4: Get Conversation-Level SLA Details
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
        'conversation_id', conversation_id,
        'channel_type', channel_type,
        'customer_message_time', customer_message_time,
        'first_staff_response_time', first_staff_response_time,
        'responding_staff_email', responding_staff_email,
        'responding_staff_name', COALESCE(au.display_name, SPLIT_PART(responding_staff_email, '@', 1), 'Unknown Staff'),
        'response_time_minutes', ROUND(business_hours_response_seconds / 60.0, 2),
        'sla_status', sla_status,
        'response_category', response_category,
        'is_owner_response', CASE
          WHEN responding_staff_email IN ('dgeiermann@gmail.com', 'dgeie@gmail.com', 'dev@lengolf.local') THEN true
          ELSE false
        END,
        'is_critical', CASE
          WHEN response_category = 'owner_forced_after_10min' THEN true
          ELSE false
        END
      )
    )
    FROM (
      SELECT *
      FROM public.chat_sla_metrics
      WHERE message_date >= start_date
        AND message_date <= end_date
        AND (sla_status_filter IS NULL OR sla_status = sla_status_filter)
        AND (channel_filter IS NULL OR channel_type = channel_filter)
      ORDER BY customer_message_time DESC
      LIMIT limit_count
    ) details
    LEFT JOIN backoffice.allowed_users au ON au.email = details.responding_staff_email
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_sla_conversation_details IS
'Get detailed conversation-level SLA data for drill-down views. Returns individual customer messages with response times, staff information, and SLA status. Useful for investigating specific SLA breaches or owner interventions.';


-- ============================================================================
-- Grant Execute Permissions
-- ============================================================================

-- Grant execute permissions to authenticated users (staff/admin)
GRANT EXECUTE ON FUNCTION public.get_chat_sla_overview(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_sla_by_staff(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_sla_daily_trends(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_sla_conversation_details(DATE, DATE, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_chat_sla_metrics() TO authenticated;
