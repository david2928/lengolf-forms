import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Test creating a sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .schema('marketing')
      .from('google_ads_sync_log')
      .insert({
        sync_type: 'test',
        sync_status: 'in_progress',
        start_date: '2025-01-01',
        end_date: '2025-01-31'
      })
      .select()
      .single();

    if (syncLogError || !syncLog) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create sync log',
        details: syncLogError?.message
      });
    }

    // Test creating sample campaign data
    const { data: campaign, error: campaignError } = await supabase
      .schema('marketing')
      .from('google_ads_campaigns')
      .insert({
        campaign_id: 12345,
        campaign_name: 'Test Campaign',
        campaign_status: 'ENABLED',
        campaign_type: 'SEARCH',
        budget_amount_micros: 100000000 // $100 in micros
      })
      .select()
      .single();

    if (campaignError) {
      // Update sync log with error
      await supabase
        .schema('marketing')
        .from('google_ads_sync_log')
        .update({
          sync_status: 'error',
          error_message: campaignError.message
        })
        .eq('id', syncLog.id);

      return NextResponse.json({
        success: false,
        error: 'Failed to create test campaign',
        details: campaignError.message
      });
    }

    // Test creating sample performance data
    const { data: performance, error: performanceError } = await supabase
      .schema('marketing')
      .from('google_ads_campaign_performance')
      .insert({
        campaign_id: 12345,
        date: '2025-01-08',
        impressions: 1000,
        clicks: 50,
        cost_micros: 25000000, // $25 in micros
        conversions: 2.5,
        conversion_value_micros: 50000000 // $50 in micros
      })
      .select()
      .single();

    if (performanceError) {
      await supabase
        .schema('marketing')
        .from('google_ads_sync_log')
        .update({
          sync_status: 'error',
          error_message: performanceError.message
        })
        .eq('id', syncLog.id);

      return NextResponse.json({
        success: false,
        error: 'Failed to create test performance data',
        details: performanceError.message
      });
    }

    // Update sync log with success
    await supabase
      .schema('marketing')
      .from('google_ads_sync_log')
      .update({
        sync_status: 'success',
        records_synced: 2
      })
      .eq('id', syncLog.id);

    return NextResponse.json({
      success: true,
      message: 'Database test completed successfully',
      data: {
        syncLog,
        campaign,
        performance
      }
    });

  } catch (error) {
    console.error('Google Ads test error:', error);
    return NextResponse.json(
      { 
        error: "Database test failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}