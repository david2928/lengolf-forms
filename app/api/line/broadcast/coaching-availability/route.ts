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
 * This endpoint is called by pg_cron every Monday at 2am
 * Requires X-Cron-Secret header for security
 *
 * Features:
 * - Duplicate prevention: Won't resend if already completed today
 * - Partial success tracking: Resumes from where it left off if interrupted
 * - Sequential sending: Avoids race conditions and ensures proper logging
 */
export async function POST(request: NextRequest) {
  // Verify cron secret for security
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // DUPLICATE PREVENTION: Check if we already successfully sent today
    const { data: existingCampaigns, error: campaignCheckError } = await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .select('id, status, name, created_at')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (campaignCheckError) {
      console.error('Error checking existing campaigns:', campaignCheckError);
    }

    if (existingCampaigns && existingCampaigns.length > 0) {
      const completedCampaign = existingCampaigns[0];
      console.log(`Duplicate prevented: Campaign ${completedCampaign.id} already completed today`);
      return NextResponse.json({
        success: true,
        message: 'Broadcast already sent today',
        campaign_id: completedCampaign.id,
        skipped: true
      });
    }

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

    // PARTIAL SUCCESS TRACKING: Check for incomplete campaign from today
    const { data: incompleteCampaigns } = await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .select('id, name')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`)
      .eq('status', 'sending')
      .order('created_at', { ascending: false })
      .limit(1);

    let campaign;
    let alreadySentUserIds: Set<string> = new Set();

    if (incompleteCampaigns && incompleteCampaigns.length > 0) {
      // Resume incomplete campaign
      campaign = incompleteCampaigns[0];
      console.log(`Resuming incomplete campaign ${campaign.id}`);

      // Get list of users who already received the message
      const { data: existingLogs } = await refacSupabaseAdmin
        .from('line_broadcast_logs')
        .select('line_user_id, status')
        .eq('campaign_id', campaign.id)
        .eq('status', 'sent');

      if (existingLogs) {
        alreadySentUserIds = new Set(existingLogs.map((log: { line_user_id: string }) => log.line_user_id));
        console.log(`Found ${alreadySentUserIds.size} users who already received the message`);
      }
    } else {
      // Create new campaign record
      const { data: newCampaign, error: campaignError } = await refacSupabaseAdmin
        .from('line_broadcast_campaigns')
        .insert({
          name: `Coaching Availability - ${today}`,
          audience_id: audience.id,
          message_type: 'flex',
          scheduled_at: new Date().toISOString(),
          status: 'sending'
        })
        .select()
        .single();

      if (campaignError || !newCampaign) {
        return NextResponse.json({
          success: false,
          error: 'Failed to create campaign record',
          details: campaignError?.message
        }, { status: 500 });
      }

      campaign = newCampaign;
      console.log(`Created new campaign ${campaign.id}`);
    }

    // Filter out users who already received the message
    const membersToSend = members.filter((m: { line_user_id: string }) => !alreadySentUserIds.has(m.line_user_id));

    if (membersToSend.length === 0) {
      // All members already received the message
      await refacSupabaseAdmin
        .from('line_broadcast_campaigns')
        .update({
          status: 'completed',
          sent_at: new Date().toISOString()
        })
        .eq('id', campaign.id);

      return NextResponse.json({
        success: true,
        message: 'All members already received the message',
        campaign_id: campaign.id,
        results: {
          total: members.length,
          sent: members.length,
          failed: 0,
          errors: []
        }
      });
    }

    console.log(`Sending to ${membersToSend.length} members (${alreadySentUserIds.size} already sent)`);

    // Create flex message with unsubscribe option
    const flexMessage = createCoachingAvailabilityMessage(coaches, {
      includeUnsubscribe: true,
      campaignId: campaign.id,
      audienceId: audience.id
    });

    // Send to all members SEQUENTIALLY with proper logging
    let successCount = alreadySentUserIds.size; // Include already sent
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < membersToSend.length; i++) {
      const member = membersToSend[i];

      try {
        // Send message
        const result = await sendLineMessage(member.line_user_id, flexMessage);

        // Log result to database with error handling
        const logInsert = await refacSupabaseAdmin
          .from('line_broadcast_logs')
          .insert({
            campaign_id: campaign.id,
            line_user_id: member.line_user_id,
            status: result.success ? 'sent' : 'failed',
            error_message: result.error,
            sent_at: new Date().toISOString()
          });

        if (logInsert.error) {
          console.error(`Failed to insert log for ${member.line_user_id}:`, logInsert.error);
        }

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
          errors.push(`${member.line_user_id}: ${result.error}`);
        }

        // Rate limiting: 500 messages per minute = 120ms per message minimum
        if (i < membersToSend.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }

      } catch (error) {
        console.error(`Error processing ${member.line_user_id}:`, error);
        failedCount++;
        errors.push(`${member.line_user_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Update campaign status to completed
    await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .update({
        status: 'completed',
        sent_at: new Date().toISOString()
      })
      .eq('id', campaign.id);

    console.log(`Campaign ${campaign.id} completed: ${successCount} sent, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
      audience_id: audience.id,
      results: {
        total: members.length,
        sent: successCount,
        failed: failedCount,
        errors: errors.slice(0, 5) // Only return first 5 errors
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
