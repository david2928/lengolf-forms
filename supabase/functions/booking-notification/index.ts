import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

// LIFF URLs for customer self-service
const LIFF_MEMBERSHIP_URL = 'https://liff.line.me/2007027277-MmFezHiv'
const LIFF_BOOKING_URL = 'https://liff.line.me/2007027277-ShDmuSHO'

interface BookingRecord {
  id: string
  name: string
  email: string | null
  phone_number: string | null
  date: string
  start_time: string
  duration: number
  bay: string
  number_of_people: number
  booking_type: string | null
  customer_notes: string | null
  status: string
  customer_id: string | null
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE'
  record: BookingRecord
  old_record: BookingRecord | null
}

// ── Helpers ──────────────────────────────────────────────────────────

function getBayDisplay(bay: string): string {
  if (bay === 'Bay 1' || bay === 'Bay 2' || bay === 'Bay 3') return 'Social Bay'
  if (bay === 'Bay 4') return 'AI Bay'
  return bay
}

function calculateEndTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + (duration * 60)
  const endHours = Math.floor(totalMinutes / 60)
  const endMinutes = Math.floor(totalMinutes % 60)
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
}

function getCoachingInfo(bookingType: string | null): { isCoaching: boolean; coachName: string } {
  if (!bookingType) return { isCoaching: false, coachName: '' }
  const isCoaching = bookingType.toLowerCase().includes('coaching')
  let coachName = ''
  if (isCoaching) {
    const match = bookingType.match(/\(([^)]+)\)/)
    if (match && match[1]) coachName = match[1]
  }
  return { isCoaching, coachName }
}

function formatBookingDate(dateStr: string): { longDate: string; shortDate: string } {
  const date = new Date(dateStr)
  return {
    longDate: date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    shortDate: date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
  }
}

// ── LINE user resolution ─────────────────────────────────────────────

