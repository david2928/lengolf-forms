import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

// ── Types ────────────────────────────────────────────────────────────

interface BookingRecord {
  id: string
  name: string
  email: string | null
  phone_number: string | null
  date: string
  start_time: string
  duration: number
  bay: string | null
  number_of_people: number
  booking_type: string | null
  customer_notes: string | null
  status: string
  customer_id: string | null
  calendar_events: CalendarEvent[] | null
  is_new_customer: boolean | null
  package_id: string | null
}

interface CalendarEvent {
  eventId: string
  calendarId: string
  status: string
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE'
  action: 'create' | 'cancel' | 'update' | 'backfill'
  record: BookingRecord
  old_record: BookingRecord | null
}

// ── Coach → Calendar ID mapping ──────────────────────────────────────

function getCoachCalendarId(bookingType: string | null): string | null {
  if (!bookingType) return null

  const bt = bookingType.toLowerCase()
  if (!bt.includes('coaching')) return null

  // Extract coach name from "Coaching (CoachName)"
  const match = bookingType.match(/\(([^)]+)\)/)
  if (!match) return null

  const coachName = match[1].trim()

  // Map coach name to calendar ID env var
  // "Boss - Ratchavin" → COACHING_RATCHAVIN_CALENDAR_ID (Ratchavin has his own calendar)
  if (coachName === 'Boss - Ratchavin' || coachName === 'Ratchavin') {
    return Deno.env.get('COACHING_RATCHAVIN_CALENDAR_ID') ?? null
  }
  if (coachName === 'Boss') {
    return Deno.env.get('COACHING_BOSS_CALENDAR_ID') ?? null
  }
  if (coachName === 'Noon') {
    return Deno.env.get('COACHING_NOON_CALENDAR_ID') ?? null
  }
  if (coachName === 'Min') {
    return Deno.env.get('COACHING_MIN_CALENDAR_ID') ?? null
  }

  console.warn(`Unknown coach in booking type: ${bookingType}`)
  return null
}

function getCoachName(bookingType: string | null): string {
  if (!bookingType) return ''
  const match = bookingType.match(/\(([^)]+)\)/)
  return match ? match[1].trim() : ''
}

// ── Google Calendar Auth (Service Account JWT) ───────────────────────

async function getGoogleAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL')
  const privateKeyPem = Deno.env.get('GOOGLE_PRIVATE_KEY')

  if (!clientEmail || !privateKeyPem) {
    throw new Error('Google service account credentials not configured')
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  // Base64url encode (loop-based to avoid call stack limits with spread)
  const encoder = new TextEncoder()
  const b64url = (data: Uint8Array): string => {
    let binary = ''
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i])
    }
    const b64 = btoa(binary)
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const headerB64 = b64url(encoder.encode(JSON.stringify(header)))
  const payloadB64 = b64url(encoder.encode(JSON.stringify(payload)))
  const unsignedToken = `${headerB64}.${payloadB64}`

  // Import private key and sign
  const pemContents = privateKeyPem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(unsignedToken)),
  )

  const jwt = `${unsignedToken}.${b64url(signature)}`

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text()
    throw new Error(`Google token exchange failed: ${tokenResponse.status} - ${err}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

// ── Google Calendar API Operations ───────────────────────────────────

async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  booking: BookingRecord,
): Promise<string> {
  const endTime = calculateEndTime(booking.start_time, booking.duration)

  // Build event datetime in Asia/Bangkok timezone
  const startDateTime = `${booking.date}T${booking.start_time}:00`
  const endDateTime = `${booking.date}T${endTime}:00`

  // Build tag for calendar title: [TRIAL], [NEW], [PKG], or nothing
  const notes = (booking.customer_notes || '').toLowerCase()
  const isTrial = notes.includes('free trial') || notes.includes('trial')
  let tag = ''
  if (isTrial) {
    tag = ' [TRIAL]'
  } else if (booking.is_new_customer) {
    tag = ' [NEW]'
  } else if (booking.package_id) {
    tag = ' [PKG]'
  }

  const descriptionParts = []
  if (booking.bay) descriptionParts.push(`Bay: ${booking.bay}`)
  if (booking.number_of_people) descriptionParts.push(`Pax: ${booking.number_of_people}`)
  if (booking.phone_number) descriptionParts.push(`Phone: ${booking.phone_number}`)
  if (booking.customer_notes) descriptionParts.push(`Notes: ${booking.customer_notes}`)
  descriptionParts.push(`Booking ID: ${booking.id}`)

  const event = {
    summary: `${booking.name.trim()}${tag}`,
    description: descriptionParts.join('\n'),
    start: {
      dateTime: startDateTime,
      timeZone: 'Asia/Bangkok',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'Asia/Bangkok',
    },
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    },
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Google Calendar create failed: ${response.status} - ${err}`)
  }

  const created = await response.json()
  return created.id
}

