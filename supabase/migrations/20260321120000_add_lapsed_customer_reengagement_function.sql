-- Function to identify lapsed customers for Welcome Back re-engagement campaigns
-- Called by /api/cron/welcome-back on the 15th of each month
CREATE OR REPLACE FUNCTION get_lapsed_customers_for_reengagement(p_language TEXT)
RETURNS TABLE (
  customer_id UUID,
  customer_name VARCHAR,
  line_user_id TEXT,
  last_visit_date DATE,
  total_visits INTEGER,
  total_lifetime_value NUMERIC,
  days_lapsed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH active_pkg_customers AS (
    SELECT DISTINCT p.customer_id
    FROM backoffice.packages p
    JOIN backoffice.package_types pt ON pt.id = p.package_type_id
    LEFT JOIN (
      SELECT package_id, SUM(used_hours) as total_used
      FROM backoffice.package_usage
      GROUP BY package_id
    ) pu ON pu.package_id = p.id
    WHERE p.customer_id IS NOT NULL
      AND (p.expiration_date > CURRENT_DATE OR p.expiration_date IS NULL)
      AND (pt.hours - COALESCE(pu.total_used, 0)) > 0
  )
  SELECT DISTINCT ON (c.id)
    c.id as customer_id,
    c.customer_name,
    uc.channel_user_id as line_user_id,
    c.last_visit_date,
    c.total_visits,
    c.total_lifetime_value,
    (CURRENT_DATE - c.last_visit_date)::INTEGER as days_lapsed
  FROM public.customers c
  JOIN unified_conversations uc ON uc.customer_id = c.id
  WHERE uc.channel_user_id IS NOT NULL
    AND uc.channel_type = 'line'
    AND COALESCE(uc.is_spam, false) = false
    -- 90+ days inactive (no upper cap — re-eligible after 90 days since last campaign)
    AND c.last_visit_date < CURRENT_DATE - INTERVAL '90 days'
    -- Not messaged in last 7 days
    AND uc.last_message_at < CURRENT_DATE - INTERVAL '7 days'
    -- Language filter
    AND CASE
      WHEN p_language = 'thai' THEN uc.last_message_text ~ '[\u0E00-\u0E7F]'
      WHEN p_language = 'english' THEN uc.last_message_text !~ '[\u0E00-\u0E7F]'
      ELSE TRUE
    END
    -- Exclude active package holders
    AND c.id NOT IN (SELECT apc.customer_id FROM active_pkg_customers apc)
    -- Exclude anyone who received Welcome Back in last 90 days
    AND c.id NOT IN (
      SELECT lbl.customer_id
      FROM line_broadcast_logs lbl
      JOIN line_broadcast_campaigns lbc ON lbc.id = lbl.campaign_id
      WHERE lbc.name LIKE 'Welcome Back%'
        AND lbl.status = 'success'
        AND lbl.sent_at > CURRENT_DATE - INTERVAL '90 days'
    )
  ORDER BY c.id, uc.last_message_at DESC;
END;
$$ LANGUAGE plpgsql;
