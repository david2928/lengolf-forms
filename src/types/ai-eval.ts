// Types for AI Eval Tracking System

export interface EvalRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed' | 'partial';
  trigger_type: 'cron' | 'manual' | 'ci';
  prompt_version: string | null;
  prompt_hash: string | null;
  git_commit_hash: string | null;
  prompt_label: string | null;
  suggestion_model: string | null;
  judge_model: string | null;
  sample_count_requested: number | null;
  total_samples: number;
  judged_samples: number;
  skipped_no_staff: number;
  avg_overall: number | null;
  avg_appropriateness: number | null;
  avg_helpfulness: number | null;
  avg_tone_match: number | null;
  avg_brevity: number | null;
  score_distribution: Record<string, number>;
  by_intent: IntentBreakdown[];
  avg_suggestion_latency_ms: number | null;
  avg_judge_latency_ms: number | null;
  batch_current: number;
  batch_total: number;
  error_count: number;
  error_message: string | null;
}

export interface EvalSample {
  id: string;
  run_id: string;
  conversation_id: string | null;
  customer_name: string | null;
  channel_type: string | null;
  customer_message: string;
  conversation_history: unknown[] | null;
  actual_staff_response: string | null;
  ai_response: string | null;
  ai_response_thai: string | null;
  intent: string | null;
  intent_source: string | null;
  confidence_score: number | null;
  function_called: string | null;
  has_customer_context: boolean;
  needs_management: boolean;
  suggestion_latency_ms: number | null;
  judge_overall: number | null;
  judge_appropriateness: number | null;
  judge_helpfulness: number | null;
  judge_tone_match: number | null;
  judge_brevity: number | null;
  judge_reasoning: JudgeReasoning | null;
  judge_model: string | null;
  judge_latency_ms: number | null;
}

export interface JudgeReasoning {
  appropriateness: string;
  helpfulness: string;
  toneMatch: string;
  brevity: string;
}

export interface IntentBreakdown {
  intent: string;
  count: number;
  overallMean: number;
}

export interface EvalTrendPoint {
  id: string;
  started_at: string;
  prompt_version: string | null;
  prompt_label: string | null;
  total_samples: number;
  judged_samples: number;
  avg_overall: number | null;
  avg_appropriateness: number | null;
  avg_helpfulness: number | null;
  avg_tone_match: number | null;
  avg_brevity: number | null;
}

export interface RunListParams {
  limit?: number;
  offset?: number;
  prompt_version?: string;
  from?: string;
  to?: string;
}

export interface SampleListParams {
  intent?: string;
  min_score?: number;
  max_score?: number;
  limit?: number;
  offset?: number;
}
