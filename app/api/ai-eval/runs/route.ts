import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// Columns to select (exclude large conversation_ids JSONB)
const RUN_COLUMNS = 'id, started_at, completed_at, status, trigger_type, prompt_version, prompt_hash, git_commit_hash, prompt_label, suggestion_model, judge_model, sample_count_requested, total_samples, judged_samples, skipped_no_staff, avg_overall, avg_appropriateness, avg_helpfulness, avg_tone_match, avg_brevity, score_distribution, by_intent, avg_suggestion_latency_ms, avg_judge_latency_ms, batch_current, batch_total, error_count, error_message';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
  const limit = Number.isNaN(rawLimit) ? 20 : Math.min(Math.max(1, rawLimit), 100);
  const rawOffset = parseInt(searchParams.get('offset') || '0', 10);
  const offset = Number.isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;
  const promptVersion = searchParams.get('prompt_version');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let query = refacSupabaseAdmin
    .schema('ai_eval')
    .from('eval_runs')
    .select(RUN_COLUMNS, { count: 'exact' })
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (promptVersion) {
    query = query.eq('prompt_version', promptVersion);
  }
  if (from) {
    query = query.gte('started_at', from);
  }
  if (to) {
    query = query.lte('started_at', to);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, limit, offset });
}
