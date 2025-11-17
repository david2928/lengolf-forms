import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Coach {
  name: string;
  slots: Array<{
    date: string;
    time: string;
  }>;
}

/**
 * Fetch coaching availability for next 14 days
 */
async function getCoachingAvailability(): Promise<Coach[] | null> {
  try {
    const today = new Date();
    const fourteenDaysLater = new Date(today);
    fourteenDaysLater.setDate(today.getDate() + 14);

    const baseUrl = Deno.env.get('NEXTAUTH_URL') || 'https://lengolf-forms.vercel.app';
    const response = await fetch(
      `${baseUrl}/api/coaching-assist/slots?fromDate=${today.toISOString().split('T')[0]}&toDate=${fourteenDaysLater.toISOString().split('T')[0]}`
    );

    if (!response.ok) {
      console.error('Failed to fetch coaching slots:', response.status);
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
 * Create LINE Flex Message for coaching availability
 */
function createCoachingAvailabilityMessage(coaches: Coach[], options: {
  includeUnsubscribe: boolean;
  campaignId: string;
  audienceId: string;
}) {
  const bubbles = coaches.map((coach) => ({
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: coach.name,
          weight: 'bold',
          size: 'lg',
          color: '#FFFFFF'
        }
      ],
      backgroundColor: '#27AE60',
      paddingAll: 'md'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: coach.slots.slice(0, 5).map((slot) => ({
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: new Date(slot.date).toLocaleDateString('th-TH', {
              month: 'short',
              day: 'numeric'
            }),
            size: 'sm',
            color: '#555555',
            flex: 2
          },
          {
            type: 'text',
            text: slot.time,
            size: 'sm',
            color: '#111111',
            flex: 3,
            weight: 'bold'
          }
        ],
        spacing: 'sm'
      })),
      paddingAll: 'md'
    },
    footer: options.includeUnsubscribe ? {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: 'ยกเลิกการรับข่าวสาร',
            uri: `https://lengolf-forms.vercel.app/api/line/unsubscribe?campaignId=${options.campaignId}&audienceId=${options.audienceId}`
          },
          style: 'link',
          height: 'sm'
        }
      ],
      paddingAll: 'sm'
    } : undefined
  }));

  return {
    type: 'flex',
    altText: 'ตารางคอร์สกอล์ฟที่ว่าง',
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
}

/**
 * Send LINE push message
 */
async function sendLineMessage(lineUserId: string, message: any): Promise<{ success: boolean; error?: string }> {
  const channelAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const today = new Date().toISOString().split('T')[0];

    // DUPLICATE PREVENTION: Check if we already successfully sent today
    const { data: existingCampaigns } = await supabaseClient
      .from('line_broadcast_campaigns')
      .select('id, status, name, created_at')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (existingCampaigns && existingCampaigns.length > 0) {
      const completedCampaign = existingCampaigns[0];
      console.log(`Duplicate prevented: Campaign ${completedCampaign.id} already completed today`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Broadcast already sent today',
          campaign_id: completedCampaign.id,
          skipped: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the coaching audience
    const { data: audience, error: audienceError } = await supabaseClient
      .from('line_audiences')
      .select('id, name')
      .eq('name', 'Coaching Students - Weekly Updates')
      .single();

    if (audienceError || !audience) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Coaching audience not found'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh audience members
    await supabaseClient.rpc('refresh_coaching_audience_members');

    // Get active members
    const { data: members, error: membersError } = await supabaseClient
      .from('line_audience_members')
      .select('line_user_id')
      .eq('audience_id', audience.id)
      .eq('opted_out', false);

    if (membersError || !members || members.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active audience members found'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch coaching availability
    const coaches = await getCoachingAvailability();

    if (!coaches || coaches.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No coaching availability found for the next 14 days'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for incomplete campaign from today
    const { data: incompleteCampaigns } = await supabaseClient
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
      const { data: existingLogs } = await supabaseClient
        .from('line_broadcast_logs')
        .select('line_user_id, status')
        .eq('campaign_id', campaign.id)
        .eq('status', 'success');

      if (existingLogs) {
        alreadySentUserIds = new Set(existingLogs.map((log: { line_user_id: string }) => log.line_user_id));
        console.log(`Found ${alreadySentUserIds.size} users who already received the message`);
      }
    } else {
      // Create new campaign record
      const { data: newCampaign, error: campaignError } = await supabaseClient
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
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to create campaign record'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      campaign = newCampaign;
      console.log(`Created new campaign ${campaign.id}`);
    }

    // Filter out users who already received the message
    const membersToSend = members.filter((m: { line_user_id: string }) => !alreadySentUserIds.has(m.line_user_id));

    if (membersToSend.length === 0) {
      // All members already received the message
      await supabaseClient
        .from('line_broadcast_campaigns')
        .update({
          status: 'completed',
          sent_at: new Date().toISOString()
        })
        .eq('id', campaign.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'All members already received the message',
          campaign_id: campaign.id,
          results: {
            total: members.length,
            sent: members.length,
            failed: 0,
            errors: []
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending to ${membersToSend.length} members (${alreadySentUserIds.size} already sent)`);

    // Create flex message with unsubscribe option
    const flexMessage = createCoachingAvailabilityMessage(coaches, {
      includeUnsubscribe: true,
      campaignId: campaign.id,
      audienceId: audience.id
    });

    // Send to all members SEQUENTIALLY with proper logging
    let successCount = alreadySentUserIds.size;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < membersToSend.length; i++) {
      const member = membersToSend[i];

      try {
        // Send message
        const result = await sendLineMessage(member.line_user_id, flexMessage);

        // Log result to database
        const logInsert = await supabaseClient
          .from('line_broadcast_logs')
          .insert({
            campaign_id: campaign.id,
            line_user_id: member.line_user_id,
            status: result.success ? 'success' : 'failed',
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
    await supabaseClient
      .from('line_broadcast_campaigns')
      .update({
        status: 'completed',
        sent_at: new Date().toISOString()
      })
      .eq('id', campaign.id);

    console.log(`Campaign ${campaign.id} completed: ${successCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: campaign.id,
        audience_id: audience.id,
        results: {
          total: members.length,
          sent: successCount,
          failed: failedCount,
          errors: errors.slice(0, 5)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending coaching availability broadcast:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to send broadcast',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
