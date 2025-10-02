-- In-App Notifications System: Create public.notifications table
-- NOTIF-001: Database Schema Implementation
-- Related PRD: docs/technical/lengolf_inapp_notifications_prd.md

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- Purpose: Store in-app notifications for booking lifecycle events
-- Trigger Points: /api/notify endpoint (create, cancel, modify bookings)
-- Realtime: Enabled for live updates across all connected clients
-- ============================================================================

CREATE TABLE public.notifications (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Booking Reference
  booking_id TEXT REFERENCES public.bookings(id) ON DELETE SET NULL,

  -- Notification Type
  type TEXT NOT NULL CHECK (type IN ('created', 'cancelled', 'modified')),

  -- Message Content
  message TEXT NOT NULL, -- Clean, emoji-free notification text

  -- Metadata (flexible JSON for future enhancements)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Customer Information Snapshot (for quick display without joins)
  customer_id TEXT REFERENCES public.customers(customer_code) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,

  -- Booking Details Snapshot (for quick display and filtering)
  booking_date DATE,
  booking_time TEXT, -- HH:mm format
  bay TEXT, -- Bay 1, Bay 2, Bay 3, Bay 4, or NULL

  -- Acknowledgment Tracking
  acknowledged_by INTEGER REFERENCES backoffice.staff(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  read BOOLEAN DEFAULT FALSE,

  -- Internal Staff Notes (collaborative annotation)
  internal_notes TEXT,
  notes_updated_by INTEGER REFERENCES backoffice.staff(id) ON DELETE SET NULL,
  notes_updated_at TIMESTAMPTZ,

  -- LINE Integration Status
  line_notification_sent BOOLEAN DEFAULT FALSE,
  line_notification_error TEXT, -- Store error details for retry

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Primary query pattern: Get recent notifications ordered by creation time
CREATE INDEX idx_notifications_created_at
  ON public.notifications(created_at DESC);

-- Filter unread notifications
CREATE INDEX idx_notifications_unread
  ON public.notifications(read)
  WHERE read = false;

-- Find notifications by booking
CREATE INDEX idx_notifications_booking_created
  ON public.notifications(booking_id, created_at DESC);

-- Filter by notification type
CREATE INDEX idx_notifications_type
  ON public.notifications(type);

-- Filter by date range
CREATE INDEX idx_notifications_booking_date
  ON public.notifications(booking_date);

-- Full-text search across message, notes, and customer name
CREATE INDEX idx_notifications_search
  ON public.notifications
  USING gin(
    to_tsvector(
      'english',
      coalesce(message, '') || ' ' ||
      coalesce(internal_notes, '') || ' ' ||
      coalesce(customer_name, '')
    )
  );

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can view all notifications
-- Note: Authentication handled at API layer (NextAuth), service_role used for queries
CREATE POLICY "Authenticated users can view notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy 2: Authenticated users can update notifications (acknowledge, add notes)
-- Note: Authentication handled at API layer (NextAuth), service_role used for queries
CREATE POLICY "Authenticated users can update notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy 3: System can insert notifications (via service role from API)
-- This policy allows the API to insert notifications on behalf of the system
CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.notifications IS
  'In-app notifications for booking lifecycle events (create, cancel, modify). Integrated with LINE messaging as dual-delivery system.';

COMMENT ON COLUMN public.notifications.type IS
  'Notification type: created (new booking), cancelled (booking cancelled), modified (booking updated)';

COMMENT ON COLUMN public.notifications.message IS
  'Clean notification message without emojis, formatted for in-app display';

COMMENT ON COLUMN public.notifications.metadata IS
  'Flexible JSON field for storing additional context (e.g., who triggered the action, old vs new values)';

COMMENT ON COLUMN public.notifications.customer_name IS
  'Snapshot of customer name at time of notification (denormalized for performance)';

COMMENT ON COLUMN public.notifications.internal_notes IS
  'Staff-added notes for collaboration and context. Searchable via full-text index.';

COMMENT ON COLUMN public.notifications.line_notification_sent IS
  'TRUE if LINE notification was successfully sent, FALSE if failed or not attempted';

COMMENT ON COLUMN public.notifications.line_notification_error IS
  'Error message if LINE notification failed (used for retry mechanism)';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users (via RLS policies)
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;

-- Grant full access to service role (for API operations)
GRANT ALL ON public.notifications TO service_role;

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================

-- Enable Realtime replication for this table
-- Note: This must also be enabled in Supabase dashboard under Database > Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================================
-- INITIAL DATA / SEED (None required)
-- ============================================================================

-- No seed data needed - notifications are created dynamically by the system