async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  // 410 Gone means already deleted — treat as success
  if (!response.ok && response.status !== 410 && response.status !== 404) {
    const err = await response.text()
    throw new Error(`Google Calendar delete failed: ${response.status} - ${err}`)
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function calculateEndTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + duration * 60
  const endHours = Math.floor(totalMinutes / 60)
  const endMinutes = Math.floor(totalMinutes % 60)
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
}

function isCoachingBooking(bookingType: string | null): boolean {
  return bookingType ? bookingType.toLowerCase().includes('coaching') : false
}

// ── Backfill handler ─────────────────────────────────────────────────

async function handleBackfill(supabase: any, accessToken: string, resync = false): Promise<{ created: number; failed: number; skipped: number; deleted: number }> {
  // Fetch all confirmed coaching bookings from today onwards
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('bookings')
    .select('*')
    .like('booking_type', 'Coaching (%')
    .eq('status', 'confirmed')
    .gte('date', today)

  // In resync mode, include already-synced bookings (to update their events)
  if (!resync) {
    query = query.or('google_calendar_sync_status.is.null,google_calendar_sync_status.neq.synced')
  }

  const { data: bookings, error } = await query.order('date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch bookings for backfill: ${error.message}`)
  }

  if (!bookings || bookings.length === 0) {
    return { created: 0, failed: 0, skipped: 0, deleted: 0 }
  }

  console.log(`Backfill${resync ? ' (resync)' : ''}: Found ${bookings.length} coaching bookings to sync`)

  let created = 0
  let failed = 0
  let skipped = 0
  let deleted = 0

  for (const booking of bookings) {
    const calendarId = getCoachCalendarId(booking.booking_type)
    if (!calendarId) {
      console.warn(`Backfill: No calendar ID for ${booking.booking_type}, skipping ${booking.id}`)
      skipped++
      continue
    }

    try {
      // In resync mode, delete existing calendar events first
      if (resync && booking.calendar_events && Array.isArray(booking.calendar_events)) {
        for (const evt of booking.calendar_events) {
          try {
            await deleteCalendarEvent(accessToken, evt.calendarId, evt.eventId)
            console.log(`Backfill resync: Deleted old event ${evt.eventId} for ${booking.id}`)
            deleted++
          } catch (err: any) {
            console.error(`Backfill resync: Failed to delete old event ${evt.eventId}: ${err.message}`)
          }
        }
      }

      const eventId = await createCalendarEvent(accessToken, calendarId, booking)

      // Update booking with calendar event info
      const calendarEvents: CalendarEvent[] = [{ eventId, calendarId, status: 'confirmed' }]
      await supabase
        .from('bookings')
        .update({
          calendar_events: calendarEvents,
          google_calendar_sync_status: 'synced',
        })
        .eq('id', booking.id)

      console.log(`Backfill: Created event for booking ${booking.id}`)
      created++

      // Rate limit: ~5 requests per second
      await new Promise((r) => setTimeout(r, 200))
    } catch (err: any) {
      console.error(`Backfill: Failed for booking ${booking.id}: ${err.message}`)

      await supabase
        .from('bookings')
        .update({ google_calendar_sync_status: 'error_syncing' })
        .eq('id', booking.id)

      failed++
    }
  }

  return { created, failed, skipped, deleted }
}

