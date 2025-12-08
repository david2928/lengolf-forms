-- ============================================================================
-- Migration: Update Analytics Functions for Abandoned Conversations
-- Date: 2025-12-08
-- Description:
--   Update all analytics functions to properly handle "abandoned" status
--   and separate abandoned metrics from SLA calculations
-- ============================================================================

-- ============================================================================
-- Update get_chat_sla_overview to include abandoned metrics
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
  SELECT json_build_object(
    -- SLA metrics (only for met/breached, not abandoned)
    'sla_met_count', COUNT(*) FILTER (WHERE sla_status = 'met' AND is_staff_response = true AND message_in_business_hours = true),
    'sla_breached_count', COUNT(*) FILTER (WHERE sla_status = 'breached' AND is_staff_response = true AND message_in_business_hours = true),
    'unanswered_count', COUNT(*) FILTER (WHERE sla_status = 'unanswered' AND message_in_business_hours = true),

    -- NEW: Abandoned conversations (separate from SLA)
    'abandoned_count', COUNT(*) FILTER (WHERE sla_status = 'abandoned'),

    -- SLA compliance rate (excluding abandoned)
    'sla_compliance_rate', ROUND(
      (COUNT(*) FILTER (WHERE sla_status = 'met' AND is_staff_response = true AND message_in_business_hours = true)::NUMERIC /
       NULLIF(COUNT(*) FILTER (WHERE sla_status IN ('met', 'breached') AND is_staff_response = true AND message_in_business_hours = true), 0) * 100),
      2
    ),

    -- Response times (excluding abandoned)
    'avg_response_minutes', ROUND(
      (AVG(business_hours_response_seconds / 60.0) FILTER (
        WHERE first_staff_response_time IS NOT NULL
        AND message_in_business_hours = true
        AND sla_status != 'abandoned'
      ))::NUMERIC,
      2
    ),
    'median_response_minutes', ROUND(
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY business_hours_response_seconds / 60.0) FILTER (
        WHERE first_staff_response_time IS NOT NULL
        AND message_in_business_hours = true
        AND sla_status != 'abandoned'
      ))::NUMERIC,
      2
    ),

    -- Owner metrics (excluding abandoned)
    'owner_responses_within_10min', COUNT(*) FILTER (
      WHERE response_category = 'owner_response'
      AND sla_status != 'abandoned'
    ),
    'owner_forced_after_10min', COUNT(*) FILTER (
      WHERE response_category = 'owner_forced_after_10min'
      AND sla_status != 'abandoned'
    ),
    'total_owner_responses', COUNT(*) FILTER (
      WHERE response_category LIKE 'owner%'
      AND sla_status != 'abandoned'
    ),

    -- Total messages
    'total_messages_tracked', COUNT(*) FILTER (WHERE message_in_business_hours = true AND sla_status != 'abandoned')
  )
  INTO result
  FROM public.chat_sla_metrics
  WHERE message_date >= start_date
    AND message_date <= end_date
    AND (channel_filter IS NULL OR channel_type = channel_filter);

  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_sla_overview IS
'Get overall SLA metrics for a date range with optional channel filter. Excludes abandoned conversations (>24hr response) from SLA calculations but reports them separately. Returns JSON with compliance rate, response times, owner metrics, and abandoned count.';

-- ============================================================================
-- Update get_chat_sla_by_staff to exclude abandoned
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
        'staff_email', responding_staff_email,
        'staff_name', COALESCE(au.display_name, SPLIT_PART(responding_staff_email, '@', 1), 'Unknown Staff'),
        'total_responses', COUNT(*) FILTER (WHERE sla_status != 'abandoned'),
        'sla_met', COUNT(*) FILTER (WHERE sla_status = 'met'),
        'sla_breached', COUNT(*) FILTER (WHERE sla_status = 'breached'),
        'sla_compliance_rate', ROUND(
          (COUNT(*) FILTER (WHERE sla_status = 'met')::NUMERIC /
           NULLIF(COUNT(*) FILTER (WHERE sla_status IN ('met', 'breached')), 0) * 100),
          2
        ),
        'avg_response_minutes', ROUND(
          (AVG(business_hours_response_seconds / 60.0) FILTER (WHERE sla_status != 'abandoned'))::NUMERIC,
          2
        )
      )
      ORDER BY COUNT(*) FILTER (WHERE sla_status != 'abandoned') DESC
    )
    FROM public.chat_sla_metrics
    LEFT JOIN backoffice.allowed_users au ON au.email = responding_staff_email
    WHERE message_date >= start_date
      AND message_date <= end_date
      AND (channel_filter IS NULL OR channel_type = channel_filter)
      AND message_in_business_hours = true
      AND is_staff_response = true
      AND responding_staff_email IS NOT NULL
      AND sla_status != 'abandoned'
    GROUP BY responding_staff_email, au.display_name
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_sla_by_staff IS
'Get per-staff SLA performance metrics for a date range with optional channel filter. Excludes abandoned conversations (>24hr response). Returns JSON array with staff names, response counts, SLA compliance rates, and average response times.';

-- ============================================================================
-- Update get_chat_sla_daily_trends to exclude abandoned
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
        'sla_met', COUNT(*) FILTER (WHERE sla_status = 'met' AND is_staff_response = true),
        'sla_breached', COUNT(*) FILTER (WHERE sla_status = 'breached' AND is_staff_response = true),
        'unanswered', COUNT(*) FILTER (WHERE sla_status = 'unanswered'),
        'abandoned', COUNT(*) FILTER (WHERE sla_status = 'abandoned'),
        'sla_compliance_rate', ROUND(
          (COUNT(*) FILTER (WHERE sla_status = 'met' AND is_staff_response = true)::NUMERIC /
           NULLIF(COUNT(*) FILTER (WHERE sla_status IN ('met', 'breached') AND is_staff_response = true), 0) * 100),
          2
        ),
        'avg_response_minutes', ROUND(
          (AVG(business_hours_response_seconds / 60.0) FILTER (
            WHERE first_staff_response_time IS NOT NULL
            AND sla_status != 'abandoned'
          ))::NUMERIC,
          2
        )
      )
      ORDER BY message_date ASC
    )
    FROM public.chat_sla_metrics
    WHERE message_date >= start_date
      AND message_date <= end_date
      AND (channel_filter IS NULL OR channel_type = channel_filter)
      AND message_in_business_hours = true
    GROUP BY message_date
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_sla_daily_trends IS
'Get daily SLA trend data for charting. Excludes abandoned conversations (>24hr response) from SLA calculations but includes abandoned count. Returns JSON array with daily metrics including compliance rate, response times, and message counts by status.';

-- ============================================================================
-- Update get_chat_sla_conversation_details to support abandoned filter
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
'Get detailed conversation-level SLA data with customer information. Falls back to LINE display_name or channel-specific customer name when customer record is not linked. Returns individual customer messages with response times, staff information, and SLA status. Now includes "abandoned" status for conversations with >24hr response time.';
