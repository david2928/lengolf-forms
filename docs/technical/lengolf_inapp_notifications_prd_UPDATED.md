# PRD: In-App Notifications & Notification Log for LENGOLF Forms (Tech-Ready - UPDATED)

## 1. Overview

Extend booking-related notifications from LINE to **in-app notifications within LENGOLF Forms**, including:
- **New booking notifications**
- **Cancelled booking notifications**
- **Modified booking notifications**

The system will also include:
- **Persistent notification log** with timestamps for acknowledgment and internal staff notes
- **Browser notifications + audible ping** when the LENGOLF Forms app is open
- ~~Direct links to customer profiles from each notification~~ (Moved to future enhancement)

LINE notifications remain active.

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

**Trigger Points**
Hook into existing booking lifecycle events:
- **Create** → Active (submit-handler.ts → /api/bookings/create → /api/notify)
- **Cancel** → ⚠️ TBD: Re-enable server-side trigger (currently commented out)
- **Modify** → ⚠️ TBD: Re-enable server-side trigger (currently commented out)

> **Note:** Clarification needed on cancel/modify trigger approach. See open questions.

**Notification Persistence**

Create a `notifications` table in the `public` schema:

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT REFERENCES public.bookings(id),
  type TEXT CHECK (type IN ('created','cancelled','modified')),
  message TEXT NOT NULL,
  metadata JSONB, -- Structure TBD during implementation
  customer_id TEXT REFERENCES public.customers(customer_code),
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
  to_tsvector('english', coalesce(message, '') || ' ' || coalesce(internal_notes, ''))
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

CREATE POLICY "Staff can update notifications they acknowledge"
  ON public.notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM backoffice.staff
      WHERE id = auth.uid()
    )
  );
```

**Acknowledgment**
- Each notification must be individually acknowledged
- Record `acknowledged_by` (staff UUID) and `acknowledged_at` (timestamp)
- Acknowledgment in one browser tab syncs to all open tabs via Supabase Realtime

**Frontend Delivery**

- **Notification Bell Icon**
  - Location: All pages, next to logout button in header
  - Badge shows unread count (cached, periodic refresh)
  - Audible ping on new notification (except for super admins: David, Chris Rall)
  - Browser notification permission requested on first app load

- **Dropdown Panel**
  - Shows latest **5** notifications (updated from 10)
  - Each entry: type icon, message, timestamp, customer info
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

- **Do NOT reuse LINE formatting functions** (no emojis)
- Create clean, text-based notification messages:

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

**Dual Delivery**

- Store notification in `notifications` table
- Send to LINE via existing `/api/notify` endpoint (unchanged)
- If LINE fails:
  - Set `line_notification_sent = false`
  - Store error in `line_notification_error`
  - Show "Retry" button in notification log
  - In-app notification still succeeds

**Integration with Existing API**

- Reuse `/api/notify` endpoint for LINE delivery
- Extend `/api/notify` to also insert into `notifications` table
- Keep LINE notifications active

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

- Extend `/api/notify` to dual-write (LINE + database)
- Create `/api/notifications` GET endpoint with filters and search
- Create `/api/notifications/:id/acknowledge` POST endpoint
- Create `/api/notifications/:id/notes` PUT endpoint
- Create `/api/notifications/:id/retry-line` POST endpoint for retry functionality
- ⚠️ Clarify approach for cancel/modify triggers (see open questions)

**Database**

- Add `notifications` table in `public` schema with RLS
- Indexes for performance (created_at, unread, search)
- Reference `backoffice.staff(id)` for acknowledgments
- No package_id field needed

**Frontend**

- React context provider for notifications state
- Connect to Supabase Realtime channel for `notifications` table
- Components:
  - `NotificationBell` - Bell icon with badge
  - `NotificationDropdown` - Latest 5 notifications
  - `NotificationLog` - Full page component at `/notifications`
  - `NotificationItem` - Reusable notification display
  - `NotesEditor` - Inline notes add/edit
- Audible ping sound file (find standard notification sound)
- Browser notifications API integration
- Super admin detection for ping exclusion

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

**GET /api/notifications**

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
  }
}
```

**POST /api/notifications/:id/acknowledge**

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

**PUT /api/notifications/:id/notes**

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

**POST /api/notifications/:id/retry-line**

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

## 12. Open Questions / TBD

### ⚠️ Question 4: Cancel/Modify Server-Side Triggers

Currently, LINE notifications for cancel and modify are **commented out** in:
- `app/api/bookings/[bookingId]/cancel/route.ts:187-215`
- `app/api/bookings/[bookingId]/route.ts:618-649`

Comments indicate these were "MOVED TO CLIENT-SIDE."

**Needs clarification:**
1. Where is the client-side code currently triggering these notifications?
2. Should we uncomment the server-side code and extend it?
3. Or implement fresh server-side logic?

### Metadata Structure

To be determined during implementation. Possible structure:
```json
{
  "triggered_by": "staff_name",
  "old_values": { "bay": "Bay 1", "time": "10:00" },
  "new_values": { "bay": "Bay 2", "time": "11:00" },
  "booking_type": "coaching"
}
```

---

## 13. Implementation Notes

- Use existing `/api/notify` endpoint as integration point
- No emojis in notification messages
- Reference `backoffice.staff(id)` for user IDs
- All staff see all notifications
- No retention limit on notifications
- Cache unread count, refresh every 30 seconds
- Find standard notification ping sound
- Exclude super admins from audible alerts