// ── Main handler ─────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate webhook secret
    const webhookSecret = Deno.env.get('COACHING_CALENDAR_WEBHOOK_SECRET')
    const requestSecret = req.headers.get('X-Webhook-Secret')

    if (!webhookSecret || requestSecret !== webhookSecret) {
      console.error('Invalid webhook secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const payload: WebhookPayload = await req.json()
    const { type, action, record, old_record } = payload

    // Create Supabase client (for updating booking records)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Get Google access token
    const accessToken = await getGoogleAccessToken()

    // ── Backfill mode ──
    if (action === 'backfill') {
      const resync = !!(payload as any).resync
      console.log(`Starting ${resync ? 'resync' : 'backfill'} of coaching bookings to Google Calendar`)
      const result = await handleBackfill(supabase, accessToken, resync)
      return new Response(
        JSON.stringify({ success: true, backfill: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Single booking sync ──

    // Only process coaching bookings
    if (!isCoachingBooking(record.booking_type)) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Not a coaching booking' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const calendarId = getCoachCalendarId(record.booking_type)
    if (!calendarId) {
      console.warn(`No calendar ID configured for booking type: ${record.booking_type}`)
      return new Response(
        JSON.stringify({ skipped: true, reason: 'No calendar ID for this coach' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Determine what action to take
    if (action === 'create' || (type === 'INSERT' && record.status === 'confirmed')) {
      // ── CREATE: New coaching booking ──
      console.log(`Creating calendar event for coaching booking ${record.id}`)

      const eventId = await createCalendarEvent(accessToken, calendarId, record)

      const calendarEvents: CalendarEvent[] = [{ eventId, calendarId, status: 'confirmed' }]
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          calendar_events: calendarEvents,
          google_calendar_sync_status: 'synced',
        })
        .eq('id', record.id)

      if (updateError) {
        console.error(`Failed to update booking ${record.id} with calendar data:`, updateError)
      }

      console.log(`Created calendar event ${eventId} for booking ${record.id}`)
      return new Response(
        JSON.stringify({ success: true, action: 'created', eventId, bookingId: record.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'cancel' || (type === 'UPDATE' && record.status === 'cancelled' && old_record?.status !== 'cancelled')) {
      // ── CANCEL: Delete calendar event ──
      console.log(`Deleting calendar event for cancelled booking ${record.id}`)

      // Get existing calendar events from the booking
      const existingEvents = record.calendar_events
      if (existingEvents && existingEvents.length > 0) {
        for (const evt of existingEvents) {
          try {
            await deleteCalendarEvent(accessToken, evt.calendarId, evt.eventId)
            console.log(`Deleted calendar event ${evt.eventId}`)
          } catch (err: any) {
            console.error(`Failed to delete event ${evt.eventId}: ${err.message}`)
          }
        }
      } else {
        console.warn(`No calendar events found on booking ${record.id} to delete`)
      }

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ google_calendar_sync_status: 'deleted' })
        .eq('id', record.id)

      if (updateError) {
        console.error(`Failed to update sync status for ${record.id}:`, updateError)
      }

      return new Response(
        JSON.stringify({ success: true, action: 'deleted', bookingId: record.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'update') {
      // ── UPDATE: Time/date/bay changed — delete old event, create new one ──
      console.log(`Updating calendar event for modified booking ${record.id}`)

      // Delete old event(s) if they exist
      const existingEvents = record.calendar_events
      if (existingEvents && existingEvents.length > 0) {
        for (const evt of existingEvents) {
          try {
            await deleteCalendarEvent(accessToken, evt.calendarId, evt.eventId)
          } catch (err: any) {
            console.error(`Failed to delete old event ${evt.eventId}: ${err.message}`)
          }
        }
      }

      // Create new event with updated details
      const eventId = await createCalendarEvent(accessToken, calendarId, record)

      const calendarEvents: CalendarEvent[] = [{ eventId, calendarId, status: 'confirmed' }]
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          calendar_events: calendarEvents,
          google_calendar_sync_status: 'synced',
        })
        .eq('id', record.id)

      if (updateError) {
        console.error(`Failed to update booking ${record.id} with new calendar data:`, updateError)
      }

      console.log(`Updated calendar event for booking ${record.id}, new eventId: ${eventId}`)
      return new Response(
        JSON.stringify({ success: true, action: 'updated', eventId, bookingId: record.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // No action matched
    return new Response(
      JSON.stringify({ skipped: true, reason: 'No matching action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error('Error in coaching-calendar-sync:', error)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
