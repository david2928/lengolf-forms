-- In-App Notifications System: ROLLBACK MIGRATION
-- NOTIF-001-ROLLBACK: Remove notifications table and all related objects
-- Related PRD: docs/technical/lengolf_inapp_notifications_prd.md
--
-- IMPORTANT: Only run this migration if you need to completely remove
-- the notifications system. This will delete all notification data.
--
-- Usage:
--   psql -U postgres -d your_database -f 20250102000001_rollback_notifications_table.sql
--

-- ============================================================================
-- ROLLBACK: DROP OBJECTS IN REVERSE ORDER OF CREATION
-- ============================================================================

-- Remove from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.notifications;

-- Revoke permissions
REVOKE ALL ON public.notifications FROM authenticated;
REVOKE ALL ON public.notifications FROM service_role;

-- Drop RLS policies
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can view all notifications" ON public.notifications;

-- Disable RLS
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;

-- Drop trigger
DROP TRIGGER IF EXISTS set_notifications_updated_at ON public.notifications;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_notifications_updated_at();

-- Drop indexes (will be automatically dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS public.idx_notifications_search;
DROP INDEX IF EXISTS public.idx_notifications_booking_date;
DROP INDEX IF EXISTS public.idx_notifications_type;
DROP INDEX IF EXISTS public.idx_notifications_booking_created;
DROP INDEX IF EXISTS public.idx_notifications_unread;
DROP INDEX IF EXISTS public.idx_notifications_created_at;

-- Drop the main table (CASCADE to handle any dependencies)
DROP TABLE IF EXISTS public.notifications CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that table no longer exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
  ) THEN
    RAISE EXCEPTION 'ERROR: notifications table still exists after rollback';
  ELSE
    RAISE NOTICE 'SUCCESS: notifications table has been removed';
  END IF;
END $$;
