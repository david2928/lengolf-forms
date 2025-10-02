# In-App Notifications System - Technical Implementation Plan

**Epic:** In-App Notification System for Booking Events
**Project:** LENGOLF Forms
**Status:** Ready for Development
**Estimated Total:** 21 Story Points (1 Sprint)

---

## 📋 Epic Overview

Replace reliance on LINE for internal booking notifications by implementing a comprehensive in-app notification system with real-time updates, acknowledgment tracking, and searchable audit log.

**Business Value:**
- Reduce dependency on external messaging platform (LINE)
- Improve staff accountability with acknowledgment tracking
- Enable better notification management and search
- Maintain LINE notifications as backup channel

---

## 🎯 Sprint Planning

### Sprint Goals
1. Database foundation and API infrastructure (Stories 1-3)
2. Core notification delivery system (Stories 4-5)
3. Frontend UI components (Stories 6-8)
4. Testing and deployment (Story 9)

### Story Dependencies
```
Story 1 (Database) → Story 2 (Message Parser) → Story 4 (API Notify)
Story 3 (API Endpoints) → Story 6 (Context Provider) → Story 7 (UI Components)
Story 5 (Realtime) → Story 6 (Context Provider)
Stories 1-7 → Story 8 (Testing) → Story 9 (Deployment)
```

---

## 📝 User Stories

### **Story 1: Database Schema & Migrations**
**Story Points:** 2
**Priority:** P0
**Assignee:** Backend Developer

#### Description
Create the `notifications` table in Supabase with proper indexes, RLS policies, and migration scripts.

#### Acceptance Criteria
- [ ] Migration script creates `public.notifications` table with all specified fields
- [ ] Three indexes created (booking_created, created_at, unread)
- [ ] Full-text search GIN index created for message, notes, customer_name
- [ ] RLS policies implemented (staff can view all, update own, system can insert)
- [ ] Migration tested on dev environment
- [ ] Rollback script created and tested

#### Technical Tasks
1. Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_create_notifications_table.sql`
2. Define table schema with all fields from PRD section 5
3. Add CHECK constraint for notification type ('created', 'cancelled', 'modified')
4. Create three standard indexes
5. Create GIN index for full-text search
6. Write RLS policies for staff access
7. Test migration up/down on local Supabase
8. Document schema in codebase

#### SQL Preview
```sql
-- See PRD section 5 for complete schema
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT REFERENCES public.bookings(id),
  type TEXT CHECK (type IN ('created','cancelled','modified')) NOT NULL,
  message TEXT NOT NULL,
  -- ... other fields
);

CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(read) WHERE read = false;
-- ... other indexes
```

#### Definition of Done
- Migration runs successfully in dev/staging
- All indexes exist and improve query performance
- RLS policies verified with test staff accounts
- Documentation added to `/docs/database/`

---

### **Story 2: Message Parser Utility**
**Story Points:** 2
**Priority:** P0
**Assignee:** Backend Developer

#### Description
Create utility functions to parse LINE-formatted messages and extract booking data for clean notification messages.

#### Acceptance Criteria
- [ ] Utility function extracts booking ID from LINE message
- [ ] Utility function extracts customer name, phone, date, time, bay
- [ ] Utility function detects notification type (created/cancelled/modified)
- [ ] Clean message formatter creates emoji-free notification text
- [ ] All three message types (create/cancel/modify) handled
- [ ] Unit tests cover edge cases and malformed input

#### Technical Tasks
1. Create file: `src/lib/notification-parser.ts`
2. Implement `extractBookingId(lineMessage: string): string | null`
3. Implement `extractBookingData(lineMessage: string): BookingData`
4. Implement `detectNotificationType(lineMessage: string): NotificationType`
5. Implement `formatCleanNotification(data: BookingData, type: NotificationType): string`
6. Handle emoji removal and text cleaning
7. Write unit tests for all functions
8. Add JSDoc documentation

#### Code Structure
```typescript
// src/lib/notification-parser.ts

export interface BookingData {
  bookingId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  date: string | null;
  time: string | null;
  bay: string | null;
  // ... other fields
}

export type NotificationType = 'created' | 'cancelled' | 'modified';

