import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Helper function to replace variables in text
 */
function replaceVariables(text: string, variables: Record<string, any>): string {
  let result = text;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(variables[key] || ''));
  });
  return result;
}

/**
 * Helper function to replace variables in flex message JSON
 */
function replaceFlexVariables(flexJson: any, variables: Record<string, any>): any {
  const jsonString = JSON.stringify(flexJson);
  const replacedString = replaceVariables(jsonString, variables);
  return JSON.parse(replacedString);
}

/**
 * Helper function to send LINE push message with retry
 */
async function sendLineMessage(
  lineUserId: string,
  message: any,
  retries = 3
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelAccessToken) {
    return { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' };
  }

  for (let attempt = 0; attempt < retries; attempt++) {
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
        const result = await response.json();
        return {
          success: true,
          messageId: result.sentMessages?.[0]?.id
        };
      }

      const errorText = await response.text();

      // Don't retry on 404 (user not found) or 403 (blocked)
      if (response.status === 404 || response.status === 403) {
        return {
          success: false,
          error: response.status === 404 ? 'User not found' : 'User blocked bot'
        };
      }

      // Retry on other errors
      if (attempt === retries - 1) {
        return {
          success: false,
          error: `LINE API error: ${response.status} - ${errorText}`
        };
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));

    } catch (error) {
      if (attempt === retries - 1) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Network error'
        };
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Send broadcast campaign to audience
 * POST /api/line/campaigns/[id]/send
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is staff or admin
    const { data: user, error: userError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('is_admin, is_staff')
      .eq('email', session.user.email)
      .single();

    if (userError || (!user?.is_admin && !user?.is_staff)) {
      return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    }

    const { id: campaignId } = await params;

    // Get campaign details
    const { data: campaign, error: campaignError } = await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .select('*, line_audiences(*)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({
        success: false,
        error: 'Campaign not found'
      }, { status: 404 });
    }

    if (campaign.status === 'sending') {
      return NextResponse.json({
        success: false,
        error: 'Campaign is already being sent'
      }, { status: 400 });
    }

    // Update campaign status to sending
    await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .update({ status: 'sending', sent_at: new Date().toISOString() })
      .eq('id', campaignId);

    // Get active audience members (not opted out)
    const { data: members, error: membersError } = await refacSupabaseAdmin
      .rpc('get_active_audience_members', { p_audience_id: campaign.audience_id });

    if (membersError) {
      console.error('Error fetching audience members:', membersError);
      throw membersError;
    }

    if (!members || members.length === 0) {
      await refacSupabaseAdmin
        .from('line_broadcast_campaigns')
        .update({
          status: 'completed',
          total_recipients: 0,
          success_count: 0,
          error_count: 0
        })
        .eq('id', campaignId);

      return NextResponse.json({
        success: true,
        message: 'No active members to send to',
        total_recipients: 0
      });
    }

    // Update total recipients
    await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .update({ total_recipients: members.length })
      .eq('id', campaignId);

    // Start sending in background (async)
    sendBroadcastMessages(campaignId, campaign, members).catch(error => {
      console.error('Error in background broadcast sending:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Broadcast started',
      total_recipients: members.length,
      campaign_id: campaignId
    });

  } catch (error) {
    console.error('Failed to send campaign:', error);

    // Update campaign status to failed
    try {
      const { id: campaignId } = await params;
      await refacSupabaseAdmin
        .from('line_broadcast_campaigns')
        .update({ status: 'failed' })
        .eq('id', campaignId);
    } catch (updateError) {
      console.error('Failed to update campaign status:', updateError);
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Helper function to get coaching availability structured by coach
 */
async function getCoachingAvailability() {
  try {
    const today = new Date();
    const fourteenDaysLater = new Date(today);
    fourteenDaysLater.setDate(today.getDate() + 14);

    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/coaching-assist/slots?fromDate=${today.toISOString().split('T')[0]}&toDate=${fourteenDaysLater.toISOString().split('T')[0]}`
    );

    if (!response.ok) {
      console.error('Failed to fetch coaching slots');
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
 * Helper function to format availability into minimal, clean Flex message
 * Structured by: Coach → Date → Time slots (as subtle bordered boxes)
 */
function formatAvailabilityForFlex(coaches: any[]): any[] {
  if (!coaches || coaches.length === 0) {
    return [{
      type: 'text',
      text: 'No available slots',
      color: '#999999',
      size: 'sm',
      align: 'center',
      margin: 'md'
    }];
  }

  const components: any[] = [];

  coaches.forEach((coach: any, coachIndex: number) => {
    if (!coach.dates || coach.dates.length === 0) return;

    // Add spacing between coaches
    if (coachIndex > 0) {
      components.push({
        type: 'separator',
        margin: 'lg'
      });
    }

    // Coach name header - simple and clean
    components.push({
      type: 'text',
      text: `Pro ${coach.coach_name}`,
      weight: 'bold',
      size: 'md',
      color: '#000000',
      margin: 'lg'
    });

    // Process each date for this coach
    coach.dates.forEach((dateInfo: any, dateIndex: number) => {
      // Date subheader - clean text only
      components.push({
        type: 'text',
        text: dateInfo.date_display,
        size: 'sm',
        color: '#999999',
        margin: 'md'
      });

      // Time slot buttons in boxes (3 per row for compact display)
      const slotsToShow = dateInfo.slots;
      const buttonRows: any[] = [];

      for (let i = 0; i < slotsToShow.length; i += 3) {
        const rowSlots = slotsToShow.slice(i, i + 3);
        const rowButtons = rowSlots.map((time: string) => ({
          type: 'button',
          action: {
            type: 'postback',
            label: time,
            data: `action=book_slot&date=${dateInfo.date}&time=${time}&coach_id=${coach.coach_id}&coach_name=${encodeURIComponent(coach.coach_name)}`,
            displayText: `Book ${dateInfo.date_display} at ${time} with ${coach.coach_name}`
          },
          style: 'secondary',
          height: 'sm'
        }));

        // Fill remaining slots with spacers for alignment
        while (rowButtons.length < 3) {
          rowButtons.push({
            type: 'filler'
          });
        }

        buttonRows.push({
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: rowButtons,
          margin: 'sm'
        });
      }

      components.push({
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: buttonRows
      });
    });
  });

  return components;
}

/**
 * Background function to send messages with rate limiting
 */
async function sendBroadcastMessages(
  campaignId: string,
  campaign: any,
  members: any[]
) {
  let successCount = 0;
  let errorCount = 0;
  let optOutCount = 0;

  console.log(`Starting broadcast ${campaignId} to ${members.length} recipients`);

  // Fetch coaching availability once for all messages
  const availability = await getCoachingAvailability();

  // Send messages in batches with rate limiting (500/min = ~100ms delay)
  for (let i = 0; i < members.length; i++) {
    const member = members[i];

    try {
      // Prepare message with variable replacement
      let message: any;

      if (campaign.message_type === 'flex') {
        // Build the entire Flex message in code (not from database template)
        const scheduleContents = formatAvailabilityForFlex(availability || []);

        const flexMessage = {
          type: 'bubble',
          hero: {
            type: 'box',
            layout: 'vertical',
            contents: [{
              type: 'text',
              text: 'Coaching Availability',
              weight: 'bold',
              size: 'xl',
              color: '#FFFFFF'
            }],
            backgroundColor: '#17C964',
            paddingAll: '20px'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'Available Next 14 Days',
                size: 'sm',
                color: '#999999',
                margin: 'none'
              },
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'lg',
                spacing: 'sm',
                contents: scheduleContents
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'separator',
                margin: 'md'
              },
              {
                type: 'button',
                style: 'link',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: 'Unsubscribe',
                  data: `action=opt_out&campaign_id=${campaignId}&audience_id=${campaign.audience_id}`
                },
                color: '#999999'
              }
            ],
            spacing: 'sm',
            paddingAll: '8px'
          }
        };

        message = {
          type: 'flex',
          altText: 'Coaching Availability',
          contents: flexMessage
        };
      } else {
        // Text message (would need template support)
        message = {
          type: 'text',
          text: 'Hello from Len Golf!'
        };
      }

      // Send message
      const result = await sendLineMessage(member.line_user_id, message);

      // Log result
      const logStatus = result.success ? 'success' :
                       (result.error?.includes('blocked') ? 'blocked' : 'failed');

      await refacSupabaseAdmin
        .from('line_broadcast_logs')
        .insert({
          campaign_id: campaignId,
          line_user_id: member.line_user_id,
          customer_id: member.customer_id,
          status: logStatus,
          error_message: result.error,
          line_message_id: result.messageId
        });

      if (result.success) {
        successCount++;
      } else {
        if (logStatus === 'blocked') {
          // Optionally mark user as inactive or handle blocked users
        }
        errorCount++;
      }

      // Rate limiting: 500 messages per minute = 120ms per message
      // Using 150ms to be safe
      if (i < members.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Update progress every 10 messages
      if ((i + 1) % 10 === 0 || i === members.length - 1) {
        await refacSupabaseAdmin
          .from('line_broadcast_campaigns')
          .update({
            success_count: successCount,
            error_count: errorCount
          })
          .eq('id', campaignId);

        console.log(`Broadcast ${campaignId} progress: ${i + 1}/${members.length} (${successCount} success, ${errorCount} errors)`);
      }

    } catch (error) {
      console.error(`Error sending to ${member.line_user_id}:`, error);
      errorCount++;
    }
  }

  // Mark campaign as completed or failed
  const finalStatus = successCount === 0 && errorCount > 0 ? 'failed' : 'completed';

  await refacSupabaseAdmin
    .from('line_broadcast_campaigns')
    .update({
      status: finalStatus,
      success_count: successCount,
      error_count: errorCount,
      opt_out_count: optOutCount
    })
    .eq('id', campaignId);

  console.log(`Broadcast ${campaignId} ${finalStatus}: ${successCount} success, ${errorCount} errors`);
}
