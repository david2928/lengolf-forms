# POST /api/notify - Dual-Write Implementation

**Status:** ✅ Implemented
**Version:** 2.0 (Enhanced with dual-write)
**Story:** NOTIF-004

## Overview

The `/api/notify` endpoint has been enhanced to implement a **dual-write pattern**, simultaneously:
1. Inserting clean, parsed notification data into the database
2. Sending LINE notifications via existing integration

This ensures that all booking lifecycle events (create, cancel, modify) are captured as in-app notifications while maintaining backward compatibility with the existing LINE messaging system.

## Request

### Endpoint
```
POST /api/notify
```

### Headers
```
Content-Type: application/json
```

### Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | LINE-formatted message with emojis (will be parsed) |
| `bookingType` | string | No | Booking type for LINE group routing |
| `customer_notes` | string | No | Additional customer notes |

### Example Request

```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Booking Notification (ID: BK-ABC123)\nName: John Doe\nPhone: 0812345678\nDate: Thu, 15th January\nTime: 14:00 - 16:00\nBay: Bay 1\nType: Coaching\nPeople: 2\nCreated by: Staff Name",
    "bookingType": "Coaching"
  }'
```

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "notificationId": "cd643169-2fc4-46e4-ac98-77b9e392563c",
  "lineNotificationSent": true,
  "error": null
}
```

### Partial Success Response (200 OK)
When database insert succeeds but LINE fails:

```json
{
  "success": true,
  "notificationId": "cd643169-2fc4-46e4-ac98-77b9e392563c",
  "lineNotificationSent": false,
  "error": "LINE Messaging API configuration is incomplete"
}
```

### Error Response (500 Internal Server Error)

```json
{
  "success": false,
  "error": "Failed to send notification",
  "notificationId": null
}
```

## Implementation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    POST /api/notify                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ 1. Parse LINE Message │
         │    (notification-     │
         │     parser.ts)        │
         └───────┬───────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │ 2. Insert into DB     │
         │    - Clean message    │
         │    - Extracted data   │
         │    - Metadata         │
         └───────┬───────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │ 3. Send to LINE       │
         │    (existing logic)   │
         └───────┬───────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │ 4. Update LINE Status │
         │    in notification    │
         └───────┬───────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │ 5. Return Response    │
         └───────────────────────┘
```

## Data Transformation

### Input (LINE Message with Emojis)
```
🚫 BOOKING CANCELLED (ID: BK-TEST-004) 🚫
----------------------------------
👤 Customer: Bob Wilson
📞 Phone: 0876543210
🗓️ Date: Sat, 17th January
⏰ Time: 15:00 (Duration: 2h)
⛳ Bay: Bay 3
🧑‍🤝‍🧑 Pax: 3
----------------------------------
🗑️ Cancelled By: Manager
💬 Reason: Customer request
```

### Output (Clean Notification)
```
Booking Cancelled (ID: BK-TEST-004)
Customer: Bob Wilson
Phone: 0876543210
Date: Sat, 17th January
Time: 15:00
Bay: Bay 3
Pax: 3
Cancelled by: Manager
Reason: Customer request
```

### Database Record
```json
{
  "id": "00a2de52-9bee-4bb0-aadb-e732b32329db",
  "type": "cancelled",
  "message": "Booking Cancelled (ID: BK-TEST-004)\nCustomer: Bob Wilson...",
  "customer_name": "Bob Wilson",
  "customer_phone": "0876543210",
  "booking_time": "15:00",
  "bay": "Bay 3",
  "metadata": {
    "bookingId": "BK-TEST-004",
    "bookingType": "Coaching",
    "numberOfPeople": 3,
    "formattedDate": "Sat, 17th January",
    "originalLineMessage": "🚫 BOOKING CANCELLED..."
  },
  "line_notification_sent": true,
  "line_notification_error": null,
  "read": false,
  "created_at": "2025-10-02T02:26:45.144543+00:00"
}
```

## Notification Type Detection

The parser automatically detects notification type from message content:

| Type | Detection Keywords | Emoji Indicators |
|------|-------------------|------------------|
| `created` | "Booking Notification", "New Booking" | Default (no specific emoji) |
| `cancelled` | "CANCELLED", "CANCELED" | 🚫 |
| `modified` | "MODIFIED", "MODIFIED" | ℹ️, 🔄 |

## Error Handling

### Database Insert Failure
- Logs error to console
- **Continues with LINE send** (backward compatibility)
- Returns `notificationId: null`
- Still returns `success: true` if LINE succeeds

### LINE Send Failure
- Logs error to console
- **Database insert still succeeds**
- Stores error in `line_notification_error` field
- Returns `lineNotificationSent: false`
- Returns `success: true` (in-app notification succeeded)

### Complete Failure
- Returns 500 error
- Attempts to update notification with error status
- Returns `success: false`

## Backward Compatibility

✅ **All existing callers work unchanged:**

1. **Booking Creation** (`submit-handler.ts:282-297`)
   ```typescript
   const notifyResponse = await fetch('/api/notify', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       message: lineMessage,
       bookingType: formData.bookingType
     })
   });
   ```

2. **Booking Cancellation** (`CancelBookingModal.tsx:107-136`)
   ```typescript
   const notifyResponse = await fetch('/api/notify', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       message: lineMessage,
       bookingType: cancelledBookingData.booking_type,
       customer_notes: cancelledBookingData.customer_notes
     })
   });
   ```

