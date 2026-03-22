import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

const TH_TEMPLATE_ID = '6c06cdad-a6de-4c88-90d4-603e2a937f29';
const EN_TEMPLATE_ID = '176b9d9b-fe77-4792-bce9-32b66e351466';

/**
 * Welcome Back Re-engagement Campaign — Automated Monthly Send
 *
 * GET /api/cron/welcome-back
 *
 * Identifies lapsed customers (90+ days inactive, no active packages,
 * not sent Welcome Back in last 90 days), creates audiences + campaigns,
 * and sends personalized flex messages (Thai/English).
 *
 * Triggered on the 15th of each month via external scheduler.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const isDryRun = searchParams.get('dryRun') === 'true';
    const isDevBypass = process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true';

    if (!isDevBypass) {
      if (!CRON_SECRET) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
      }
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const monthLabel = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    console.log(`[welcome-back] Starting ${isDryRun ? 'DRY RUN' : 'campaign'} for ${monthLabel}`);

    // Check if campaign already sent this month
    const { data: existingCampaigns } = await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .select('id, name, status')
      .like('name', `Welcome Back%${monthLabel}%`)
      .in('status', ['sending', 'completed']);

    if (existingCampaigns && existingCampaigns.length > 0) {
      return NextResponse.json({
        status: 'skipped',
        reason: `Campaign already exists for ${monthLabel}`,
        existing: existingCampaigns.map((c: { id: string; name: string; status: string }) => ({ id: c.id, name: c.name, status: c.status }))
      });
    }

    // Fetch flex templates
    const { data: templates, error: templateError } = await refacSupabaseAdmin
      .from('line_flex_templates')
      .select('id, name, flex_json')
      .in('id', [TH_TEMPLATE_ID, EN_TEMPLATE_ID]);

    if (templateError || !templates || templates.length !== 2) {
      return NextResponse.json({
        error: 'Flex templates not found',
        details: templateError?.message
      }, { status: 500 });
    }

    const thTemplate = templates.find((t: { id: string }) => t.id === TH_TEMPLATE_ID);
    const enTemplate = templates.find((t: { id: string }) => t.id === EN_TEMPLATE_ID);

    // Identify lapsed customers — Thai
    const { data: thaiCustomers, error: thError } = await refacSupabaseAdmin.rpc('get_lapsed_customers_for_reengagement', {
      p_language: 'thai'
    });

    // Identify lapsed customers — English
    const { data: englishCustomers, error: enError } = await refacSupabaseAdmin.rpc('get_lapsed_customers_for_reengagement', {
      p_language: 'english'
    });

    if (thError || enError) {
      return NextResponse.json({
        error: 'Failed to fetch lapsed customers',
        details: { thai: thError?.message, english: enError?.message }
      }, { status: 500 });
    }

    const thaiCount = thaiCustomers?.length || 0;
    const englishCount = englishCustomers?.length || 0;
    const totalCount = thaiCount + englishCount;

    console.log(`[welcome-back] Found ${totalCount} lapsed customers (${thaiCount} Thai, ${englishCount} English)`);

    if (totalCount === 0) {
      return NextResponse.json({
        status: 'completed',
        message: 'No lapsed customers to contact',
        thai: 0,
        english: 0
      });
    }

    // Dry run — return the list without sending
    if (isDryRun) {
      return NextResponse.json({
        status: 'dry_run',
        month: monthLabel,
        thai: { count: thaiCount, customers: thaiCustomers },
        english: { count: englishCount, customers: englishCustomers },
        total: totalCount
      });
    }

    // Create Thai audience + populate
    let thCampaignResult = null;
    if (thaiCount > 0) {
      const { data: thAudience } = await refacSupabaseAdmin
        .from('line_audiences')
        .insert({
          name: `Welcome Back — Thai (${monthLabel})`,
          description: `Lapsed customers (90+ days inactive) — Thai — ${monthLabel}`,
          type: 'manual',
          is_active: true,
          allow_opt_out: true,
          created_by: 'cron:welcome-back'
        })
        .select('id')
        .single();

      if (thAudience) {
        // Add members
        const thMembers = thaiCustomers!.map((c: any) => ({
          audience_id: thAudience.id,
          line_user_id: c.line_user_id,
          customer_id: c.customer_id
        }));

        await refacSupabaseAdmin
          .from('line_audience_members')
          .insert(thMembers);

        // Create campaign
        const { data: thCampaign } = await refacSupabaseAdmin
          .from('line_broadcast_campaigns')
          .insert({
            name: `Welcome Back — Thai (${monthLabel})`,
            audience_id: thAudience.id,
            message_template_id: TH_TEMPLATE_ID,
            message_type: 'flex',
            flex_message: thTemplate!.flex_json,
            schedule_type: 'immediate',
            status: 'draft',
            created_by: 'cron:welcome-back'
          })
          .select('id')
          .single();

        if (thCampaign) {
          // Trigger send via internal API
          const sendRes = await fetch(`${BASE_URL}/api/line/campaigns/${thCampaign.id}/send`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
          });
          thCampaignResult = await sendRes.json();
          console.log(`[welcome-back] Thai campaign sent: ${thCampaignResult.total_recipients} recipients`);
        }
      }
    }

    // Create English audience + populate
    let enCampaignResult = null;
    if (englishCount > 0) {
      const { data: enAudience } = await refacSupabaseAdmin
        .from('line_audiences')
        .insert({
          name: `Welcome Back — English (${monthLabel})`,
          description: `Lapsed customers (90+ days inactive) — English — ${monthLabel}`,
          type: 'manual',
          is_active: true,
          allow_opt_out: true,
          created_by: 'cron:welcome-back'
        })
        .select('id')
        .single();

      if (enAudience) {
        const enMembers = englishCustomers!.map((c: any) => ({
          audience_id: enAudience.id,
          line_user_id: c.line_user_id,
          customer_id: c.customer_id
        }));

        await refacSupabaseAdmin
          .from('line_audience_members')
          .insert(enMembers);

        const { data: enCampaign } = await refacSupabaseAdmin
          .from('line_broadcast_campaigns')
          .insert({
            name: `Welcome Back — English (${monthLabel})`,
            audience_id: enAudience.id,
            message_template_id: EN_TEMPLATE_ID,
            message_type: 'flex',
            flex_message: enTemplate!.flex_json,
            schedule_type: 'immediate',
            status: 'draft',
            created_by: 'cron:welcome-back'
          })
          .select('id')
          .single();

        if (enCampaign) {
          const sendRes = await fetch(`${BASE_URL}/api/line/campaigns/${enCampaign.id}/send`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
          });
          enCampaignResult = await sendRes.json();
          console.log(`[welcome-back] English campaign sent: ${enCampaignResult.total_recipients} recipients`);
        }
      }
    }

    return NextResponse.json({
      status: 'sent',
      month: monthLabel,
      thai: {
        count: thaiCount,
        campaign: thCampaignResult
      },
      english: {
        count: englishCount,
        campaign: enCampaignResult
      },
      total: totalCount
    });

  } catch (error) {
    console.error('[welcome-back] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
