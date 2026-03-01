-- AI Evaluation Tracking System
-- Stores eval runs and individual sample results for AI suggestion quality monitoring.

-- ─── Schema ─────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS ai_eval;

-- ─── Eval Runs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_eval.eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  trigger_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('cron', 'manual', 'ci')),

  -- Prompt versioning
  prompt_version TEXT,
  prompt_hash TEXT,
  git_commit_hash TEXT,
  prompt_label TEXT,

  -- Model snapshots
  suggestion_model TEXT,
  judge_model TEXT,

  -- Sample counts
  sample_count_requested INT,
  total_samples INT DEFAULT 0,
  judged_samples INT DEFAULT 0,
  skipped_no_staff INT DEFAULT 0,

  -- Denormalized aggregates (updated after all samples judged)
  avg_overall DECIMAL(4,2),
  avg_appropriateness DECIMAL(4,2),
  avg_helpfulness DECIMAL(4,2),
  avg_tone_match DECIMAL(4,2),
  avg_brevity DECIMAL(4,2),

  -- Distribution & breakdown
  score_distribution JSONB DEFAULT '{}',
  by_intent JSONB DEFAULT '[]',

  -- Latency tracking
  avg_suggestion_latency_ms INT,
  avg_judge_latency_ms INT,

  -- Batching (for Edge Function)
  batch_current INT DEFAULT 0,
  batch_total INT DEFAULT 0,
  conversation_ids JSONB,

  -- Error tracking
  error_count INT DEFAULT 0,
  error_message TEXT
);

-- ─── Eval Samples ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_eval.eval_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES ai_eval.eval_runs(id) ON DELETE CASCADE,

  -- Conversation context
  conversation_id UUID,
  customer_name TEXT,
  channel_type TEXT,

  -- Test input
  customer_message TEXT NOT NULL,
  conversation_history JSONB,
  actual_staff_response TEXT,

  -- AI output
  ai_response TEXT,
  ai_response_thai TEXT,

  -- Classification
  intent TEXT,
  intent_source TEXT,
  confidence_score DECIMAL(3,2),
  function_called TEXT,
  has_customer_context BOOLEAN DEFAULT false,
  needs_management BOOLEAN DEFAULT false,

  -- Latency
  suggestion_latency_ms INT,

  -- Judge scores
  judge_overall DECIMAL(3,1),
  judge_appropriateness INT CHECK (judge_appropriateness BETWEEN 1 AND 5),
  judge_helpfulness INT CHECK (judge_helpfulness BETWEEN 1 AND 5),
  judge_tone_match INT CHECK (judge_tone_match BETWEEN 1 AND 5),
  judge_brevity INT CHECK (judge_brevity BETWEEN 1 AND 5),
  judge_reasoning JSONB,
  judge_model TEXT,
  judge_latency_ms INT
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_eval_samples_run_id ON ai_eval.eval_samples(run_id);
CREATE INDEX IF NOT EXISTS idx_eval_samples_intent ON ai_eval.eval_samples(intent);
CREATE INDEX IF NOT EXISTS idx_eval_samples_judge_overall ON ai_eval.eval_samples(judge_overall);
CREATE INDEX IF NOT EXISTS idx_eval_samples_conversation_id ON ai_eval.eval_samples(conversation_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_started_at ON ai_eval.eval_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_runs_prompt_hash ON ai_eval.eval_runs(prompt_hash);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE ai_eval.eval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_eval.eval_samples ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "eval_runs_select_authenticated"
  ON ai_eval.eval_runs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "eval_samples_select_authenticated"
  ON ai_eval.eval_samples FOR SELECT TO authenticated
  USING (true);

-- Service role can do everything
CREATE POLICY "eval_runs_all_service_role"
  ON ai_eval.eval_runs FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "eval_samples_all_service_role"
  ON ai_eval.eval_samples FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── Grants ─────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA ai_eval TO authenticated;
GRANT USAGE ON SCHEMA ai_eval TO service_role;

GRANT SELECT ON ai_eval.eval_runs TO authenticated;
GRANT SELECT ON ai_eval.eval_samples TO authenticated;

GRANT ALL ON ai_eval.eval_runs TO service_role;
GRANT ALL ON ai_eval.eval_samples TO service_role;