async function resolveLineUser(
  supabase: any,
  booking: BookingRecord,
): Promise<{ lineUserId: string; conversationId: string | null } | null> {
  // 1. By customer_id (most recent LINE user)
  if (booking.customer_id) {
    const { data: lineUsers } = await supabase
      .from('line_users')
      .select('line_user_id')
      .eq('customer_id', booking.customer_id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (lineUsers && lineUsers.length > 0) {
      const lineUserId = lineUsers[0].line_user_id

      const { data: conversation } = await supabase
        .from('line_conversations')
        .select('id')
        .eq('line_user_id', lineUserId)
        .maybeSingle()

      return { lineUserId, conversationId: conversation?.id ?? null }
    }
  }

  // 2. Fallback: by phone number
  if (booking.phone_number) {
    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('contact_number', booking.phone_number)
      .eq('is_active', true)
      .limit(1)

    if (customers && customers.length > 0) {
      const { data: lineUsers } = await supabase
        .from('line_users')
        .select('line_user_id')
        .eq('customer_id', customers[0].id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (lineUsers && lineUsers.length > 0) {
        const lineUserId = lineUsers[0].line_user_id

        const { data: conversation } = await supabase
          .from('line_conversations')
          .select('id')
          .eq('line_user_id', lineUserId)
          .maybeSingle()

        return { lineUserId, conversationId: conversation?.id ?? null }
      }
    }
  }

  return null
}

// ── Duplicate check ──────────────────────────────────────────────────

async function isDuplicate(
  supabase: any,
  bookingId: string,
  notificationType: 'booking_confirmation' | 'booking_cancellation',
): Promise<boolean> {
  const { data } = await supabase
    .from('line_messages')
    .select('id')
    .eq('raw_event->>booking_id', bookingId)
    .eq('raw_event->>auto_sent', 'true')
    .eq('raw_event->>type', notificationType)
    .limit(1)

  return data && data.length > 0
}

// ── Flex message builders ────────────────────────────────────────────

function buildConfirmationFlex(details: {
  bookingId: string
  customerName: string
  longDate: string
  time: string
  bay: string
  duration: string
  isCoaching: boolean
  coachName: string
}) {
  const headerText = details.isCoaching ? 'COACHING SESSION CONFIRMED' : 'BOOKING CONFIRMED'
  const headerColor = details.isCoaching ? '#7B68EE' : '#06C755'

  return {
    type: 'flex',
    altText: `${details.isCoaching ? 'Coaching Session' : 'Booking'} Confirmed - ${details.longDate} ${details.time}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'text',
          text: headerText,
          weight: 'bold',
          color: '#ffffff',
          size: 'sm',
          align: 'center',
        }],
        backgroundColor: headerColor,
        paddingAll: '16px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: details.customerName,
            weight: 'bold',
            size: 'lg',
            color: '#333333',
            wrap: true,
          },
          {
            type: 'text',
            text: `ID: ${details.bookingId}`,
            size: 'xs',
            color: '#999999',
          },
          ...(details.isCoaching && details.coachName
            ? [{
                type: 'box',
                layout: 'horizontal',
                spacing: 'sm',
                margin: 'md',
                contents: [
                  { type: 'text', text: '🏌️', size: 'sm', flex: 0 },
                  {
                    type: 'text',
                    text: `Coach: ${details.coachName}`,
                    size: 'md',
                    weight: 'bold',
                    color: '#7B68EE',
                    flex: 1,
                    wrap: true,
                  },
                ],
              }]
            : []),
          { type: 'separator', margin: 'md' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: details.longDate,
                size: 'md',
                weight: 'bold',
                color: '#333333',
                wrap: true,
              },
              {
                type: 'text',
                text: details.time,
                size: 'sm',
                color: '#666666',
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'text', text: 'Bay', size: 'xs', color: '#999999' },
                  { type: 'text', text: details.bay, size: 'sm', weight: 'bold', color: '#333333' },
                ],
              },
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'text', text: 'Duration', size: 'xs', color: '#999999' },
                  { type: 'text', text: details.duration, size: 'sm', weight: 'bold', color: '#333333' },
                ],
              },
            ],
          },
        ],
        paddingAll: '16px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            action: {
              type: 'uri',
              label: 'View Booking',
              uri: `${LIFF_MEMBERSHIP_URL}/booking/${details.bookingId}`,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'uri',
              label: 'Cancel Booking',
              uri: `${LIFF_MEMBERSHIP_URL}/booking/${details.bookingId}`,
            },
          },
        ],
        paddingAll: '16px',
      },
    },
  }
}

function buildCancellationFlex(details: {
  bookingId: string
  customerName: string
  longDate: string
  time: string
  bay: string
  duration: string
  isCoaching: boolean
  coachName: string
}) {
  const headerText = details.isCoaching ? 'COACHING SESSION CANCELLED' : 'BOOKING CANCELLED'

  return {
    type: 'flex',
    altText: `${details.isCoaching ? 'Coaching Session' : 'Booking'} Cancellation - ${details.longDate} ${details.time}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'text',
          text: headerText,
          weight: 'bold',
          color: '#ffffff',
          size: 'sm',
          align: 'center',
        }],
        backgroundColor: '#FF3B30',
        paddingAll: '16px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: details.customerName,
            weight: 'bold',
            size: 'lg',
            color: '#333333',
            wrap: true,
          },
          {
            type: 'text',
            text: `ID: ${details.bookingId}`,
            size: 'xs',
            color: '#999999',
          },
          {
            type: 'text',
            text: 'This booking has been cancelled.',
            size: 'sm',
            color: '#666666',
            margin: 'md',
            wrap: true,
          },
          ...(details.isCoaching && details.coachName
            ? [{
                type: 'box',
                layout: 'horizontal',
                spacing: 'sm',
                margin: 'md',
                contents: [
                  { type: 'text', text: '🏌️', size: 'sm', flex: 0 },
                  {
                    type: 'text',
                    text: `Coach: ${details.coachName}`,
                    size: 'md',
                    weight: 'bold',
                    color: '#7B68EE',
                    flex: 1,
                    wrap: true,
                  },
                ],
              }]
            : []),
          { type: 'separator', margin: 'md' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: details.longDate,
                size: 'md',
                weight: 'bold',
                color: '#333333',
                wrap: true,
              },
              {
                type: 'text',
                text: details.time,
                size: 'sm',
                color: '#666666',
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'text', text: 'Bay', size: 'xs', color: '#999999' },
                  { type: 'text', text: details.bay, size: 'sm', weight: 'bold', color: '#333333' },
                ],
              },
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'text', text: 'Duration', size: 'xs', color: '#999999' },
                  { type: 'text', text: details.duration, size: 'sm', weight: 'bold', color: '#333333' },
                ],
              },
            ],
          },
        ],
        paddingAll: '16px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            action: {
              type: 'uri',
              label: 'Book Again',
              uri: LIFF_BOOKING_URL,
            },
          },
          {
            type: 'text',
            text: 'If you have any questions, please contact us.',
            size: 'xs',
            color: '#999999',
            align: 'center',
            wrap: true,
            margin: 'md',
          },
        ],
        paddingAll: '16px',
      },
    },
  }
}

// ── Message storage ──────────────────────────────────────────────────

