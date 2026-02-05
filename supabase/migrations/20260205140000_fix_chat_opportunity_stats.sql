-- Fix chat opportunity stats to exclude not_an_opportunity items
-- This makes the counts consistent with the list display

CREATE OR REPLACE FUNCTION public.get_chat_opportunity_stats()
RETURNS TABLE (
  total_pending BIGINT,
  total_contacted BIGINT,
  total_converted BIGINT,
  total_lost BIGINT,
  total_dismissed BIGINT,
  conversion_rate DECIMAL(5,2),
  avg_days_to_contact DECIMAL(5,1),
  by_type JSONB,
  by_priority JSONB,
  by_channel JSONB
) AS $$
DECLARE
  v_total_pending BIGINT;
  v_total_contacted BIGINT;
  v_total_converted BIGINT;
  v_total_lost BIGINT;
  v_total_dismissed BIGINT;
  v_conversion_rate DECIMAL(5,2);
  v_avg_days_to_contact DECIMAL(5,1);
  v_by_type JSONB;
  v_by_priority JSONB;
  v_by_channel JSONB;
BEGIN
  -- Get counts by status (excluding not_an_opportunity)
  SELECT COUNT(*) INTO v_total_pending FROM public.chat_opportunities 
    WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > NOW()) 
    AND opportunity_type != 'not_an_opportunity';
  SELECT COUNT(*) INTO v_total_contacted FROM public.chat_opportunities 
    WHERE status = 'contacted' AND opportunity_type != 'not_an_opportunity';
  SELECT COUNT(*) INTO v_total_converted FROM public.chat_opportunities 
    WHERE status = 'converted' AND opportunity_type != 'not_an_opportunity';
  SELECT COUNT(*) INTO v_total_lost FROM public.chat_opportunities 
    WHERE status = 'lost' AND opportunity_type != 'not_an_opportunity';
  SELECT COUNT(*) INTO v_total_dismissed FROM public.chat_opportunities 
    WHERE status = 'dismissed' AND opportunity_type != 'not_an_opportunity';

  -- Calculate conversion rate (converted / (converted + lost + contacted))
  IF (v_total_converted + v_total_lost + v_total_contacted) > 0 THEN
    v_conversion_rate := (v_total_converted::DECIMAL / (v_total_converted + v_total_lost + v_total_contacted)::DECIMAL * 100)::DECIMAL(5,2);
  ELSE
    v_conversion_rate := 0;
  END IF;

  -- Calculate average days to contact (excluding not_an_opportunity)
  SELECT AVG(EXTRACT(DAY FROM contacted_at - created_at))::DECIMAL(5,1)
  INTO v_avg_days_to_contact
  FROM public.chat_opportunities
  WHERE contacted_at IS NOT NULL AND opportunity_type != 'not_an_opportunity';

  -- Get counts by opportunity type (excluding not_an_opportunity)
  SELECT COALESCE(jsonb_object_agg(opportunity_type, cnt), '{}'::jsonb)
  INTO v_by_type
  FROM (
    SELECT opportunity_type, COUNT(*) as cnt
    FROM public.chat_opportunities
    WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > NOW())
      AND opportunity_type != 'not_an_opportunity'
    GROUP BY opportunity_type
  ) t;

  -- Get counts by priority (excluding not_an_opportunity)
  SELECT COALESCE(jsonb_object_agg(priority, cnt), '{}'::jsonb)
  INTO v_by_priority
  FROM (
    SELECT priority, COUNT(*) as cnt
    FROM public.chat_opportunities
    WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > NOW())
      AND opportunity_type != 'not_an_opportunity'
    GROUP BY priority
  ) p;

  -- Get counts by channel (excluding not_an_opportunity)
  SELECT COALESCE(jsonb_object_agg(channel_type, cnt), '{}'::jsonb)
  INTO v_by_channel
  FROM (
    SELECT channel_type, COUNT(*) as cnt
    FROM public.chat_opportunities
    WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > NOW())
      AND opportunity_type != 'not_an_opportunity'
    GROUP BY channel_type
  ) c;

  RETURN QUERY SELECT
    v_total_pending,
    v_total_contacted,
    v_total_converted,
    v_total_lost,
    v_total_dismissed,
    v_conversion_rate,
    COALESCE(v_avg_days_to_contact, 0),
    v_by_type,
    v_by_priority,
    v_by_channel;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_opportunity_stats IS 'Returns statistics for the opportunities dashboard, excluding not_an_opportunity items';
