-- Chat Opportunity Recovery System
-- Created: 2026-02-05
-- Purpose: Track and manage sales opportunities from chat conversations
-- Note: Separate from "Following" which is for short-term operational follow-up

-- ============================================================================
-- Table 1: chat_opportunities
-- Main table for tracking sales opportunities from chat conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  channel_type TEXT NOT NULL,

  -- Classification
  opportunity_type TEXT NOT NULL CHECK (opportunity_type IN (
    'coaching_inquiry',
    'pricing_inquiry',
    'booking_failed',
    'package_interest',
    'equipment_inquiry',
    'general_interest'
  )),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- LLM Analysis
  analysis_summary TEXT,
  suggested_action TEXT,
  suggested_message TEXT,

  -- Contact info extracted from conversation
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- New opportunity, not yet contacted
    'contacted',    -- Staff has reached out
    'converted',    -- Opportunity successfully converted (booking/purchase)
    'lost',         -- Customer declined or no response after contact
    'dismissed'     -- Staff dismissed as not a real opportunity
  )),
  contacted_at TIMESTAMPTZ,
  contacted_by TEXT,
  outcome TEXT,
  outcome_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '60 days'),

  -- Ensure one opportunity per conversation
  UNIQUE(conversation_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chat_opportunities_status ON public.chat_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_chat_opportunities_priority ON public.chat_opportunities(priority);
CREATE INDEX IF NOT EXISTS idx_chat_opportunities_type ON public.chat_opportunities(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_chat_opportunities_created ON public.chat_opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_opportunities_channel ON public.chat_opportunities(channel_type);
CREATE INDEX IF NOT EXISTS idx_chat_opportunities_expires ON public.chat_opportunities(expires_at) WHERE status = 'pending';

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_chat_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_chat_opportunities_updated_at ON public.chat_opportunities;
CREATE TRIGGER trigger_chat_opportunities_updated_at
  BEFORE UPDATE ON public.chat_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_opportunities_updated_at();

-- ============================================================================
-- Table 2: chat_opportunity_logs
-- Audit log for tracking follow-up history and actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_opportunity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.chat_opportunities(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'created',
    'analyzed',
    'contacted',
    'status_changed',
    'note_added',
    'message_sent',
    'expired'
  )),
  actor TEXT, -- staff email or 'system'
  previous_status TEXT,
  new_status TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_opportunity_logs_opportunity ON public.chat_opportunity_logs(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_chat_opportunity_logs_created ON public.chat_opportunity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_opportunity_logs_actor ON public.chat_opportunity_logs(actor);

-- ============================================================================
-- Function 1: find_chat_opportunities
-- Identifies conversations that could be sales opportunities
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_chat_opportunities(
  p_days_threshold INT DEFAULT 3,
  p_max_age_days INT DEFAULT 30
)
RETURNS TABLE (
  conversation_id UUID,
  channel_type TEXT,
  channel_user_id TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_text TEXT,
  last_message_by TEXT,
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  days_since_last_message INT,
  has_inquiry_keywords BOOLEAN,
  inquiry_keywords TEXT[],
  suggested_opportunity_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.id AS conversation_id,
    uc.channel_type,
    uc.channel_user_id,
    uc.last_message_at,
    uc.last_message_text,
    uc.last_message_by,
    uc.customer_id,
    -- Extract name from metadata
    COALESCE(
      uc.channel_metadata->>'customer_name',
      uc.channel_metadata->>'display_name',
      uc.channel_metadata->>'name',
      uc.channel_metadata->>'full_name'
    ) AS customer_name,
    -- Extract phone from metadata
    COALESCE(
      uc.channel_metadata->>'phone_number',
      uc.channel_metadata->>'phone'
    ) AS customer_phone,
    -- Extract email from metadata
    uc.channel_metadata->>'email' AS customer_email,
    EXTRACT(DAY FROM NOW() - uc.last_message_at)::INT AS days_since_last_message,
    -- Check for inquiry keywords
    (
      uc.last_message_text ILIKE ANY(ARRAY[
        '%lesson%', '%เรียน%', '%coach%', '%โค้ช%', '%สอน%',
        '%price%', '%ราคา%', '%บาท%', '%โปร%', '%promo%', '%ลด%', '%discount%',
        '%book%', '%จอง%', '%available%', '%ว่าง%',
        '%package%', '%แพ็ค%', '%แพ็กเกจ%',
        '%club%', '%ไม้%', '%อุปกรณ์%', '%equipment%',
        '%interest%', '%สนใจ%', '%อยาก%', '%want%'
      ])
    ) AS has_inquiry_keywords,
    -- Extract matched keywords (for display)
    ARRAY_REMOVE(ARRAY[
      CASE WHEN uc.last_message_text ILIKE '%lesson%' OR uc.last_message_text ILIKE '%เรียน%' OR uc.last_message_text ILIKE '%coach%' OR uc.last_message_text ILIKE '%โค้ช%' OR uc.last_message_text ILIKE '%สอน%' THEN 'coaching' END,
      CASE WHEN uc.last_message_text ILIKE '%price%' OR uc.last_message_text ILIKE '%ราคา%' OR uc.last_message_text ILIKE '%บาท%' OR uc.last_message_text ILIKE '%โปร%' OR uc.last_message_text ILIKE '%promo%' THEN 'pricing' END,
      CASE WHEN uc.last_message_text ILIKE '%book%' OR uc.last_message_text ILIKE '%จอง%' OR uc.last_message_text ILIKE '%available%' OR uc.last_message_text ILIKE '%ว่าง%' THEN 'booking' END,
      CASE WHEN uc.last_message_text ILIKE '%package%' OR uc.last_message_text ILIKE '%แพ็ค%' OR uc.last_message_text ILIKE '%แพ็กเกจ%' THEN 'packages' END,
      CASE WHEN uc.last_message_text ILIKE '%club%' OR uc.last_message_text ILIKE '%ไม้%' OR uc.last_message_text ILIKE '%อุปกรณ์%' OR uc.last_message_text ILIKE '%equipment%' THEN 'equipment' END,
      CASE WHEN uc.last_message_text ILIKE '%interest%' OR uc.last_message_text ILIKE '%สนใจ%' OR uc.last_message_text ILIKE '%อยาก%' OR uc.last_message_text ILIKE '%want%' THEN 'interest' END
    ], NULL) AS inquiry_keywords,
    -- Suggest opportunity type based on keywords
    CASE
      WHEN uc.last_message_text ILIKE ANY(ARRAY['%lesson%', '%เรียน%', '%coach%', '%โค้ช%', '%สอน%']) THEN 'coaching_inquiry'
      WHEN uc.last_message_text ILIKE ANY(ARRAY['%price%', '%ราคา%', '%บาท%', '%โปร%', '%promo%', '%ลด%', '%discount%']) THEN 'pricing_inquiry'
      WHEN uc.last_message_text ILIKE ANY(ARRAY['%book%', '%จอง%', '%available%', '%ว่าง%']) THEN 'booking_failed'
      WHEN uc.last_message_text ILIKE ANY(ARRAY['%package%', '%แพ็ค%', '%แพ็กเกจ%']) THEN 'package_interest'
      WHEN uc.last_message_text ILIKE ANY(ARRAY['%club%', '%ไม้%', '%อุปกรณ์%', '%equipment%']) THEN 'equipment_inquiry'
      ELSE 'general_interest'
    END AS suggested_opportunity_type
  FROM public.unified_conversations uc
  LEFT JOIN public.chat_opportunities co ON co.conversation_id = uc.id
  WHERE
    -- Not spam
    (uc.is_spam IS DISTINCT FROM true)
    -- Not already being followed
    AND (uc.is_following IS DISTINCT FROM true)
    -- Not already an opportunity
    AND co.id IS NULL
    -- Within time window
    AND uc.last_message_at > NOW() - (p_max_age_days || ' days')::INTERVAL
    AND uc.last_message_at < NOW() - (p_days_threshold || ' days')::INTERVAL
    -- Has some message text to analyze
    AND uc.last_message_text IS NOT NULL
    AND LENGTH(uc.last_message_text) > 0
  ORDER BY uc.last_message_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.find_chat_opportunities IS 'Identifies conversations that could be sales opportunities based on age and content';

-- ============================================================================
-- Function 2: get_chat_opportunities
-- Returns paginated list of opportunities with filtering
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_chat_opportunities(
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_opportunity_type TEXT DEFAULT NULL,
  p_channel_type TEXT DEFAULT NULL,
  p_offset INT DEFAULT 0,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  channel_type TEXT,
  opportunity_type TEXT,
  priority TEXT,
  confidence_score DECIMAL(3,2),
  analysis_summary TEXT,
  suggested_action TEXT,
  suggested_message TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  status TEXT,
  contacted_at TIMESTAMPTZ,
  contacted_by TEXT,
  outcome TEXT,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  analyzed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  -- Conversation details
  conv_last_message_at TIMESTAMPTZ,
  conv_last_message_text TEXT,
  conv_last_message_by TEXT,
  conv_channel_metadata JSONB,
  days_cold INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    co.id,
    co.conversation_id,
    co.channel_type,
    co.opportunity_type,
    co.priority,
    co.confidence_score,
    co.analysis_summary,
    co.suggested_action,
    co.suggested_message,
    co.customer_name,
    co.customer_phone,
    co.customer_email,
    co.status,
    co.contacted_at,
    co.contacted_by,
    co.outcome,
    co.outcome_notes,
    co.created_at,
    co.updated_at,
    co.analyzed_at,
    co.expires_at,
    uc.last_message_at AS conv_last_message_at,
    uc.last_message_text AS conv_last_message_text,
    uc.last_message_by AS conv_last_message_by,
    uc.channel_metadata AS conv_channel_metadata,
    EXTRACT(DAY FROM NOW() - uc.last_message_at)::INT AS days_cold
  FROM public.chat_opportunities co
  LEFT JOIN public.unified_conversations uc ON uc.id = co.conversation_id
  WHERE
    (p_status IS NULL OR co.status = p_status)
    AND (p_priority IS NULL OR co.priority = p_priority)
    AND (p_opportunity_type IS NULL OR co.opportunity_type = p_opportunity_type)
    AND (p_channel_type IS NULL OR co.channel_type = p_channel_type)
    AND (co.expires_at IS NULL OR co.expires_at > NOW() OR co.status != 'pending')
  ORDER BY
    -- Priority order: high > medium > low
    CASE co.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
    -- Then by creation date (newest first)
    co.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_chat_opportunities IS 'Returns paginated list of opportunities with optional filtering';

-- ============================================================================
-- Function 3: count_chat_opportunities
-- Returns counts by status for dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_chat_opportunities()
RETURNS TABLE (
  status TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    co.status,
    COUNT(*)::BIGINT
  FROM public.chat_opportunities co
  WHERE co.expires_at IS NULL OR co.expires_at > NOW() OR co.status != 'pending'
  GROUP BY co.status
  ORDER BY co.status;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.count_chat_opportunities IS 'Returns opportunity counts grouped by status';

-- ============================================================================
-- Function 4: get_chat_opportunity_stats
-- Returns statistics for the opportunities dashboard
-- ============================================================================

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
  -- Get counts by status
  SELECT COUNT(*) INTO v_total_pending FROM public.chat_opportunities WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > NOW());
  SELECT COUNT(*) INTO v_total_contacted FROM public.chat_opportunities WHERE status = 'contacted';
  SELECT COUNT(*) INTO v_total_converted FROM public.chat_opportunities WHERE status = 'converted';
  SELECT COUNT(*) INTO v_total_lost FROM public.chat_opportunities WHERE status = 'lost';
  SELECT COUNT(*) INTO v_total_dismissed FROM public.chat_opportunities WHERE status = 'dismissed';

  -- Calculate conversion rate (converted / (converted + lost + contacted))
  IF (v_total_converted + v_total_lost + v_total_contacted) > 0 THEN
    v_conversion_rate := (v_total_converted::DECIMAL / (v_total_converted + v_total_lost + v_total_contacted)::DECIMAL * 100)::DECIMAL(5,2);
  ELSE
    v_conversion_rate := 0;
  END IF;

  -- Calculate average days to contact
  SELECT AVG(EXTRACT(DAY FROM contacted_at - created_at))::DECIMAL(5,1)
  INTO v_avg_days_to_contact
  FROM public.chat_opportunities
  WHERE contacted_at IS NOT NULL;

  -- Get counts by opportunity type
  SELECT COALESCE(jsonb_object_agg(opportunity_type, cnt), '{}'::jsonb)
  INTO v_by_type
  FROM (
    SELECT opportunity_type, COUNT(*) as cnt
    FROM public.chat_opportunities
    WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > NOW())
    GROUP BY opportunity_type
  ) t;

  -- Get counts by priority
  SELECT COALESCE(jsonb_object_agg(priority, cnt), '{}'::jsonb)
  INTO v_by_priority
  FROM (
    SELECT priority, COUNT(*) as cnt
    FROM public.chat_opportunities
    WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > NOW())
    GROUP BY priority
  ) p;

  -- Get counts by channel
  SELECT COALESCE(jsonb_object_agg(channel_type, cnt), '{}'::jsonb)
  INTO v_by_channel
  FROM (
    SELECT channel_type, COUNT(*) as cnt
    FROM public.chat_opportunities
    WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > NOW())
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

COMMENT ON FUNCTION public.get_chat_opportunity_stats IS 'Returns statistics for the opportunities dashboard';

-- ============================================================================
-- Permissions
-- ============================================================================

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE ON public.chat_opportunities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_opportunities TO service_role;
GRANT SELECT, INSERT ON public.chat_opportunity_logs TO authenticated;
GRANT SELECT, INSERT ON public.chat_opportunity_logs TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.find_chat_opportunities(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_chat_opportunities(INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_chat_opportunities(TEXT, TEXT, TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_opportunities(TEXT, TEXT, TEXT, TEXT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_chat_opportunities() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_chat_opportunities() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_chat_opportunity_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_opportunity_stats() TO service_role;

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE public.chat_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_opportunity_logs ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to access opportunities
CREATE POLICY "Authenticated users can view opportunities"
  ON public.chat_opportunities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert opportunities"
  ON public.chat_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update opportunities"
  ON public.chat_opportunities FOR UPDATE
  TO authenticated
  USING (true);

-- Policy for opportunity logs
CREATE POLICY "Authenticated users can view opportunity logs"
  ON public.chat_opportunity_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert opportunity logs"
  ON public.chat_opportunity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Service role bypass
CREATE POLICY "Service role full access to opportunities"
  ON public.chat_opportunities FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to opportunity logs"
  ON public.chat_opportunity_logs FOR ALL
  TO service_role
  USING (true);
