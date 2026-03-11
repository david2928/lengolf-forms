// Status endpoint for chat opportunity batch processing
// GET: Returns the last batch run info for UI display (no auth required for read-only status)

import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export interface BatchRunStatus {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  trigger_type: 'cron' | 'manual';
  scanned: number;
  analyzed: number;
  created: number;
  skipped: number;
  errors: number;
  processing_time_ms: number | null;
  error_message: string | null;
}

export async function GET(request: NextRequest) {
  try {
    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available',
      }, { status: 500 });
    }

    // Get the most recent batch run
    const { data: lastRun, error } = await refacSupabaseAdmin
      .from('chat_opportunity_batch_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      // 42P01 = relation does not exist — table hasn't been created yet
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          lastRun: null,
          summary: { last7DaysCreated: 0, last7DaysRuns: 0 },
        });
      }
      throw error;
    }

    // Get summary of last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentRuns, error: recentError } = await refacSupabaseAdmin
      .from('chat_opportunity_batch_runs')
      .select('created, started_at')
      .gte('started_at', sevenDaysAgo.toISOString())
      .eq('status', 'completed');

    if (recentError) {
      console.error('[BatchStatus] Error fetching recent runs:', recentError);
    }

    // Calculate totals for last 7 days
    const last7DaysCreated = recentRuns?.reduce((sum: number, run: { created: number | null }) => sum + (run.created || 0), 0) || 0;
    const last7DaysRuns = recentRuns?.length || 0;

    return NextResponse.json({
      success: true,
      lastRun: lastRun || null,
      summary: {
        last7DaysCreated,
        last7DaysRuns,
      },
    });
  } catch (error) {
    console.error('[BatchStatus] Error fetching status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
