-- AI Suggestion Production Traces
-- Stores step-by-step LLM execution traces for debugging AI suggestion behavior.
-- Retention: 14 days (cleaned by pg_cron).

-- ─── Table ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_eval.ai_suggestion_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Step data
  step_number INT NOT NULL,
  finish_reason TEXT,

  -- Tool call data (JSONB arrays to support multiple tool calls per step)
  tool_calls JSONB,       -- [{toolCallId, toolName, args}, ...]
  tool_results JSONB,     -- [{toolCallId, toolName, result}, ...]

  -- Text output (null if step was tool-only)
  text_output TEXT,

  -- Token usage
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,

  -- Request metadata
  model TEXT,
  channel_type TEXT,
  intent TEXT
);

-- ─── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_traces_conversation_id
  ON ai_eval.ai_suggestion_traces(conversation_id);

CREATE INDEX IF NOT EXISTS idx_traces_created_at
  ON ai_eval.ai_suggestion_traces(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_traces_suggestion_id
  ON ai_eval.ai_suggestion_traces(suggestion_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE ai_eval.ai_suggestion_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "traces_select_authenticated"
  ON ai_eval.ai_suggestion_traces FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "traces_all_service_role"
  ON ai_eval.ai_suggestion_traces FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── Grants ────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA ai_eval TO authenticated;
GRANT USAGE ON SCHEMA ai_eval TO service_role;

GRANT SELECT ON ai_eval.ai_suggestion_traces TO authenticated;
GRANT ALL ON ai_eval.ai_suggestion_traces TO service_role;
