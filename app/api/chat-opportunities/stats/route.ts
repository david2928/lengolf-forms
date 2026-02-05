// API endpoint for opportunity statistics
// GET: Returns dashboard statistics for the opportunities feature

import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { OpportunityStats } from '@/types/chat-opportunities';

export async function GET(request: NextRequest) {
  try {
    if (!refacSupabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available',
      }, { status: 500 });
    }

    // Use the database function to get stats
    const { data, error } = await refacSupabaseAdmin.rpc('get_chat_opportunity_stats');

    if (error) {
      console.error('Error fetching opportunity stats:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    // The function returns a single row
    const statsRow = Array.isArray(data) ? data[0] : data;

    if (!statsRow) {
      // Return empty stats if no data
      return NextResponse.json({
        success: true,
        stats: {
          total_pending: 0,
          total_contacted: 0,
          total_converted: 0,
          total_lost: 0,
          total_dismissed: 0,
          conversion_rate: 0,
          avg_days_to_contact: 0,
          by_type: {},
          by_priority: {},
          by_channel: {},
        } as OpportunityStats,
      });
    }

    const stats: OpportunityStats = {
      total_pending: statsRow.total_pending || 0,
      total_contacted: statsRow.total_contacted || 0,
      total_converted: statsRow.total_converted || 0,
      total_lost: statsRow.total_lost || 0,
      total_dismissed: statsRow.total_dismissed || 0,
      conversion_rate: parseFloat(statsRow.conversion_rate) || 0,
      avg_days_to_contact: parseFloat(statsRow.avg_days_to_contact) || 0,
      by_type: statsRow.by_type || {},
      by_priority: statsRow.by_priority || {},
      by_channel: statsRow.by_channel || {},
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error in GET /api/chat-opportunities/stats:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
