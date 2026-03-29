import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MessagePayload {
  userId: string
  name: string
  message: string
  type: 'text' | 'flex'
  flexContents?: Record<string, unknown>
}

/**
 * Send a LINE push message (text or flex)
 */
async function sendLineMessage(
  channelAccessToken: string,
  userId: string,
  message: string,
  type: 'text' | 'flex',
  flexContents?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    let lineMessage: Record<string, unknown>

    if (type === 'flex' && flexContents) {
      lineMessage = {
        type: 'flex',
        altText: message,
        contents: flexContents,
      }
    } else {
      lineMessage = {
        type: 'text',
        text: message,
      }
    }

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [lineMessage],
      }),
    })

    if (response.ok) {
      return { success: true }
    }

    const errorText = await response.text()
    return { success: false, error: `LINE API ${response.status}: ${errorText}` }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth: require CRON_SECRET via custom header (Authorization is used by Supabase JWT gateway)
    const cronSecretHeader = req.headers.get('x-cron-secret') || ''
    const cronSecret = Deno.env.get('CRON_SECRET')

    if (!cronSecret || cronSecretHeader !== cronSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const channelAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
    if (!channelAccessToken) {
      return new Response(
        JSON.stringify({ error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const messages: MessagePayload[] = body.messages

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Safety: max 10 messages per call
    if (messages.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Maximum 10 messages per call' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: Array<{ name: string; success: boolean; error?: string }> = []

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const result = await sendLineMessage(
        channelAccessToken,
        msg.userId,
        msg.message,
        msg.type,
        msg.flexContents
      )
      results.push({ name: msg.name, ...result })

      // Rate limit: 150ms between messages
      if (i < messages.length - 1) {
        await new Promise((r) => setTimeout(r, 150))
      }
    }

    const sent = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    return new Response(
      JSON.stringify({ success: true, sent, failed, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