export function extractBookingId(lineMessage: string): string | null {
  // Regex: Booking ID: (BK[A-Z0-9]+) or ID: (BK[A-Z0-9]+)
}

export function extractBookingData(lineMessage: string): BookingData {
  // Parse LINE message sections
}

export function detectNotificationType(lineMessage: string): NotificationType {
  // Check for keywords: "New Booking", "CANCELLED", "MODIFIED"
}

export function formatCleanNotification(
  data: BookingData,
  type: NotificationType
): string {
  // Return clean, emoji-free message
}
```

#### Test Cases
- Valid LINE messages for all three types
- Malformed messages with missing fields
- Edge cases: special characters, unicode, long names
- Empty or null inputs

#### Definition of Done
- All parser functions implemented and exported
- 100% test coverage on parser logic
- Edge cases handled gracefully
- Documentation added with usage examples

---

### **Story 3: Notification API Endpoints**
**Story Points:** 3
**Priority:** P0
**Assignee:** Backend Developer

#### Description
Create new API endpoints for querying notifications, acknowledging them, managing notes, and retrying LINE failures.

#### Acceptance Criteria
- [ ] `GET /api/notifications` with filtering, search, pagination
- [ ] `POST /api/notifications/:id/acknowledge` marks notification as read
- [ ] `PUT /api/notifications/:id/notes` updates internal notes
- [ ] `POST /api/notifications/:id/retry-line` retries failed LINE send
- [ ] All endpoints respect RLS policies
- [ ] All endpoints validate input
- [ ] All endpoints return proper error codes
- [ ] API tests cover happy path and error cases

#### Technical Tasks

**1. GET /api/notifications**
- File: `app/api/notifications/route.ts`
- Query params: type, status, search, page, limit, dateFrom, dateTo
- Implement full-text search using PostgreSQL GIN index
- Paginate results (default 20 per page)
- Return unread count in response
- Handle auth via existing middleware

**2. POST /api/notifications/:id/acknowledge**
- File: `app/api/notifications/[id]/acknowledge/route.ts`
- Get current staff user from session
- Update notification set acknowledged_by, acknowledged_at, read=true
- Return updated notification
- Handle already-acknowledged case (idempotent)

**3. PUT /api/notifications/:id/notes**
- File: `app/api/notifications/[id]/notes/route.ts`
- Validate notes length (max 5000 chars)
- Update internal_notes field
- Return updated notification

**4. POST /api/notifications/:id/retry-line**
- File: `app/api/notifications/[id]/retry-line/route.ts`
- Fetch notification with LINE error
- Reconstruct LINE message from database fields
- Call LINE API
- Update line_notification_sent, clear error on success
- Return result

#### API Contracts
See PRD Section 8 for complete request/response schemas.

#### Definition of Done
- All four endpoints implemented and tested
- Proper error handling (400, 401, 404, 500)
- Input validation on all user-provided data
- Integration tests pass
- API documented in `/docs/api/`

---

### **Story 4: Extend /api/notify for Dual-Write**
**Story Points:** 3
**Priority:** P0
**Assignee:** Backend Developer

#### Description
Enhance existing `/api/notify` endpoint to insert notifications into database while continuing to send LINE messages.

#### Acceptance Criteria
- [ ] `/api/notify` parses incoming LINE message
- [ ] Booking data extracted using parser utility
- [ ] Clean notification message formatted (no emojis)
- [ ] Record inserted into notifications table
- [ ] LINE message sent via existing logic (unchanged)
- [ ] If LINE fails, in-app notification still succeeds
- [ ] LINE failure tracked in notification record
- [ ] Response includes notification ID and LINE status
- [ ] Existing callers (create/cancel/modify) work unchanged

#### Technical Tasks
1. Read current implementation: `app/api/notify/route.ts`
2. Import notification parser from Story 2
3. Add database insert logic before LINE send
4. Wrap LINE send in try-catch
5. Track LINE success/failure in notification record
6. Update response payload
7. Add logging for debugging
8. Test with all three trigger points:
   - `submit-handler.ts` (booking create)
   - `CancelBookingModal.tsx` (booking cancel)
   - `EditBookingModal.tsx` (booking modify)

#### Implementation Flow
```typescript
// app/api/notify/route.ts (enhanced)

