import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  const { data, error } = await refacSupabaseAdmin
    .schema('ai_eval')
    .from('eval_runs')
    .select('id, started_at, prompt_version, prompt_label, total_samples, judged_samples, avg_overall, avg_appropriateness, avg_helpfulness, avg_tone_match, avg_brevity, avg_function_alignment')
    .eq('status', 'completed')
    .not('avg_overall', 'is', null)
    .order('started_at', { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
