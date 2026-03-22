import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const sampleCount = Math.min(Math.max(1, Number(body.sample_count) || 50), 200);
    const batchSize = Math.min(Math.max(1, Number(body.batch_size) || 10), 25);
    const dateFilter = typeof body.date_filter === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date_filter)
      ? body.date_filter
      : undefined;
    const label = typeof body.label === 'string' ? body.label.slice(0, 100) : undefined;

    // Auto-generate version from Vercel git info or date
    const gitHash = process.env.VERCEL_GIT_COMMIT_SHA || undefined;
    const version = (() => {
      const d = new Date();
      const dateStr = `v${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      return gitHash ? `${dateStr}-${gitHash.substring(0, 7)}` : dateStr;
    })();

    const response = await fetch(`${supabaseUrl}/functions/v1/ai-eval-run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        action: 'start',
        sample_count: sampleCount,
        batch_size: batchSize,
        ...(dateFilter && { date_filter: dateFilter }),
        ...(label && { label }),
        version,
        ...(gitHash && { git_hash: gitHash }),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Edge Function invocation failed', details: result },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