export async function POST(req: Request) {
  const { message, bookingType, customer_notes } = await req.json();

  // 1. Parse LINE message
  const bookingData = extractBookingData(message);
  const notificationType = detectNotificationType(message);
  const cleanMessage = formatCleanNotification(bookingData, notificationType);

  // 2. Insert into notifications table
  const { data: notification, error: dbError } = await supabase
    .from('notifications')
    .insert({
      booking_id: bookingData.bookingId,
      type: notificationType,
      message: cleanMessage,
      customer_name: bookingData.customerName,
      customer_phone: bookingData.customerPhone,
      // ... other fields
    })
    .select()
    .single();

  if (dbError) {
    console.error('Failed to insert notification:', dbError);
    // Continue to LINE send anyway
  }

  // 3. Send LINE notification (existing logic)
  let lineSuccess = false;
  let lineError = null;

  try {
    await sendLineMessage(message, bookingType, customer_notes);
    lineSuccess = true;
  } catch (error) {
    console.error('LINE send failed:', error);
    lineError = error.message;
  }

  // 4. Update notification with LINE status
  if (notification) {
    await supabase
      .from('notifications')
      .update({
        line_notification_sent: lineSuccess,
        line_notification_error: lineError
      })
      .eq('id', notification.id);
  }

  // 5. Return result
  return NextResponse.json({
    success: true,
    lineNotificationSent: lineSuccess,
    notificationId: notification?.id,
    error: lineError
  });
}
```

#### Testing Checklist
- [ ] Create booking triggers notification insert + LINE send
- [ ] Cancel booking triggers notification insert + LINE send
- [ ] Modify booking triggers notification insert + LINE send
- [ ] LINE failure still creates in-app notification
- [ ] Notification appears in database immediately
- [ ] Existing LINE groups receive messages unchanged

#### Definition of Done
- Dual-write logic implemented and tested
- All three trigger points verified working
- LINE failure handling tested
- No regressions in existing LINE functionality
- Code reviewed and merged

---

### **Story 5: Supabase Realtime Integration**
**Story Points:** 2
**Priority:** P0
**Assignee:** Full-stack Developer

#### Description
Enable Supabase Realtime for notifications table and implement WebSocket subscriptions for live updates.

#### Acceptance Criteria
- [ ] Realtime enabled for `public.notifications` table in Supabase
- [ ] INSERT events trigger realtime broadcast
- [ ] UPDATE events (acknowledgment, notes) trigger realtime broadcast
- [ ] Subscription helper created for frontend use
- [ ] Connection handling (reconnect on disconnect)
- [ ] Multiple tabs receive updates
- [ ] Performance acceptable (<100ms latency)

#### Technical Tasks
1. Enable Realtime in Supabase dashboard for `notifications` table
2. Create `src/lib/notifications-realtime.ts` helper
3. Implement subscription setup function
4. Implement event handler types
5. Handle connection lifecycle (connect, disconnect, error)
6. Add reconnection logic with exponential backoff
7. Test multi-tab synchronization
8. Document Realtime usage for team

#### Code Structure
```typescript
// src/lib/notifications-realtime.ts

import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface NotificationEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  old: any;
  new: any;
}

export function subscribeToNotifications(
  onInsert: (notification: any) => void,
  onUpdate: (notification: any) => void
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel('public:notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      },
      (payload) => onInsert(payload.new)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications'
      },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();

  return channel;
}

