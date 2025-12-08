-- ============================================================================
-- Migration: Fix LINE User Display Name Join
-- Date: 2025-12-08
-- Description:
--   Fix get_chat_sla_conversation_details function to properly join line_users
--   table for display_name (line_conversations doesn't have display_name column)
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
        'customer_name', COALESCE(
          c.customer_name,
          lu.display_name,           -- LINE user display name
          wc.display_name,           -- Website session display name
          mu.display_name,           -- Meta user display name
          'Unknown Customer'
        ),
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
    -- LEFT JOIN for LINE display_name fallback (join through line_conversations to line_users)
    LEFT JOIN public.line_conversations lc ON lc.id = details.conversation_id AND details.channel_type = 'line'
    LEFT JOIN public.line_users lu ON lu.line_user_id = lc.line_user_id
    -- LEFT JOIN for website display_name fallback
    LEFT JOIN public.web_chat_sessions wc ON wc.id = details.conversation_id AND details.channel_type = 'website'
    -- LEFT JOIN for meta display_name fallback (join through meta_conversations to meta_users)
    LEFT JOIN public.meta_conversations mc ON mc.id = details.conversation_id AND details.channel_type IN ('facebook', 'instagram', 'whatsapp', 'meta')
    LEFT JOIN public.meta_users mu ON mu.platform_user_id = mc.platform_user_id AND mu.platform = mc.platform
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_sla_conversation_details IS
'Get detailed conversation-level SLA data with customer information. Falls back to LINE display_name (via line_users table) or channel-specific customer name when customer record is not linked. Returns individual customer messages with response times, staff information, and SLA status. Includes "abandoned" status for conversations with >24hr response time.';
