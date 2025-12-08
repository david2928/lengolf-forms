-- ============================================================================
-- Migration: Fix Nested Aggregate Functions in Analytics
-- Date: 2025-12-08
-- Description:
--   Fix "aggregate function calls cannot be nested" errors in
--   get_chat_sla_by_staff and get_chat_sla_daily_trends functions
-- ============================================================================

-- ============================================================================
-- Fix get_chat_sla_by_staff - Use subquery to avoid nested aggregates
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
        COUNT(*) FILTER (WHERE sla_status != 'abandoned') AS total_responses,
        COUNT(*) FILTER (WHERE sla_status = 'met') AS sla_met,
        COUNT(*) FILTER (WHERE sla_status = 'breached') AS sla_breached,
        ROUND(
          (COUNT(*) FILTER (WHERE sla_status = 'met')::NUMERIC /
           NULLIF(COUNT(*) FILTER (WHERE sla_status IN ('met', 'breached')), 0) * 100),
          2
        ) AS sla_compliance_rate,
        ROUND(
          (AVG(business_hours_response_seconds / 60.0) FILTER (WHERE sla_status != 'abandoned'))::NUMERIC,
          2
        ) AS avg_response_minutes
      FROM public.chat_sla_metrics
      LEFT JOIN backoffice.allowed_users au ON au.email = responding_staff_email
      WHERE message_date >= start_date
        AND message_date <= end_date
        AND (channel_filter IS NULL OR channel_type = channel_filter)
        AND message_in_business_hours = true
        AND is_staff_response = true
        AND sla_status != 'abandoned'
      GROUP BY responding_staff_email, au.display_name
    ) staff_data
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_sla_by_staff IS
'Get per-staff SLA performance metrics for a date range with optional channel filter. Excludes abandoned conversations (>24hr response). Returns JSON array with staff names, response counts, SLA compliance rates, and average response times. Uses subquery to avoid nested aggregate errors.';

-- ============================================================================
-- Fix get_chat_sla_daily_trends - Use subquery to avoid nested aggregates
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
        ROUND(
          (COUNT(*) FILTER (WHERE sla_status = 'met' AND is_staff_response = true)::NUMERIC /
           NULLIF(COUNT(*) FILTER (WHERE sla_status IN ('met', 'breached') AND is_staff_response = true), 0) * 100),
          2
        ) AS sla_compliance_rate,
        ROUND(
          (AVG(business_hours_response_seconds / 60.0) FILTER (
            WHERE first_staff_response_time IS NOT NULL
            AND sla_status != 'abandoned'
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
'Get daily SLA trend data for charting. Excludes abandoned conversations (>24hr response) from SLA calculations but includes abandoned count. Returns JSON array with daily metrics including compliance rate, response times, and message counts by status. Uses subquery to avoid nested aggregate errors.';
