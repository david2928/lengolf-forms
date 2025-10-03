# PRD: In-App Notifications & Notification Log for LENGOLF Forms (Tech-Ready - FINAL)

## 1. Overview

Extend booking-related notifications from LINE to **in-app notifications within LENGOLF Forms**, including:
- **New booking notifications**
- **Cancelled booking notifications**
- **Modified booking notifications**

The system will also include:
- **Persistent notification log** with timestamps for acknowledgment and internal staff notes
- **Browser notifications + audible ping** when the LENGOLF Forms app is open
- ~~Direct links to customer profiles from each notification~~ (Moved to future enhancement)

LINE notifications remain active and unchanged.

---

## 2. Goals

- Provide an in-app notification system for booking lifecycle events (create, cancel, modify)
- Require staff/admin acknowledgment for each notification
- Maintain a persistent, auditable log of notifications and acknowledgments
- Enable browser notifications + audible ping for active users (except super admins)
- Ensure real-time delivery and instant visibility
- Keep existing LINE notifications intact
- Allow staff to add searchable internal notes to notifications

---

## 3. Non-Goals

- Sending notifications outside the app when it's not open (mobile push, email)
- General chat/messaging functionality
- Customer profile links (moved to future enhancement)

> Browser notifications and pings are **P0**, not a future enhancement.

---

## 4. User Stories

**Staff/Admin**
1. As a staff member, I want to see new booking notifications inside the app with a ping sound so I don't need to check LINE constantly
2. As a staff member, I want to acknowledge each notification so there's accountability for who has seen it
3. As a staff member, I want to review a log of past notifications including acknowledgment timestamps
4. As a staff member, I want to add internal notes to notifications for context and collaboration
5. As a staff member, I want to search through notifications by customer name, booking ID, phone number, or notes
6. As an admin, I want real-time alerts when bookings are created, modified, or cancelled
7. As a super admin (David, Chris Rall), I don't want audible pings to interrupt me

---

## 5. Requirements

### Functional Requirements

**Trigger Points - FINALIZED**

All three booking events currently use `/api/notify` endpoint:

- **Create** → `submit-handler.ts:282-297` → `POST /api/notify` (server-side)
- **Cancel** → `CancelBookingModal.tsx:107-136` → `POST /api/notify` (client-side)
- **Modify** → `EditBookingModal.tsx:564-622` → `POST /api/notify` (client-side)

**Integration Strategy:**
- Extend `/api/notify` to dual-write (LINE + database)
- Single point of integration for all notification types
- No changes to existing trigger points
- Maintains all current LINE functionality

**Notification Persistence**

Create a `notifications` table in the `public` schema:

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT REFERENCES public.bookings(id),
  type TEXT CHECK (type IN ('created','cancelled','modified')) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB, -- Structure TBD during implementation
  customer_id TEXT REFERENCES public.customers(customer_code),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  booking_date DATE,
  booking_time TEXT,
  bay TEXT,
  acknowledged_by UUID REFERENCES backoffice.staff(id),
  acknowledged_at TIMESTAMPTZ,
  internal_notes TEXT, -- Staff can add notes for context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  line_notification_sent BOOLEAN DEFAULT FALSE, -- Track LINE delivery
  line_notification_error TEXT -- Store LINE failure details for retry
);

-- Performance indexes
CREATE INDEX idx_notifications_booking_created ON notifications(booking_id, created_at DESC);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(read) WHERE read = false;

