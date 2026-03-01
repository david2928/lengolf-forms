import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { runId } = await params;
  if (!UUID_RE.test(runId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
  const limit = Number.isNaN(rawLimit) ? 50 : Math.min(Math.max(1, rawLimit), 200);
  const rawOffset = parseInt(searchParams.get('offset') || '0', 10);
  const offset = Number.isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;
  const intent = searchParams.get('intent');
  const minScoreRaw = parseFloat(searchParams.get('min_score') || '');
  const maxScoreRaw = parseFloat(searchParams.get('max_score') || '');

  let query = refacSupabaseAdmin
    .schema('ai_eval')
    .from('eval_samples')
    .select('*', { count: 'exact' })
    .eq('run_id', runId)
    .order('judge_overall', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (intent) {
    query = query.eq('intent', intent);
  }
  if (!Number.isNaN(minScoreRaw)) {
    query = query.gte('judge_overall', minScoreRaw);
  }
  if (!Number.isNaN(maxScoreRaw)) {
    query = query.lte('judge_overall', maxScoreRaw);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch samples' }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, limit, offset });
}
