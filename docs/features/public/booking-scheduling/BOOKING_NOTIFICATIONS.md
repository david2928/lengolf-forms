# Automated Booking LINE Notifications

## Overview

Automated LINE push notifications sent to customers when bookings are created or cancelled. Uses a Supabase Edge Function triggered by a database trigger on the `bookings` table. Since both apps (lengolf-forms and lengolf-booking-new) write to the same database, one trigger handles all booking events regardless of source.

### How It Works

```
[Staff creates booking]  ──┐
                           ├─→ bookings INSERT/UPDATE
[Customer books via LIFF] ─┘          │
                                      ▼
                            DB Trigger (pg_net)
                                      │
                                      ▼ async HTTP
                          Edge Function (booking-notification)
                                      │
                            ┌─────────┼─────────┐
                            ▼         ▼         ▼
                      Resolve    Build Flex   Store in
                      LINE user  Message      line_messages
                            │         │
                            ▼         ▼
                          LINE Push API
                                │
                                ▼
                        Customer receives
                        rich flex message
```

## Architecture

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Edge Function | `supabase/functions/booking-notification/index.ts` | Processes webhook, sends LINE push |
| DB Trigger | `public.notify_booking_change()` on `bookings` | Fires async HTTP on insert/update |
| Config Table | `public.app_config` | Stores webhook secret (row: `booking_webhook_secret`) |
| Flex Templates | `src/lib/line/flex-templates.ts` | Shared templates (also used by manual send) |

### Trigger Conditions

| Event | Condition | Notification |
|-------|-----------|--------------|
| INSERT | `NEW.status = 'confirmed'` | Booking confirmation |
| UPDATE | `OLD.status != 'cancelled' AND NEW.status = 'cancelled'` | Booking cancellation |
| Other | Any other insert/update | Skipped (no notification) |

### Authentication Flow

The trigger sends an async HTTP POST to the edge function via `pg_net`:

1. **Supabase Gateway**: `Authorization: Bearer <anon_key>` header passes JWT verification
2. **Edge Function**: `X-Webhook-Secret` header validates the caller is the DB trigger
3. **Database Access**: Edge function uses `SUPABASE_SERVICE_ROLE_KEY` (auto-provided) for DB queries

## Edge Function Details

### Flow

1. Validate `X-Webhook-Secret` header against `BOOKING_WEBHOOK_SECRET` env var
2. Parse payload `{ type, record, old_record }`
3. Determine notification type (confirmation or cancellation)
4. **Duplicate check**: Query `line_messages` for existing auto-sent notification with same `booking_id` + `type`
5. **Resolve LINE user**: `line_users` by `customer_id` (most recent), fallback by phone via `customers`
6. **Get conversation**: `line_conversations` by `line_user_id`
7. **Build flex message**: Rich interactive message with LIFF URI buttons
8. **Send**: `POST https://api.line.me/v2/bot/message/push`
9. **Store**: Insert into `line_messages` + update `line_conversations`

### Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `SUPABASE_URL` | Auto-provided | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided | Service role key for DB access |
| `LINE_CHANNEL_ACCESS_TOKEN` | Edge Function Secrets | LINE Messaging API token (shared with coaching-broadcast) |
| `BOOKING_WEBHOOK_SECRET` | Edge Function Secrets | Must match value in `app_config` table |

### Helper Functions

| Function | Description |
|----------|-------------|
| `getBayDisplay(bay)` | Bay 1/2/3 = "Social Bay", Bay 4 = "AI Bay" |
| `calculateEndTime(startTime, duration)` | Computes end time string from start + duration |
| `getCoachingInfo(bookingType)` | Detects coaching type, extracts coach name from parentheses |
| `resolveLineUser(supabase, booking)` | customer_id lookup (most recent LINE user), phone fallback |
| `buildConfirmationFlex(details)` | Flex JSON with "View Booking" / "Cancel Booking" LIFF buttons |
| `buildCancellationFlex(details)` | Flex JSON with "Book Again" LIFF button |
| `storeMessage(supabase, opts)` | Insert `line_messages` + update `line_conversations` |
| `isDuplicate(supabase, bookingId, type)` | Checks `line_messages` for existing auto-sent notification |

## Flex Messages

### Confirmation Message

- Green header: "BOOKING CONFIRMED" (or purple "COACHING SESSION CONFIRMED")
- Body: Customer name, booking ID, coach name (if coaching), date/time, bay, duration
- Footer buttons:
  - **"View Booking"** (green) -> LIFF membership page
  - **"Cancel Booking"** (secondary) -> LIFF membership page

### Cancellation Message

- Red header: "BOOKING CANCELLED" (or "COACHING SESSION CANCELLED")
- Body: Customer name, booking ID, cancellation notice, coach name (if coaching), date/time, bay, duration
- Footer:
  - **"Book Again"** (green) -> LIFF booking page
  - Contact text