async function storeMessage(
  supabase: any,
  opts: {
    conversationId: string
    lineUserId: string
    messageText: string
    notificationType: 'booking_confirmation' | 'booking_cancellation'
    bookingId: string
    flexData: Record<string, any>
  },
) {
  // Insert message
  const { error: messageError } = await supabase.from('line_messages').insert({
    conversation_id: opts.conversationId,
    line_user_id: opts.lineUserId,
    message_type: 'flex',
    message_text: opts.messageText,
    sender_type: 'admin',
    sender_name: 'System',
    timestamp: Date.now(),
    is_read: true,
    raw_event: {
      type: opts.notificationType,
      booking_id: opts.bookingId,
      message_format: 'flex',
      auto_sent: true,
      booking_details: opts.flexData,
    },
  })

  if (messageError) {
    console.error('Error storing message:', messageError)
  }

  // Update conversation
  const { error: convError } = await supabase
    .from('line_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_text: opts.messageText,
      last_message_by: 'admin',
      updated_at: new Date().toISOString(),
    })
    .eq('id', opts.conversationId)

  if (convError) {
    console.error('Error updating conversation:', convError)
  }
}

// ── Main handler ─────────────────────────────────────────────────────

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate webhook secret
    const webhookSecret = Deno.env.get('BOOKING_WEBHOOK_SECRET')
    const requestSecret = req.headers.get('X-Webhook-Secret')

    if (!webhookSecret || requestSecret !== webhookSecret) {
      console.error('Invalid webhook secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Parse payload
    const payload: WebhookPayload = await req.json()
    const { type, record, old_record } = payload

    // Determine notification type
    let notificationType: 'booking_confirmation' | 'booking_cancellation' | null = null

    if (type === 'INSERT' && record.status === 'confirmed') {
      notificationType = 'booking_confirmation'
    } else if (
      type === 'UPDATE' &&
      record.status === 'cancelled' &&
      old_record?.status !== 'cancelled'
    ) {
      notificationType = 'booking_cancellation'
    }

    if (!notificationType) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Event does not require notification' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`Processing ${notificationType} for booking ${record.id}`)

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Check for duplicate
    if (await isDuplicate(supabase, record.id, notificationType)) {
      console.log(`Duplicate ${notificationType} for booking ${record.id} - skipping`)
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Duplicate notification' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Resolve LINE user
    const lineInfo = await resolveLineUser(supabase, record)

    if (!lineInfo) {
      console.log(`No LINE user found for booking ${record.id} (customer_id: ${record.customer_id})`)
      return new Response(
        JSON.stringify({ skipped: true, reason: 'No linked LINE account' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { lineUserId, conversationId } = lineInfo

    // Check LINE token
    const lineToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
    if (!lineToken) {
      console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
      return new Response(
        JSON.stringify({ error: 'LINE not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Build booking details
    const { longDate, shortDate } = formatBookingDate(record.date)
    const endTime = calculateEndTime(record.start_time, record.duration)
    const { isCoaching, coachName } = getCoachingInfo(record.booking_type)
    const bayDisplay = getBayDisplay(record.bay)

    const flexData = {
      bookingId: record.id,
      customerName: record.name,
      longDate,
      time: `${record.start_time} - ${endTime}`,
      bay: bayDisplay,
      duration: `${record.duration} hours`,
      isCoaching,
      coachName,
      bookingType: record.booking_type || '',
    }

    // Build flex message
    const flexMessage =
      notificationType === 'booking_confirmation'
        ? buildConfirmationFlex(flexData)
        : buildCancellationFlex(flexData)

    // Send via LINE push API
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [flexMessage],
      }),
    })

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text()
      console.error(`LINE API error: ${lineResponse.status} - ${errorText}`)
      return new Response(
        JSON.stringify({ error: 'LINE API error', status: lineResponse.status, details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`✓ Sent ${notificationType} to ${lineUserId} for booking ${record.id}`)

    // Store message in database if we have a conversation
    if (conversationId) {
      const messageText =
        notificationType === 'booking_confirmation'
          ? (isCoaching
              ? `🏌️ Coaching - ${shortDate} ${record.start_time}-${endTime} (ID: ${record.id})`
              : `📋 Booking - ${shortDate} ${record.start_time}-${endTime} (ID: ${record.id})`)
          : (isCoaching ? '❌ Coaching session cancelled' : '❌ Booking cancelled')

      await storeMessage(supabase, {
        conversationId,
        lineUserId,
        messageText,
        notificationType,
        bookingId: record.id,
        flexData,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_type: notificationType,
        booking_id: record.id,
        line_user_id: lineUserId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error('Error in booking-notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
