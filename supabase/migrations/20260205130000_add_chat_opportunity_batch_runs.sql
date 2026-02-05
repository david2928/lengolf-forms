-- Chat Opportunity Batch Processing Audit Table
-- Created: 2026-02-05
-- Purpose: Track batch processing runs for monitoring and debugging

-- ============================================================================
-- Table: chat_opportunity_batch_runs
-- Audit log for tracking batch processing runs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_opportunity_batch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  trigger_type TEXT DEFAULT 'cron' CHECK (trigger_type IN ('cron', 'manual')),

  -- Processing summary
  scanned INT DEFAULT 0,
  analyzed INT DEFAULT 0,
  created INT DEFAULT 0,
  skipped INT DEFAULT 0,
  errors INT DEFAULT 0,

  -- Performance
  processing_time_ms INT,

  -- Parameters used
  parameters JSONB,

  -- Error tracking
  error_message TEXT
);

-- Indexes for monitoring queries
CREATE INDEX IF NOT EXISTS idx_chat_opportunity_batch_runs_started
  ON public.chat_opportunity_batch_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_opportunity_batch_runs_status
  ON public.chat_opportunity_batch_runs(status);

-- ============================================================================
-- Permissions
-- ============================================================================

-- Grant permissions on table
GRANT SELECT, INSERT, UPDATE ON public.chat_opportunity_batch_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_opportunity_batch_runs TO service_role;

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE public.chat_opportunity_batch_runs ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view batch runs (read-only for UI status display)
CREATE POLICY "Authenticated users can view batch runs"
  ON public.chat_opportunity_batch_runs FOR SELECT
  TO authenticated
  USING (true);

-- Service role can do everything (needed for cron job)
CREATE POLICY "Service role full access to batch runs"
  ON public.chat_opportunity_batch_runs FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.chat_opportunity_batch_runs IS 'Audit log for chat opportunity batch processing runs';
COMMENT ON COLUMN public.chat_opportunity_batch_runs.trigger_type IS 'Whether run was triggered by cron or manual invocation';
COMMENT ON COLUMN public.chat_opportunity_batch_runs.scanned IS 'Number of conversations scanned by find_chat_opportunities';
COMMENT ON COLUMN public.chat_opportunity_batch_runs.analyzed IS 'Number of conversations sent to LLM for analysis';
COMMENT ON COLUMN public.chat_opportunity_batch_runs.created IS 'Number of opportunities created';
COMMENT ON COLUMN public.chat_opportunity_batch_runs.skipped IS 'Number skipped (not_an_opportunity, low confidence, or already exists)';
COMMENT ON COLUMN public.chat_opportunity_batch_runs.errors IS 'Number of errors encountered';