3. **Booking Modification** (`EditBookingModal.tsx:564-622`)
   ```typescript
   const notifyResponse = await fetch('/api/notify', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       message: lineMessage,
       bookingType: updatedBookingData.booking_type || undefined,
       customer_notes: updatedBookingData.customer_notes
     })
   });
   ```

**No changes required** to existing code - dual-write happens transparently.

## Database Constraints

### Foreign Key Handling

**Issue:** The `booking_id` field has a foreign key constraint to `public.bookings(id)`.

**Solution:**
- `booking_id` is set to `null` in the database
- Actual booking ID is stored in `metadata.bookingId` for reference
- This avoids foreign key violations for test bookings or non-existent IDs

**Rationale:**
- LINE messages may reference test bookings (e.g., "BK-TEST-001")
- Bookings might be deleted before notification is processed
- Prevents dual-write from failing due to FK constraint

### Date Format Handling

**Issue:** `booking_date` field expects YYYY-MM-DD format, but LINE messages contain formatted strings like "Thu, 15th January".

**Solution:**
- `booking_date` is set to `null` in the database
- Formatted date string is stored in `metadata.formattedDate`
- Future enhancement: implement date parsing to populate `booking_date`

## Testing

### Manual Testing Results

✅ **Created Notification**
```bash
curl -X POST http://localhost:3000/api/notify -H "Content-Type: application/json" -d '{
  "message": "Booking Notification (ID: BK-TEST-003)\nName: Alice Johnson\nPhone: 0887654321...",
  "bookingType": "Practice"
}'
# Response: {"success":true,"notificationId":"cd643169-...","lineNotificationSent":true}
```

✅ **Cancelled Notification**
```bash
curl -X POST http://localhost:3000/api/notify -H "Content-Type: application/json" -d '{
  "message": "🚫 BOOKING CANCELLED (ID: BK-TEST-004) 🚫\n...",
  "bookingType": "Coaching"
}'
# Response: {"success":true,"notificationId":"00a2de52-...","lineNotificationSent":true}
```

✅ **Modified Notification**
```bash
curl -X POST http://localhost:3000/api/notify -H "Content-Type: application/json" -d '{
  "message": "ℹ️ BOOKING MODIFIED (ID: BK-TEST-005) 🔄\n...",
  "bookingType": "Coaching"
}'
# Response: {"success":true,"notificationId":"70c25978-...","lineNotificationSent":true}
```

### Verification Queries

```sql
-- Check notifications were created
SELECT type, customer_name, line_notification_sent
FROM public.notifications
ORDER BY created_at DESC
LIMIT 3;

-- Verify clean messages (no emojis)
SELECT message
FROM public.notifications
WHERE id = 'cd643169-2fc4-46e4-ac98-77b9e392563c';

-- Check metadata storage
SELECT metadata->>'bookingId' as booking_id_ref,
       metadata->>'formattedDate' as date,
       metadata->>'originalLineMessage' as original
FROM public.notifications
WHERE id = '00a2de52-9bee-4bb0-aadb-e732b32329db';
```

## Performance Considerations

- **Database Insert:** ~50-100ms (includes parsing)
- **LINE Send:** ~200-500ms (external API call)
- **Total Response Time:** ~300-600ms

The dual-write adds minimal overhead (~50ms) compared to LINE-only implementation.

## Monitoring

### Success Metrics
- `notificationId !== null` - Database insert succeeded
- `lineNotificationSent === true` - LINE send succeeded
- `error === null` - No errors occurred

### Logs to Monitor
```
Processing notification for: { bookingType: "Coaching", hasMessage: true }
Parsed notification type: created
Notification inserted into database: cd643169-2fc4-46e4-ac98-77b9e392563c
LINE Messaging API notifications sent successfully
Notification LINE status updated: { lineSuccess: true, lineError: null }
```

### Error Logs
```
Failed to insert notification into database: [error details]
LINE notification error: [error details]
Failed to update notification LINE status: [error details]
```

## Future Enhancements

### P1 - Date Parsing
Implement date parsing to convert formatted dates to YYYY-MM-DD:
- "Thu, 15th January" → "2025-01-15" (requires year context)
- Store in `booking_date` field for better filtering

### P1 - Booking ID Validation
Check if booking exists before setting `booking_id`:
```typescript
const { data: booking } = await supabase
  .from('bookings')
  .select('id')
  .eq('id', parseResult.data.bookingId)
  .single();

const notificationData = {
  booking_id: booking ? parseResult.data.bookingId : null,
  // ...
};
```

### P2 - Retry Queue
Implement automatic retry for failed LINE notifications:
- Background job to retry notifications where `line_notification_sent = false`
- Exponential backoff strategy
- Max retry attempts limit

## Related Documentation

- [Notification Parser Utility](../lib/notification-parser.md)
- [Notifications API Reference](./NOTIFICATIONS_API.md)
- [Database Schema: notifications](../database/notifications-table.md)
- [PRD: In-App Notifications](../technical/lengolf_inapp_notifications_prd.md)

## Changelog

### Version 2.0 (2025-10-02)
- ✅ Implemented dual-write pattern
- ✅ Added notification parser integration
- ✅ Enhanced response format with `notificationId` and `lineNotificationSent`
- ✅ Improved error handling for database/LINE failures
- ✅ Maintained backward compatibility with existing callers

### Version 1.0 (Previous)
- LINE-only notification sending
- Basic error handling
- Simple success/failure response
