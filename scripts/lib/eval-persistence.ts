/**
 * Eval persistence module — writes eval runs and samples to Supabase.
 *
 * Uses the ai_eval schema via service role client.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { JudgeScores, JudgeableSample, DIMENSION_WEIGHTS } from './judge';
import { PromptVersion } from './prompt-version';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EvalRunConfig {
  promptVersion: PromptVersion;
  triggerType: 'manual' | 'cron' | 'ci';
  sampleCountRequested: number;
  suggestionModel?: string;
  judgeModel?: string;
}

interface SampleForInsert {
  conversationId: string;
  customerName: string | null;
  channelType: string;
  customerMessage: string;
  conversationHistory: unknown[];
  actualStaffResponse: string | null;
  aiResponse: string;
  aiResponseThai: string | null;
  intent: string;
  intentSource: string;
  confidenceScore: number;
  functionCalled: string | null;
  hasCustomerContext: boolean;
  needsManagement: boolean;
  suggestionLatencyMs: number;
  judgeScores?: JudgeScores | null;
}

// ─── Supabase client ─────────────────────────────────────────────────────────

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
  const key = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_REFAC_SUPABASE_URL or REFAC_SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Create eval run ─────────────────────────────────────────────────────────

export async function createEvalRun(config: EvalRunConfig): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .schema('ai_eval')
    .from('eval_runs')
    .insert({
      status: 'running',
      trigger_type: config.triggerType,
      prompt_version: config.promptVersion.version,
      prompt_hash: config.promptVersion.hash,
      git_commit_hash: config.promptVersion.gitCommitHash,
      prompt_label: config.promptVersion.label,
      suggestion_model: config.suggestionModel || null,
      judge_model: config.judgeModel || null,
      sample_count_requested: config.sampleCountRequested,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create eval run: ${error?.message || 'No data returned'}`);
  }

  return data.id;
}

// ─── Insert eval samples ────────────────────────────────────────────────────

export async function insertEvalSamples(
  runId: string,
  samples: SampleForInsert[],
): Promise<number> {
  const supabase = getSupabase();
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < samples.length; i += BATCH_SIZE) {
    const batch = samples.slice(i, i + BATCH_SIZE);

    const rows = batch.map((s) => ({
      run_id: runId,
      conversation_id: s.conversationId,
      customer_name: s.customerName,
      channel_type: s.channelType,
      customer_message: s.customerMessage,
      conversation_history: s.conversationHistory,
      actual_staff_response: s.actualStaffResponse,
      ai_response: s.aiResponse,
      ai_response_thai: s.aiResponseThai,
      intent: s.intent,
      intent_source: s.intentSource,
      confidence_score: s.confidenceScore,
      function_called: s.functionCalled,
      has_customer_context: s.hasCustomerContext,
      needs_management: s.needsManagement,
      suggestion_latency_ms: s.suggestionLatencyMs,
      // Judge scores (if judged)
      judge_overall: s.judgeScores?.overallScore ?? null,
      judge_appropriateness: s.judgeScores?.appropriateness.score ?? null,
      judge_helpfulness: s.judgeScores?.helpfulness.score ?? null,
      judge_tone_match: s.judgeScores?.toneMatch.score ?? null,
      judge_brevity: s.judgeScores?.brevity.score ?? null,
      judge_function_alignment: s.judgeScores?.functionAlignment.score ?? null,
      judge_reasoning: s.judgeScores
        ? {
            appropriateness: s.judgeScores.appropriateness.reasoning,
            helpfulness: s.judgeScores.helpfulness.reasoning,
            toneMatch: s.judgeScores.toneMatch.reasoning,
            brevity: s.judgeScores.brevity.reasoning,
            functionAlignment: s.judgeScores.functionAlignment.reasoning,
          }
        : null,
      judge_model: s.judgeScores?.judgeModel ?? null,
      judge_latency_ms: s.judgeScores?.judgeLatencyMs ?? null,
    }));

    const { error } = await supabase
      .schema('ai_eval')
      .from('eval_samples')
      .insert(rows);

    if (error) {
      console.error(`Failed to insert batch ${i / BATCH_SIZE + 1}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  return inserted;
}

// ─── Update run aggregates ──────────────────────────────────────────────────

export async function updateRunAggregates(runId: string): Promise<void> {
  const supabase = getSupabase();

  // Fetch all samples for this run
  const { data: samples, error } = await supabase
    .schema('ai_eval')
    .from('eval_samples')
    .select('judge_overall, judge_appropriateness, judge_helpfulness, judge_tone_match, judge_brevity, judge_function_alignment, intent, suggestion_latency_ms, judge_latency_ms, actual_staff_response')
    .eq('run_id', runId);

  if (error || !samples) {
    console.error(`Failed to fetch samples for aggregation: ${error?.message}`);
    return;
  }

  const totalSamples = samples.length;
  const judged = samples.filter((s) => s.judge_overall != null);
  const judgedSamples = judged.length;
  const skippedNoStaff = samples.filter((s) => !s.actual_staff_response).length;

  // Compute averages
  const avg = (arr: number[]) => arr.length > 0
    ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100
    : null;

  const avgOverall = avg(judged.map((s) => s.judge_overall));
  const avgApprop = avg(judged.map((s) => s.judge_appropriateness).filter(Boolean) as number[]);
  const avgHelp = avg(judged.map((s) => s.judge_helpfulness).filter(Boolean) as number[]);
  const avgTone = avg(judged.map((s) => s.judge_tone_match).filter(Boolean) as number[]);
  const avgBrev = avg(judged.map((s) => s.judge_brevity).filter(Boolean) as number[]);
  const avgFuncAlign = avg(judged.map((s) => s.judge_function_alignment).filter(Boolean) as number[]);

  // Score distribution
  const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  judged.forEach((s) => {
    const bucket = String(Math.max(1, Math.min(5, Math.round(s.judge_overall))));
    distribution[bucket] = (distribution[bucket] || 0) + 1;
  });

  // By intent
  const intentMap = new Map<string, number[]>();
  judged.forEach((s) => {
    const intent = s.intent || 'unknown';
    const existing = intentMap.get(intent);
    if (existing) {
      existing.push(s.judge_overall);
    } else {
      intentMap.set(intent, [s.judge_overall]);
    }
  });

  const byIntent: Array<{ intent: string; count: number; overallMean: number }> = [];
  intentMap.forEach((scores, intent) => {
    const mean = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    byIntent.push({ intent, count: scores.length, overallMean: mean });
  });
  byIntent.sort((a, b) => b.count - a.count);

  // Latency averages
  const suggestionLatencies = samples.map((s) => s.suggestion_latency_ms).filter(Boolean) as number[];
  const judgeLatencies = judged.map((s) => s.judge_latency_ms).filter(Boolean) as number[];

  const { error: updateError } = await supabase
    .schema('ai_eval')
    .from('eval_runs')
    .update({
      total_samples: totalSamples,
      judged_samples: judgedSamples,
      skipped_no_staff: skippedNoStaff,
      avg_overall: avgOverall,
      avg_appropriateness: avgApprop,
      avg_helpfulness: avgHelp,
      avg_tone_match: avgTone,
      avg_brevity: avgBrev,
      avg_function_alignment: avgFuncAlign,
      score_distribution: distribution,
      by_intent: byIntent,
      avg_suggestion_latency_ms: suggestionLatencies.length > 0
        ? Math.round(suggestionLatencies.reduce((a, b) => a + b, 0) / suggestionLatencies.length)
        : null,
      avg_judge_latency_ms: judgeLatencies.length > 0
        ? Math.round(judgeLatencies.reduce((a, b) => a + b, 0) / judgeLatencies.length)
        : null,
    })
    .eq('id', runId);

  if (updateError) {
    console.error(`Failed to update run aggregates: ${updateError.message}`);
  }
}

// ─── Finalize run ───────────────────────────────────────────────────────────

export async function finalizeRun(
  runId: string,
  status: 'completed' | 'failed' | 'partial',
  errorMessage?: string,
): Promise<void> {
  const supabase = getSupabase();

  const update: Record<string, unknown> = {
    completed_at: new Date().toISOString(),
    status,
  };
  if (errorMessage) {
    update.error_message = errorMessage;
  }

  const { error } = await supabase
    .schema('ai_eval')
    .from('eval_runs')
    .update(update)
    .eq('id', runId);

  if (error) {
    console.error(`Failed to finalize run: ${error.message}`);
  }
}

// ─── Convert SampleResult to SampleForInsert ────────────────────────────────

export function toSampleForInsert(result: JudgeableSample & {
  responseTimeMs?: number;
  testPoint: {
    customerMsgNum: number;
    customerMessage: string;
    history: Array<{ content: string; senderType: string; createdAt: string }>;
    actualStaffResponse: string | null;
  };
  intentSource?: string;
  hasCustomerContext?: boolean;
  needsManagement?: boolean;
}): SampleForInsert {
  return {
    conversationId: result.conversationId,
    customerName: result.customerName,
    channelType: result.channelType,
    customerMessage: result.testPoint.customerMessage,
    conversationHistory: result.testPoint.history,
    actualStaffResponse: result.testPoint.actualStaffResponse,
    aiResponse: result.aiResponse,
    aiResponseThai: result.aiResponseThai,
    intent: result.intent,
    intentSource: result.intentSource || 'unknown',
    confidenceScore: result.confidenceScore,
    functionCalled: result.functionCalled,
    hasCustomerContext: result.hasCustomerContext ?? false,
    needsManagement: result.needsManagement ?? false,
    suggestionLatencyMs: result.responseTimeMs || 0,
    judgeScores: result.judgeScores || null,
  };
}
