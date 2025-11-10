import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { createCoachingAvailabilityMessage } from '@/lib/line/flex-templates';

/**
 * Helper function to fetch coaching availability
 */
async function getCoachingAvailability() {
  try {
    const today = new Date();
    const fourteenDaysLater = new Date(today);
    fourteenDaysLater.setDate(today.getDate() + 14);

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/coaching-assist/slots?fromDate=${today.toISOString().split('T')[0]}&toDate=${fourteenDaysLater.toISOString().split('T')[0]}`,
      {
        headers: {
          'X-Internal-Secret': process.env.CRON_SECRET || ''
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch coaching slots:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.coaches || [];
  } catch (error) {
    console.error('Error fetching coaching availability:', error);
    return null;
  }
}

/**
 * Helper function to send LINE push message
 */
async function sendLineMessage(lineUserId: string, message: any): Promise<{ success: boolean; error?: string }> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelAccessToken) {
    return { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' };
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [message]
      })
    });

    if (response.ok) {
      return { success: true };
    }

    const errorText = await response.text();
    return {
      success: false,
      error: `LINE API error: ${response.status} - ${errorText}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Send coaching availability broadcast to all audience members
 * POST /api/line/broadcast/coaching-availability
 *
 * This endpoint is called by pg_cron every Monday at 9am
 * Requires X-Cron-Secret header for security
 */
export async function POST(request: NextRequest) {
  // Verify cron secret for security
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the coaching audience
    const { data: audience, error: audienceError } = await refacSupabaseAdmin
      .from('line_audiences')
      .select('id, name')
      .eq('name', 'Coaching Students - Weekly Updates')
      .single();

    if (audienceError || !audience) {
      return NextResponse.json({
        success: false,
        error: 'Coaching audience not found'
      }, { status: 404 });
    }

    // Refresh audience members (adds new coaching customers, preserves opt-outs)
    await refacSupabaseAdmin.rpc('refresh_coaching_audience_members');

    // Get active members (not opted out)
    const { data: members, error: membersError } = await refacSupabaseAdmin
      .from('line_audience_members')
      .select('line_user_id')
      .eq('audience_id', audience.id)
      .eq('opted_out', false);

    if (membersError || !members || members.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active audience members found',
        details: membersError?.message
      }, { status: 404 });
    }

    // Fetch coaching availability
    const coaches = await getCoachingAvailability();

    if (!coaches || coaches.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No coaching availability found for the next 14 days'
      }, { status: 404 });
    }

    // Create campaign record
    const { data: campaign, error: campaignError } = await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .insert({
        name: `Coaching Availability - ${new Date().toISOString().split('T')[0]}`,
        audience_id: audience.id,
        message_type: 'flex',
        scheduled_at: new Date().toISOString(),
        status: 'sending'
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create campaign record',
        details: campaignError?.message
      }, { status: 500 });
    }

    // Create flex message with unsubscribe option
    const flexMessage = createCoachingAvailabilityMessage(coaches, {
      includeUnsubscribe: true,
      campaignId: campaign.id,
      audienceId: audience.id
    });

    // Send to all members and track results
    const results = {
      total: members.length,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process sends in batches of 10 for better performance
    const BATCH_SIZE = 10;
    const batches = [];
    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      batches.push(members.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      // Process batch members in parallel
      const batchPromises = batch.map(async (member: { line_user_id: string }) => {
        const result = await sendLineMessage(member.line_user_id, flexMessage);

        if (result.success) {
          results.sent++;

          // Log successful send
          await refacSupabaseAdmin
            .from('line_broadcast_logs')
            .insert({
              campaign_id: campaign.id,
              line_user_id: member.line_user_id,
              status: 'sent',
              sent_at: new Date().toISOString()
            });
        } else {
          results.failed++;
          results.errors.push(`${member.line_user_id}: ${result.error}`);

          // Log failed send
          await refacSupabaseAdmin
            .from('line_broadcast_logs')
            .insert({
              campaign_id: campaign.id,
              line_user_id: member.line_user_id,
              status: 'failed',
              sent_at: new Date().toISOString(),
              error_message: result.error
            });
        }

        return result;
      });

      // Wait for all sends in this batch to complete
      await Promise.all(batchPromises);

      // Small delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Update campaign status
    await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .update({
        status: 'completed',
        sent_at: new Date().toISOString()
      })
      .eq('id', campaign.id);

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
      audience_id: audience.id,
      results: {
        total: results.total,
        sent: results.sent,
        failed: results.failed,
        errors: results.failed > 0 ? results.errors.slice(0, 5) : [] // Only return first 5 errors
      }
    });

  } catch (error: any) {
    console.error('Error sending coaching availability broadcast:', error);
    return NextResponse.json({
      error: 'Failed to send broadcast',
      details: error.message
    }, { status: 500 });
  }
}