export function unsubscribe(channel: RealtimeChannel) {
  channel.unsubscribe();
}
```

#### Testing Approach
- Create notification in one tab, verify it appears in another tab
- Acknowledge in one tab, verify badge updates in other tabs
- Test with network interruption (disable/enable wifi)
- Load test with 10+ notifications in rapid succession

#### Definition of Done
- Realtime enabled and working
- Subscription helper implemented
- Multi-tab sync verified
- Connection resilience tested
- Documentation added

---

### **Story 6: Notifications Context Provider**
**Story Points:** 3
**Priority:** P0
**Assignee:** Frontend Developer

#### Description
Create React Context provider to manage notifications state, Realtime subscriptions, and unread count caching.

#### Acceptance Criteria
- [ ] Context provider manages notifications state
- [ ] Subscribes to Realtime channel on mount
- [ ] Fetches initial notifications on load
- [ ] Maintains unread count with 30-second refresh
- [ ] Exposes acknowledge, addNotes functions
- [ ] Handles loading and error states
- [ ] Provider wraps app layout
- [ ] TypeScript types defined

#### Technical Tasks
1. Create `src/contexts/NotificationsContext.tsx`
2. Define context shape and TypeScript interfaces
3. Implement state management (useState/useReducer)
4. Fetch initial notifications from API
5. Set up Realtime subscription
6. Implement unread count caching with interval
7. Expose helper functions (acknowledge, refresh, addNotes)
8. Add error handling and retry logic
9. Wrap app in provider (`app/layout.tsx`)
10. Create `useNotifications()` hook for consumers

#### Code Structure
```typescript
// src/contexts/NotificationsContext.tsx

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  acknowledgeNotification: (id: string) => Promise<void>;
  addNotes: (id: string, notes: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch initial notifications
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Set up Realtime subscription
  useEffect(() => {
    const channel = subscribeToNotifications(
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        // Trigger browser notification
        // Play sound (if not super admin)
      },
      (updatedNotification) => {
        setNotifications(prev =>
          prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
        );
        // Update unread count if acknowledgment changed
      }
    );

    return () => unsubscribe(channel);
  }, []);

  // Refresh unread count every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function acknowledgeNotification(id: string) {
    // Call API, update local state
  }

  async function addNotes(id: string, notes: string) {
    // Call API, update local state
  }

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      isLoading,
      error,
      acknowledgeNotification,
      addNotes,
      refreshNotifications
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within NotificationsProvider');
  return context;
}
```

#### Testing Tasks
- Test initial load
- Test Realtime insert/update
- Test acknowledgment flow
- Test multi-tab sync
- Test error handling

#### Definition of Done
- Context provider implemented
- Realtime subscriptions working
- Unread count cached and refreshed
- All helper functions working
- Provider wrapped around app
- Tests passing

---

### **Story 7: Frontend UI Components**
**Story Points:** 5
**Priority:** P0
**Assignee:** Frontend Developer

#### Description
Build all UI components: NotificationBell, NotificationDropdown, NotificationLog page, and supporting components.

#### Acceptance Criteria
- [ ] NotificationBell component with badge (unread count)
- [ ] NotificationDropdown shows latest 5, allows acknowledgment
- [ ] Full NotificationLog page at `/notifications` with filters
- [ ] NotificationItem component (reusable)
- [ ] Notes editor (inline add/edit)
- [ ] Browser notification permission prompt
- [ ] Audible ping on new notification (except super admins)
- [ ] All components match design spec
- [ ] Responsive design (mobile + desktop)
- [ ] Accessibility (ARIA labels, keyboard navigation)

#### Component Breakdown

**1. NotificationBell (1 SP)**
- File: `src/components/notifications/NotificationBell.tsx`
- Shows bell icon (Lucide React)
- Badge with unread count
- Click opens dropdown
- Position: Next to logout button in header

**2. NotificationDropdown (1.5 SP)**
- File: `src/components/notifications/NotificationDropdown.tsx`
- Latest 5 notifications
- Type icon + badge (CalendarPlus/X/Clock)
- Customer name, booking details
- Relative timestamp ("5 mins ago")
- "Mark as Read" button
- "View All" link to `/notifications`
- Empty state ("No notifications")

**3. NotificationLog Page (2 SP)**
- File: `app/notifications/page.tsx`
- Header with title + unread badge
- Filters card (search, type, status)
- Paginated notification list
- Each notification: icon, badge, details, acknowledge button, notes
- Empty state
- Pagination controls

**4. NotificationItem (0.5 SP)**
- File: `src/components/notifications/NotificationItem.tsx`
- Reusable component for dropdown + page
- Props: variant ('dropdown' | 'page')
- Conditional rendering based on variant
- Type-specific icon and badge

**5. Browser Notification & Sound (1 SP)**
- File: `src/lib/browser-notifications.ts`
- Request permission on app load
- Show browser notification on new alert
- Play sound file (find standard ping sound)
- Check super admin status (whitelist: david@, chrisrall@)

#### Design Spec Reference
See `docs/technical/Notifications_design_spec` (JSON) for complete component specifications.

#### Technical Tasks
1. Create component directory structure
2. Build NotificationBell with dropdown trigger
3. Build NotificationDropdown with latest 5
4. Create NotificationLog page with filters
5. Build reusable NotificationItem
6. Implement notes editor (textarea + save/cancel)
7. Add browser notification logic
8. Find and integrate notification sound file
9. Implement super admin detection
10. Add route `/notifications` to menu items
11. Style all components (Tailwind CSS)
12. Test responsive behavior
13. Add accessibility features

#### Notification Sound
- Find royalty-free notification sound (subtle, short ~0.5s)
- Place in `public/sounds/notification.mp3`
- Play using HTML5 Audio API

#### Definition of Done
- All components built and styled
- Components match design spec
- Responsive on mobile/tablet/desktop
- Accessibility tested
- Browser notifications working
- Sound playing correctly
- Super admin exclusion working

---

### **Story 8: Integration Testing & Bug Fixes**
**Story Points:** 2
**Priority:** P0
**Assignee:** QA + Developer

#### Description
Comprehensive end-to-end testing of the notification system, covering all user flows and edge cases.

#### Acceptance Criteria
- [ ] All three booking events (create/cancel/modify) trigger notifications
- [ ] Notifications appear in real-time (<2 seconds)
- [ ] Browser notifications display correctly
- [ ] Sound plays on new notification (not for super admins)
- [ ] Acknowledgment syncs across tabs
- [ ] Search works with all fields
- [ ] Filters work correctly
- [ ] Pagination works
- [ ] LINE continues working unchanged
- [ ] LINE failures tracked and retryable
- [ ] No console errors
- [ ] Performance acceptable

#### Test Scenarios

**Functional Tests**
1. Create booking → notification appears in dropdown + page
2. Cancel booking → cancellation notification appears
3. Modify booking → modification notification appears
4. Acknowledge in dropdown → badge updates immediately
5. Acknowledge in page → updates in all tabs
6. Add notes → saves and searchable
7. Search by customer name → finds notification
8. Filter by type → shows only that type
9. Filter by status → unread vs acknowledged
10. Pagination → navigate through pages
11. LINE retry → retries and updates status

**Realtime Tests**
12. Two tabs open → notification in tab A appears in tab B
13. Acknowledge in tab A → badge updates in tab B
14. Network disconnect → reconnects and syncs

**Edge Cases**
15. Malformed LINE message → notification still created
16. LINE API down → in-app notification succeeds
17. Super admin user → no sound plays
18. Empty notifications list → shows empty state
19. Very long customer name → truncates gracefully
20. 100+ notifications → pagination works

**Performance Tests**
21. 10 notifications in 5 seconds → all appear without lag
22. Search with 1000+ notifications → results < 500ms
23. Page load with 50+ unread → loads < 3 seconds

#### Bug Fix Process
- Document bugs in tracking system
- Prioritize: P0 (blocking), P1 (important), P2 (nice-to-have)
- Fix P0 bugs before deployment
- Fix P1 bugs in same sprint if time allows
- Defer P2 to next sprint

#### Definition of Done
- All test scenarios pass
- All P0 bugs fixed
- All P1 bugs fixed or documented
- Performance targets met
- No regressions in existing features

---

### **Story 9: Production Deployment & Monitoring**
**Story Points:** 1
**Priority:** P0
**Assignee:** DevOps + Backend Developer

#### Description
Deploy notification system to production with proper monitoring, rollback plan, and documentation.

#### Acceptance Criteria
- [ ] Database migration run on production
- [ ] Realtime enabled in production Supabase
- [ ] Frontend deployed to production
- [ ] Rollback plan documented and tested
- [ ] Monitoring alerts configured
- [ ] Error logging configured
- [ ] Documentation updated
- [ ] Team training completed

#### Deployment Steps

**Pre-Deployment**
1. Verify all tests pass on staging
2. Run migration on staging first
3. Smoke test on staging
4. Create deployment checklist
5. Schedule deployment window (low-traffic time)
6. Notify team of deployment

**Deployment**
1. Create database backup
2. Run migration on production Supabase
3. Verify migration success
4. Enable Realtime for notifications table
5. Deploy backend changes (API routes)
6. Deploy frontend changes (Vercel)
7. Clear CDN cache if needed
8. Smoke test production

**Post-Deployment**
1. Monitor error rates for 1 hour
2. Check notification creation for each booking type
3. Verify Realtime subscriptions working
4. Test acknowledgment flow
5. Monitor database performance
6. Check LINE notifications still working

**Rollback Plan** (if issues found)
1. Revert frontend deployment (Vercel rollback)
2. Revert API changes (git revert + redeploy)
3. Disable Realtime on table (optional)
4. Rollback database migration (down script)

#### Monitoring Setup
```yaml
# Alerts to configure