### LIFF URLs

| URL | Purpose |
|-----|---------|
| `https://liff.line.me/2007027277-MmFezHiv` | Membership page (view/cancel bookings) |
| `https://liff.line.me/2007027277-ShDmuSHO` | Booking page (create new booking) |

These same LIFF URLs are used by the manual send routes (unified chat "Send Confirmation" / "Send Cancellation") and by the reminder messages.

## Message Storage

Auto-sent messages are stored in `line_messages` with a distinguishing `auto_sent: true` flag:

```json
{
  "conversation_id": "<uuid>",
  "line_user_id": "<line-id>",
  "message_type": "flex",
  "message_text": "📋 Booking - Mon, Feb 9 18:00-19:00 (ID: BK260209XXXX)",
  "sender_type": "admin",
  "sender_name": "System",
  "timestamp": 1739107200000,
  "is_read": true,
  "raw_event": {
    "type": "booking_confirmation",
    "booking_id": "BK260209XXXX",
    "message_format": "flex",
    "auto_sent": true,
    "booking_details": { ... }
  }
}
```

The `auto_sent: true` flag:
- Distinguishes automatic notifications from manual staff sends
- Used by the duplicate check to prevent double-sending
- Does NOT prevent staff from manually re-sending (manual sends don't set `auto_sent`)

## Database Trigger

### Function: `public.notify_booking_change()`

Reads the webhook secret from `public.app_config` table (key: `booking_webhook_secret`). If not configured, logs a warning and skips (never blocks the booking).

Sends a minimal payload to the edge function containing only the fields it needs:

```sql
payload := jsonb_build_object(
    'type', notification_type,  -- 'INSERT' or 'UPDATE'
    'record', jsonb_build_object(
        'id', 'name', 'email', 'phone_number', 'date',
        'start_time', 'duration', 'bay', 'number_of_people',
        'booking_type', 'customer_notes', 'status', 'customer_id'
    ),
    'old_record', jsonb_build_object('status', OLD.status)  -- only on UPDATE
);
```

### Safety

- Uses `pg_net` for async HTTP (fire-and-forget, never blocks transactions)
- `EXCEPTION WHEN OTHERS` catches all errors, logs warning, returns NEW
- If edge function is down or slow, booking still succeeds

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No linked LINE account | Skip silently, return `{ skipped: true }` |
| Multiple LINE accounts per customer | Use most recent (`ORDER BY created_at DESC LIMIT 1`) |
| Staff resends manually after auto-send | Works fine - manual sends don't check for auto-sent duplicates |
| Duplicate trigger fires | Duplicate check via `line_messages` prevents double-send |
| LINE API failure | Log error, return 502, booking unaffected (async) |
| Edge function down | pg_net fires async, booking succeeds regardless |
| Booking created then immediately cancelled | Both notifications sent (correct behavior) |
| Webhook secret not configured | Trigger logs warning and skips, booking unaffected |

## Setup / Configuration

### Edge Function Secrets (Supabase Dashboard > Edge Functions > Secrets)

| Secret | Value |
|--------|-------|
| `BOOKING_WEBHOOK_SECRET` | `c5adfceeee354beeaaa94b82cb626c1f` |
| `LINE_CHANNEL_ACCESS_TOKEN` | (already set, shared with coaching-broadcast) |

### Database Config (app_config table)

```sql
-- Already inserted during deployment
SELECT * FROM app_config WHERE key = 'booking_webhook_secret';
-- value: c5adfceeee354beeaaa94b82cb626c1f
```

### Deployment

1. Edge function deployed via MCP `deploy_edge_function` (name: `booking-notification`)
2. DB trigger applied via MCP `apply_migration`
3. `app_config` table and secret row created via migration
4. Flex template changes deployed with next Vercel deploy (commit to master)

## Related Files

| File | Description |
|------|-------------|
| `supabase/functions/booking-notification/index.ts` | Edge function source |
| `supabase/functions/coaching-broadcast/index.ts` | Similar edge function (pattern reference) |
| `supabase/migrations/20260209180000_add_booking_notification_trigger.sql` | Migration file |
| `src/lib/line/flex-templates.ts` | Shared flex message templates (LIFF URI buttons) |
| `app/api/line/bookings/[bookingId]/send-confirmation/route.ts` | Manual confirmation send (staff action) |
| `app/api/line/bookings/[bookingId]/send-cancellation/route.ts` | Manual cancellation send (staff action) |

## Verification Checklist

1. Staff creates booking for linked customer -> customer receives flex on LINE
2. Staff cancels booking -> customer receives cancellation flex
3. Customer books via LIFF -> same trigger fires -> confirmation flex sent
4. Customer cancels via LIFF -> same trigger fires -> cancellation flex sent
5. Unlinked customer -> no error, booking succeeds, edge function logs skip
6. Manual resend from unified chat -> still works, now with LIFF buttons