-- Full-text search index for notes and message
CREATE INDEX idx_notifications_search ON notifications USING gin(
  to_tsvector('english', coalesce(message, '') || ' ' || coalesce(internal_notes, '') || ' ' || coalesce(customer_name, ''))
);
```

**Row Level Security (RLS)**

```sql
-- All authenticated staff can see all notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all notifications"
  ON public.notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM backoffice.staff
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can update notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM backoffice.staff
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true); -- Allow inserts from API (authenticated context)
```

**Acknowledgment**
- Each notification must be individually acknowledged
- Record `acknowledged_by` (staff UUID) and `acknowledged_at` (timestamp)
- Acknowledgment in one browser tab syncs to all open tabs via Supabase Realtime

**Frontend Delivery**

- **Notification Bell Icon**
  - Location: All pages, next to logout button in header
  - Badge shows unread count (cached, periodic refresh every 30 seconds)
  - Audible ping on new notification (except for super admins: David, Chris Rall)
  - Browser notification permission requested on first app load

- **Dropdown Panel**
  - Shows latest **5** notifications
  - Each entry: type icon, message preview, timestamp, customer info
  - Allow acknowledgment directly from dropdown
  - "View All" link to full log page

- **Full Notification Log Page** (`/notifications`)
  - Paginated list of all notifications (no retention limit)
  - Filters: date range, type (created/cancelled/modified), read/unread
  - Search: Customer names, booking IDs, phone numbers, notes content
  - **No "Mark all as read"** — acknowledge individually
  - Show acknowledgment info: who acknowledged, when
  - Add/edit internal notes inline
  - Notes visible to all staff and searchable

**Realtime Updates**

- Use Supabase Realtime (Postgres → WebSocket)
- Push new notifications instantly to connected clients
- Sync acknowledgments across multiple tabs
- Cache unread count with periodic refresh (every 30 seconds)

**Message Formatting**

**Do NOT reuse LINE formatting functions** (no emojis). Create clean, text-based notification messages:

```typescript
// Example notification messages (no emojis)

// New Booking
"New Booking: [Customer Name]
Date: [Day, Date Month]
Time: [Start] - [End]
Bay: [Bay Number]
Type: [Booking Type]
Pax: [Number]
Created by: [Staff Name]"

// Cancelled Booking
"Booking Cancelled: [Customer Name]
Date: [Day, Date Month]
Time: [Start] - [End]
Bay: [Bay Number]
Cancelled by: [Staff Name]
Reason: [Optional]"

// Modified Booking
"Booking Modified: [Customer Name]
Changes: [List of changes]
Modified by: [Staff Name]"
```

**Dual Delivery Implementation**

Extend `/api/notify` endpoint to:
1. Parse incoming LINE message to extract booking details
2. Format clean notification message (no emojis)
3. Insert into `notifications` table
4. Send to LINE via existing logic (unchanged)
5. If LINE fails:
   - Set `line_notification_sent = false`
   - Store error in `line_notification_error`
   - In-app notification still succeeds
6. Return success/failure status

**Integration with Existing Flow**

```
Current Flow:
submit-handler.ts → POST /api/notify → LINE

Enhanced Flow:
submit-handler.ts → POST /api/notify → [Insert DB] + [Send LINE]
                                     ↓
                              Supabase Realtime
                                     ↓
                              All Connected Clients