- name: Notification Insert Failure Rate
  condition: >5% of /api/notify calls fail to insert notification
  action: Alert engineering team

- name: Realtime Connection Drops
  condition: >10% of active connections drop in 5 minutes
  action: Alert engineering team

- name: LINE Failure Rate
  condition: >20% of LINE sends fail
  action: Alert engineering team

- name: API Response Time
  condition: /api/notifications avg response time >1s
  action: Alert engineering team
```

#### Documentation Tasks
1. Update `/docs/features/NOTIFICATIONS.md`
2. Update `/docs/api/API_REFERENCE.md`
3. Update `/docs/database/` with new table
4. Create troubleshooting guide
5. Record deployment notes

#### Team Training
- Demo notification system to team
- Explain acknowledgment workflow
- Show how to search and filter
- Demonstrate notes feature
- Explain LINE retry for failures

#### Definition of Done
- Deployed to production successfully
- All smoke tests pass
- Monitoring configured
- Rollback plan tested
- Documentation complete
- Team trained

---

## 📊 Success Metrics Tracking

After deployment, track these metrics weekly:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Notification Delivery Rate | 99.9% | `SELECT COUNT(*) FROM notifications` vs booking events |
| Average Delivery Time | <2 seconds | Log timestamps: booking event → notification insert |
| Staff Acknowledgment Rate | >80% | `SELECT COUNT(*) WHERE acknowledged_by IS NOT NULL` |
| Search Performance | <500ms | Monitor API response time for `/api/notifications` |
| LINE Retry Success Rate | >95% | Track successful retries vs total failures |
| Staff Satisfaction | 90% report reduced LINE reliance | Post-deployment survey after 2 weeks |

---

## 🚨 Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Realtime connection issues | Medium | High | Implement reconnection logic with backoff, fallback to polling |
| Database performance degradation | Low | High | Proper indexes, monitor query performance, add caching |
| Browser notification blocked | High | Low | Show in-app notification regardless, educate users |
| LINE API changes break integration | Low | Medium | Maintain LINE as secondary channel, monitor error rates |
| Migration failure in production | Low | High | Test on staging first, have rollback script ready |

---

## 📅 Timeline Estimate

**Sprint Duration:** 2 weeks (10 working days)

**Week 1:**
- Days 1-2: Stories 1-2 (Database + Parser)
- Days 3-4: Story 3 (API Endpoints)
- Day 5: Story 4 (Extend /api/notify)

**Week 2:**
- Days 6-7: Stories 5-6 (Realtime + Context)
- Days 8-9: Story 7 (UI Components)
- Day 10: Stories 8-9 (Testing + Deployment)

**Buffer:** Built into each story's point estimate

---

## ✅ Checklist Before Starting

- [ ] PRD reviewed and approved
- [ ] Design spec reviewed
- [ ] Team capacity confirmed
- [ ] Supabase project access verified
- [ ] Development environment set up
- [ ] Staging environment available
- [ ] All dependencies documented
- [ ] Questions answered
- [ ] Sprint committed

---

## 📚 Reference Documents

- PRD: `/docs/technical/lengolf_inapp_notifications_prd.md`
- Design Spec: `/docs/technical/Notifications_design_spec`
- API Reference: `/docs/api/API_REFERENCE.md`
- Database Docs: `/docs/database/`
- LINE Integration: `/docs/integrations/LINE_MESSAGING_INTEGRATION.md`

---

## 🎉 Definition of Epic Done

- All 9 stories completed and deployed
- Production system stable for 48 hours
- No P0 bugs reported
- Success metrics tracking implemented
- Team trained and confident using system
- Documentation complete
- Post-deployment review conducted

---

**End of Implementation Plan**
