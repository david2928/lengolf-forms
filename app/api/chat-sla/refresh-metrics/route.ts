import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { SLAAPIResponse } from '@/types/chat-sla';

interface RefreshMetricsResponse {
  message: string;
  refreshed_at: string;
}

/**
 * POST /api/chat-sla/refresh-metrics
 * Manually refresh the chat SLA metrics materialized view
 *
 * ADMIN ONLY - This endpoint requires admin access
 * Triggers REFRESH MATERIALIZED VIEW CONCURRENTLY on chat_sla_metrics
 */
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json<SLAAPIResponse<RefreshMetricsResponse>>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Check if user is admin (this operation is admin-only)
    const { data: user, error: userError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('is_admin')
      .eq('email', session.user.email)
      .single();

    if (userError || !user?.is_admin) {
      return NextResponse.json<SLAAPIResponse<RefreshMetricsResponse>>(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    console.log('🔄 Starting manual SLA metrics refresh...');
    const startTime = Date.now();

    // Call database function to refresh materialized view
    const { error } = await refacSupabaseAdmin.rpc('refresh_chat_sla_metrics');

    if (error) {
      console.error('❌ Error refreshing SLA metrics:', error);
      throw error;
    }

    const duration = Date.now() - startTime;
    const refreshedAt = new Date().toISOString();

    console.log(`✅ SLA metrics refreshed successfully in ${duration}ms`);

    return NextResponse.json<SLAAPIResponse<RefreshMetricsResponse>>({
      success: true,
      data: {
        message: `SLA metrics refreshed successfully in ${duration}ms`,
        refreshed_at: refreshedAt
      }
    });

  } catch (error) {
    console.error('Error in chat SLA refresh metrics API:', error);
    return NextResponse.json<SLAAPIResponse<RefreshMetricsResponse>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