```

### Non-Functional Requirements

- **Performance**: Notifications appear in <2 seconds for logged-in users
- **Security**:
  - Respect existing auth rules via RLS policies
  - All authenticated staff can see all notifications
  - Super admins excluded from audible pings
- **Reliability**: If LINE fails, in-app notifications still succeed
- **Scalability**: Handle 1,000+ notifications/day
- **Retention**: No limit, keep all notifications indefinitely
- **Search Performance**: Full-text search across message and notes

---

## 6. UX/UI

**Notification Bell Icon**

- Location: All pages, top nav, next to logout button
- Unread count badge (red background)
- Click to open dropdown
- Audible ping on new notification (excludes David, Chris Rall)
- Browser notification permission requested on app load

**Dropdown Panel**

- Shows latest **5** notifications
- Each entry displays:
  - Type icon (CalendarPlus/CalendarX/CalendarClock)
  - Type badge (New Booking/Cancelled/Modified)
  - Customer name
  - Booking details (date, time, bay)
  - Timestamp (relative: "5 minutes ago")
  - "Mark as Read" button (if unread)
- "View All Notifications" link at bottom
- Allow acknowledgment from dropdown

**Full Log Page (`/notifications`)**

- Page header: "Notification Log" with Bell icon
- Unread count badge
- Filters card:
  - Search input (searches all fields)
  - Type filter dropdown
  - Status filter dropdown (all/unread/acknowledged)
- Notifications list:
  - Each notification shows:
    - Type icon and badge
    - Customer name
    - Booking details
    - Timestamp
    - "Mark as Read" button OR "Acknowledged" badge
    - Internal notes section (add/edit inline)
    - LINE delivery status with retry button if failed
  - Unread notifications highlighted with left border
- Pagination controls (if >20 notifications)

**Notes Feature**

- Click "Add Notes" to expand textarea
- Save notes to database
- All staff can see and search notes
- Shows who added/edited notes with timestamp

---

## 7. Technical Design

**Backend**

- **Extend `/api/notify`** to dual-write (LINE + database) - PRIMARY INTEGRATION POINT
- Create `/api/notifications` GET endpoint with filters and search
- Create `/api/notifications/:id/acknowledge` POST endpoint
- Create `/api/notifications/:id/notes` PUT endpoint
- Create `/api/notifications/:id/retry-line` POST endpoint for retry functionality

**Database**

- Add `notifications` table in `public` schema with RLS
- Indexes for performance (created_at, unread, search)
- Reference `backoffice.staff(id)` for acknowledgments
- Store customer snapshot data for display (name, phone, date, time, bay)

**Frontend**

- React context provider for notifications state (`NotificationsProvider`)
- Connect to Supabase Realtime channel for `notifications` table
- Components:
  - `NotificationBell` - Bell icon with badge
  - `NotificationDropdown` - Latest 5 notifications
  - `NotificationLog` - Full page component at `/notifications`
  - `NotificationItem` - Reusable notification display
  - `NotesEditor` - Inline notes add/edit
- Audible ping sound file (find standard notification sound)
- Browser notifications API integration
- Super admin detection for ping exclusion (check email against whitelist)

**Error Handling**

- Log LINE API failures in `line_notification_error` field
- Never block in-app notification insertion
- Provide retry mechanism for failed LINE notifications
- Display error state in notification log

**Multi-Tab Synchronization**

- Supabase Realtime subscriptions in all tabs
- Acknowledgment in one tab updates all tabs
- Cache unread count with 30-second refresh

---

## 8. API Contract Changes (Tech-Ready)

**Modified: POST /api/notify** (EXISTING ENDPOINT - ENHANCED)

Enhanced to dual-write (LINE + database).

Request (unchanged):
```json
{
  "message": "LINE formatted message with emojis",
  "bookingType": "Coaching (Boss)",
  "customer_notes": "Optional notes"
}
```

New Response:
```json
{
  "success": true,
  "lineNotificationSent": true,
  "notificationId": "uuid-123",
  "error": null
}
```

**NEW: GET /api/notifications**

Query notifications with filters and search.

Request:
```
GET /api/notifications?type=created&status=unread&search=john&page=1&limit=20
```

Response:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "booking_id": "BK123",
      "type": "created|cancelled|modified",
      "message": "Clean text message (no emojis)",
      "metadata": {},
      "customer_id": "CUST001",
      "customer_name": "John Doe",
      "customer_phone": "0812345678",
      "booking_date": "2025-01-15",
      "booking_time": "14:00",
      "bay": "Bay 1",
      "acknowledged_by": "staff-uuid|null",
      "acknowledged_at": "timestamp|null",
      "internal_notes": "text|null",
      "created_at": "timestamp",
      "read": true|false,
      "line_notification_sent": true|false,
      "line_notification_error": "error text|null"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "unreadCount": 12
}
```

**NEW: POST /api/notifications/:id/acknowledge**

Mark notification as acknowledged by current user.

Request:
```json
POST /api/notifications/uuid-123/acknowledge
```

