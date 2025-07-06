-- Payroll Feature Database Schema Rollback
-- Story #1: Database Schema Setup - ROLLBACK SCRIPT
-- Undoes all payroll-related database changes

-- WARNING: This will permanently delete all payroll data
-- Make sure to backup data before running this script

-- ============================================
-- 1. REMOVE INDEXES (in reverse order)
-- ============================================

DROP INDEX IF EXISTS backoffice.idx_staff_service_charge_eligible;
DROP INDEX IF EXISTS backoffice.idx_staff_compensation_active;
DROP INDEX IF EXISTS backoffice.idx_staff_compensation_staff_effective;
DROP INDEX IF EXISTS backoffice.idx_public_holidays_active;
DROP INDEX IF EXISTS backoffice.idx_public_holidays_date;
DROP INDEX IF EXISTS backoffice.idx_time_entries_staff_timestamp;
DROP INDEX IF EXISTS backoffice.idx_time_entries_timestamp_staff;

-- ============================================
-- 2. REMOVE COLUMN FROM STAFF TABLE
-- ============================================

ALTER TABLE backoffice.staff 
DROP COLUMN IF EXISTS is_service_charge_eligible;

-- ============================================
-- 3. DROP TABLES (in reverse dependency order)
-- ============================================

DROP TABLE IF EXISTS backoffice.monthly_service_charge;
DROP TABLE IF EXISTS backoffice.payroll_settings;
DROP TABLE IF EXISTS backoffice.staff_compensation;
DROP TABLE IF EXISTS backoffice.public_holidays;

-- ============================================
-- 4. VERIFICATION QUERIES
-- ============================================

-- Verify table removal
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'backoffice' 
AND tablename IN ('public_holidays', 'staff_compensation', 'payroll_settings', 'monthly_service_charge')
ORDER BY tablename;

-- Verify indexes removal
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'backoffice' 
AND (indexname LIKE 'idx_%payroll%' OR indexname LIKE 'idx_%public_holidays%' OR indexname LIKE 'idx_%staff_compensation%' OR indexname LIKE 'idx_%service_charge%' OR indexname LIKE 'idx_%time_entries%')
ORDER BY tablename, indexname;

-- Verify column removal
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'backoffice' 
AND table_name = 'staff' 
AND column_name = 'is_service_charge_eligible';

-- ============================================
-- ROLLBACK COMPLETE
-- ============================================

COMMENT ON SCHEMA backoffice IS 'Payroll schema rollback completed'; 