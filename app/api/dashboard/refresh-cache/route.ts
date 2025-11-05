import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * API endpoint to manually refresh the customer first purchase dates materialized view
 * This should be called periodically (e.g., via a cron job) or after ETL runs
 *
 * Usage:
 * - GET /api/dashboard/refresh-cache - Refreshes the materialized view
 *
 * This optimizes the sales dashboard YTD queries by pre-calculating customer first purchase dates
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[Dashboard Cache] Starting materialized view refresh...');

    // Call the refresh function
    const { error } = await refacSupabaseAdmin.rpc('refresh_customer_first_purchase_dates');

    if (error) {
      const duration = Date.now() - startTime;
      console.error('[Dashboard Cache] Failed to refresh materialized view:', error);

      return NextResponse.json(
        {
          success: false,
          error: `Failed to refresh cache: ${error.message}`,
          code: 'REFRESH_ERROR',
          timestamp: new Date().toISOString(),
          duration_ms: duration
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Dashboard Cache] Materialized view refreshed successfully in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Customer first purchase dates cache refreshed successfully',
      timestamp: new Date().toISOString(),
      duration_ms: duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Dashboard Cache] Refresh error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        duration_ms: duration
      },
      { status: 500 }
    );
  }
}

// GET endpoint for easier testing
export async function GET(request: NextRequest) {
  return POST(request);
}