Response:
```json
{
  "success": true,
  "acknowledged_by": "staff-uuid",
  "acknowledged_at": "2025-01-15T10:30:00Z"
}
```

**NEW: PUT /api/notifications/:id/notes**

Add or update internal notes.

Request:
```json
{
  "notes": "Customer requested window seat"
}
```

Response:
```json
{
  "success": true,
  "internal_notes": "Customer requested window seat",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

**NEW: POST /api/notifications/:id/retry-line**

Retry failed LINE notification.

Request:
```json
POST /api/notifications/uuid-123/retry-line
```

Response:
```json
{
  "success": true,
  "line_notification_sent": true
}
```

**Realtime**

- Supabase Realtime channel: `public:notifications`
- Emits on INSERT and UPDATE
- All connected clients receive updates

---

## 9. Success Metrics

- **99.9%** of booking lifecycle events generate an in-app notification
- Notifications appear in <2 seconds
- Staff/admin acknowledgment tracked with timestamp
- 90% of staff report reduced reliance on LINE
- Search returns results in <500ms
- LINE retry success rate >95%

---

## 10. Priority 0 Features (Included in Initial Release)

- ✅ Browser notifications (permission requested on app load)
- ✅ Audible ping on notification (except super admins)
- ✅ Internal staff notes (searchable, all staff visible)
- ✅ Dropdown acknowledgment (latest 5, allow mark as read)
- ✅ LINE retry mechanism (button in log)
- ✅ Comprehensive search (names, IDs, phones, notes)

---

## 11. Future Enhancements (P1)

- 🔮 Customer profile links in notifications
- 🔮 Notification priority levels
- 🔮 Email digests of unacknowledged notifications
- 🔮 Notification preferences per staff member
- 🔮 Bulk operations (export, archive)

---

## 12. Implementation Notes

**Integration Strategy (FINALIZED)**

All notifications flow through `/api/notify`:
- **Booking Creation:** Server-side trigger (`submit-handler.ts:282-297`)
- **Booking Cancellation:** Client-side trigger (`CancelBookingModal.tsx:107-136`)
- **Booking Modification:** Client-side trigger (`EditBookingModal.tsx:564-622`)

**Single Point Integration:**
- Extend `/api/notify` to dual-write (LINE + database)
- Parse LINE message to extract booking data
- Format clean notification message (no emojis)
- Insert into `notifications` table
- Continue sending to LINE (unchanged)
- Handle LINE failures gracefully

**Technical Details:**
- Reference `backoffice.staff(id)` for user IDs
- All staff see all notifications
- No retention limit on notifications
- Cache unread count, refresh every 30 seconds
- Find standard notification ping sound
- Exclude super admins from audible alerts (email whitelist: david@, chrisrall@)
- No emojis in notification messages

**Message Parsing Strategy:**
- Extract booking ID from LINE message (regex: `Booking ID: (BK[A-Z0-9]+)` or `ID: (BK[A-Z0-9]+)`)
- Extract customer name, phone, date, time, bay from LINE message
- Detect notification type from message content (keywords: "New Booking", "CANCELLED", "MODIFIED")
- Fallback to bookingType parameter if needed

---

## 13. Database Schema Summary

```sql
-- Key fields for quick reference
id: UUID (primary key)
booking_id: TEXT (references bookings)
type: 'created'|'cancelled'|'modified'
message: TEXT (clean, no emojis)
customer_name: TEXT (extracted from booking)
customer_phone: TEXT (for search)
booking_date: DATE (for filtering)
booking_time: TEXT (for display)
bay: TEXT (for filtering)
acknowledged_by: UUID (backoffice.staff)
acknowledged_at: TIMESTAMPTZ
internal_notes: TEXT (searchable)
read: BOOLEAN
line_notification_sent: BOOLEAN
line_notification_error: TEXT
created_at: TIMESTAMPTZ
```

---

## End of PRD
