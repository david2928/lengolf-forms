import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabaseAdmin } from '@/lib/refac-supabase';
import { Platform } from '@/types/competitor-tracking';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const competitorId = parseInt(params.id);
    if (isNaN(competitorId)) {
      return NextResponse.json({ error: "Invalid competitor ID" }, { status: 400 });
    }

    const body = await request.json();
    const { metrics } = body;

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json({ 
        error: "No metrics provided" 
      }, { status: 400 });
    }

    // Verify competitor exists
    const { data: competitor, error: competitorError } = await supabaseAdmin
      .schema('marketing')
      .from('competitors')
      .select('id, name')
      .eq('id', competitorId)
      .single();

    if (competitorError || !competitor) {
      return NextResponse.json({ 
        error: "Competitor not found" 
      }, { status: 404 });
    }

    // Process each platform's metrics
    const results = [];
    const errors = [];

    for (const platformMetrics of metrics) {
      const { platform, metrics: platformData } = platformMetrics;

      try {
        // Prepare metrics data
        const metricsToInsert = {
          competitor_id: competitorId,
          platform: platform as Platform,
          recorded_at: new Date().toISOString(),
          ...platformData,
          raw_data: {
            source: 'manual_submission',
            submitted_by: session.user.email,
            submitted_at: new Date().toISOString()
          }
        };

        // Insert metrics
        const { data: insertedMetrics, error: insertError } = await supabaseAdmin
          .schema('marketing')
          .from('competitor_metrics')
          .insert(metricsToInsert)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        // Update social account last scraped timestamp
        await supabaseAdmin
          .schema('marketing')
          .from('competitor_social_accounts')
          .update({
            last_scraped_at: new Date().toISOString(),
            scrape_status: 'success',
            error_message: null
          })
          .eq('competitor_id', competitorId)
          .eq('platform', platform);

        results.push({
          platform,
          success: true,
          metrics: insertedMetrics
        });

      } catch (error: any) {
        console.error(`Failed to insert metrics for ${platform}:`, error);
        errors.push({
          platform,
          error: error.message
        });
      }
    }

    // Log the manual submission
    await supabaseAdmin
      .from('competitor_sync_logs')
      .insert({
        sync_type: 'manual',
        triggered_by: session.user.email,
        status: errors.length > 0 ? 'partial' : 'success',
        total_competitors: 1,
        successful_syncs: results.length,
        failed_syncs: errors.length,
        response_data: { results, errors },
        completed_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: `Manually submitted metrics for ${results.length} platform(s)`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Manual metrics submission error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to submit metrics',
      message: error.message
    }, { status: 500 });
  }
}