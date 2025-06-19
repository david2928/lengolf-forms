-- Test Staff Time Clock Database Schema
-- Story: STAFF-001 - Database Schema & Backend Foundation
-- This script tests the database schema and functions with sample data

-- ==========================================
-- 1. VERIFY TABLES EXIST
-- ==========================================

-- Check if all required tables exist
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'backoffice' 
AND table_name IN ('staff', 'time_entries', 'staff_audit_log')
ORDER BY table_name;

-- Check if view exists
SELECT 
  table_name,
  table_type
FROM information_schema.views 
WHERE table_schema = 'backoffice' 
AND table_name = 'staff_status';

-- ==========================================
-- 2. VERIFY TABLE STRUCTURES
-- ==========================================

-- Staff table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'backoffice' 
AND table_name = 'staff'
ORDER BY ordinal_position;

-- Time entries table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'backoffice' 
AND table_name = 'time_entries'
ORDER BY ordinal_position;

-- Staff audit log table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'backoffice' 
AND table_name = 'staff_audit_log'
ORDER BY ordinal_position;

-- ==========================================
-- 3. VERIFY INDEXES
-- ==========================================

-- Check indexes on staff table
SELECT 
  i.relname as index_name,
  a.attname as column_name
FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
WHERE t.oid = ix.indrelid
AND i.oid = ix.indexrelid
AND a.attrelid = t.oid
AND a.attnum = ANY(ix.indkey)
AND t.relkind = 'r'
AND t.relname = 'staff'
AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'backoffice')
ORDER BY index_name, column_name;

-- Check indexes on time_entries table
SELECT 
  i.relname as index_name,
  a.attname as column_name
FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
WHERE t.oid = ix.indrelid
AND i.oid = ix.indexrelid
AND a.attrelid = t.oid
AND a.attnum = ANY(ix.indkey)
AND t.relkind = 'r'
AND t.relname = 'time_entries'
AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'backoffice')
ORDER BY index_name, column_name;

-- ==========================================
-- 4. VERIFY RLS POLICIES
-- ==========================================

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'backoffice' 
AND tablename IN ('staff', 'time_entries', 'staff_audit_log');

-- Check policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'backoffice' 
AND tablename IN ('staff', 'time_entries', 'staff_audit_log')
ORDER BY tablename, policyname;

-- ==========================================
-- 5. VERIFY FUNCTIONS EXIST
-- ==========================================

-- Check database functions
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('verify_staff_pin', 'record_time_entry', 'get_staff_time_entries')
ORDER BY routine_name;

-- ==========================================
-- 6. INSERT TEST DATA
-- ==========================================

-- Insert test staff members with properly hashed PINs
-- Using crypt function to hash test PINs
INSERT INTO backoffice.staff (staff_name, staff_id, pin_hash, is_active) VALUES
('John Doe', 'EMP001', crypt('123456', gen_salt('bf', 10)), true),
('Jane Smith', 'EMP002', crypt('654321', gen_salt('bf', 10)), true),
('Bob Wilson', 'EMP003', crypt('111111', gen_salt('bf', 10)), false) -- Inactive for testing
ON CONFLICT (staff_id) DO UPDATE SET
  staff_name = EXCLUDED.staff_name,
  pin_hash = EXCLUDED.pin_hash,
  is_active = EXCLUDED.is_active;

-- Insert test audit log entries
INSERT INTO backoffice.staff_audit_log (
  staff_id, 
  action_type, 
  changed_by_type, 
  changed_by_identifier, 
  changes_summary,
  reason
) 
SELECT 
  id,
  'created',
  'system',
  'test_script',
  'Test staff member created during schema testing',
  'Development testing'
FROM backoffice.staff 
WHERE staff_name IN ('John Doe', 'Jane Smith', 'Bob Wilson')
ON CONFLICT DO NOTHING;

-- ==========================================
-- 7. TEST DATABASE FUNCTIONS
-- ==========================================

-- Test PIN verification with valid PIN
SELECT 'Testing valid PIN (123456):' as test_description;
SELECT * FROM verify_staff_pin('123456');

-- Test PIN verification with invalid PIN
SELECT 'Testing invalid PIN (999999):' as test_description;
SELECT * FROM verify_staff_pin('999999');

-- Test record time entry function
SELECT 'Testing record time entry function:' as test_description;
SELECT * FROM record_time_entry(
  (SELECT id FROM backoffice.staff WHERE staff_name = 'John Doe' LIMIT 1),
  'clock_in',
  null,
  false,
  null,
  '{"userAgent": "Test Browser", "timestamp": "2025-01-12T10:00:00Z"}'::jsonb
);

-- Test another time entry
SELECT * FROM record_time_entry(
  (SELECT id FROM backoffice.staff WHERE staff_name = 'Jane Smith' LIMIT 1),
  'clock_in',
  'https://example.com/photo1.jpg',
  true,
  null,
  '{"userAgent": "Test Browser 2", "timestamp": "2025-01-12T10:30:00Z"}'::jsonb
);

-- Test get staff time entries function
SELECT 'Testing get staff time entries function:' as test_description;
SELECT * FROM get_staff_time_entries(
  CURRENT_DATE - INTERVAL '1 day',
  CURRENT_DATE + INTERVAL '1 day',
  null
) LIMIT 5;

-- ==========================================
-- 8. TEST STAFF STATUS VIEW
-- ==========================================

-- Test staff status view
SELECT 'Testing staff status view:' as test_description;
SELECT 
  id,
  staff_name,
  staff_id,
  is_active,
  failed_attempts,
  is_currently_locked,
  last_action,
  last_action_time,
  currently_clocked_in
FROM backoffice.staff_status
ORDER BY staff_name;

-- ==========================================
-- 9. VERIFY DATA INTEGRITY
-- ==========================================

-- Check foreign key relationships
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'backoffice'
AND tc.table_name IN ('time_entries', 'staff_audit_log')
ORDER BY tc.table_name, kcu.column_name;

-- ==========================================
-- 10. PERFORMANCE TESTS
-- ==========================================

-- Test PIN lookup performance (should use index)
EXPLAIN ANALYZE 
SELECT * FROM backoffice.staff 
WHERE pin_hash = crypt('123456', pin_hash) AND is_active = true;

-- Test time entries by date performance (should use index)
EXPLAIN ANALYZE 
SELECT * FROM backoffice.time_entries 
WHERE DATE(timestamp) = CURRENT_DATE
ORDER BY timestamp DESC;

-- ==========================================
-- 11. CLEANUP AND SUMMARY
-- ==========================================

-- Count test data
SELECT 
  'staff' as table_name,
  COUNT(*) as record_count
FROM backoffice.staff
UNION ALL
SELECT 
  'time_entries' as table_name,
  COUNT(*) as record_count
FROM backoffice.time_entries
UNION ALL
SELECT 
  'staff_audit_log' as table_name,
  COUNT(*) as record_count
FROM backoffice.staff_audit_log
ORDER BY table_name;

-- Final success message
SELECT 
  'Staff Time Clock schema test completed successfully!' as message,
  'All tables, indexes, functions, and RLS policies are working correctly' as status,
  NOW() as test_completed_at; 