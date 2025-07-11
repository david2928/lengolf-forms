-- Check Table Structure and Data Types
-- This checks for potential schema issues that could cause payroll calculations to fail

-- ============================================
-- 1. CHECK TIME_ENTRIES TABLE STRUCTURE
-- ============================================

SELECT 
    'time_entries table structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name = 'clock_in_time' AND data_type = 'timestamp with time zone' THEN '✅ Correct'
        WHEN column_name = 'clock_out_time' AND data_type = 'timestamp with time zone' THEN '✅ Correct'
        WHEN column_name = 'staff_id' AND data_type = 'integer' THEN '✅ Correct'
        WHEN column_name = 'entry_type' AND data_type = 'text' THEN '✅ Correct'
        ELSE '⚠️ Check'
    END as status
FROM information_schema.columns
WHERE table_schema = 'backoffice' 
AND table_name = 'time_entries'
AND column_name IN ('clock_in_time', 'clock_out_time', 'staff_id', 'entry_type')
ORDER BY column_name;

-- ============================================
-- 2. CHECK STAFF_COMPENSATION TABLE STRUCTURE
-- ============================================

SELECT 
    'staff_compensation table structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name = 'staff_id' AND data_type = 'integer' THEN '✅ Correct'
        WHEN column_name = 'base_salary' AND data_type = 'numeric' THEN '✅ Correct'
        WHEN column_name = 'ot_rate_per_hour' AND data_type = 'numeric' THEN '✅ Correct'
        WHEN column_name = 'holiday_rate_per_hour' AND data_type = 'numeric' THEN '✅ Correct'
        WHEN column_name = 'is_service_charge_eligible' AND data_type = 'boolean' THEN '✅ Correct'
        ELSE '⚠️ Check'
    END as status
FROM information_schema.columns
WHERE table_schema = 'backoffice' 
AND table_name = 'staff_compensation'
AND column_name IN ('staff_id', 'base_salary', 'ot_rate_per_hour', 'holiday_rate_per_hour', 'is_service_charge_eligible')
ORDER BY column_name;

-- ============================================
-- 3. CHECK STAFF TABLE STRUCTURE
-- ============================================

SELECT 
    'staff table structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name = 'is_service_charge_eligible' AND data_type = 'boolean' THEN '✅ Column exists'
        ELSE '⚠️ Check'
    END as status
FROM information_schema.columns
WHERE table_schema = 'backoffice' 
AND table_name = 'staff'
AND column_name = 'is_service_charge_eligible';

-- ============================================
-- 4. CHECK FOR ORPHANED TIME ENTRIES
-- ============================================

SELECT 
    'Orphaned Time Entries Check' as check_type,
    COUNT(*) as orphaned_entries,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned entries'
        ELSE '❌ Found orphaned entries - this could cause issues'
    END as status
FROM backoffice.time_entries te
LEFT JOIN backoffice.staff s ON te.staff_id = s.id
WHERE s.id IS NULL;

-- ============================================
-- 5. CHECK FOR INCOMPLETE TIME ENTRIES
-- ============================================

SELECT 
    'Incomplete Time Entries Check' as check_type,
    COUNT(*) as entries_without_clockout,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All entries have clock-out'
        ELSE '⚠️ Some entries missing clock-out (may affect calculations)'
    END as status
FROM backoffice.time_entries
WHERE DATE_TRUNC('month', clock_in_time AT TIME ZONE 'Asia/Bangkok') = '2025-05-01'::date
AND entry_type = 'clock_in'
AND (clock_out_time IS NULL OR clock_out_time = clock_in_time);

-- ============================================
-- 6. CHECK TIME ENTRY TYPES
-- ============================================

SELECT 
    'Time Entry Types Check' as check_type,
    entry_type,
    COUNT(*) as entry_count,
    CASE 
        WHEN entry_type IN ('clock_in', 'clock_out') THEN '✅ Valid type'
        ELSE '❌ Invalid entry type'
    END as status
FROM backoffice.time_entries
WHERE DATE_TRUNC('month', clock_in_time AT TIME ZONE 'Asia/Bangkok') = '2025-05-01'::date
GROUP BY entry_type
ORDER BY entry_type;

-- ============================================
-- 7. CHECK FOR TIMEZONE ISSUES
-- ============================================

SELECT 
    'Timezone Issues Check' as check_type,
    COUNT(*) as entries_with_timezone_issues,
    MIN(clock_in_time) as earliest_timestamp,
    MAX(clock_out_time) as latest_timestamp,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Time entries exist'
        ELSE '❌ No time entries found'
    END as status
FROM backoffice.time_entries
WHERE DATE_TRUNC('month', clock_in_time AT TIME ZONE 'Asia/Bangkok') = '2025-05-01'::date;

-- ============================================
-- 8. CHECK FOR DUPLICATE ENTRIES
-- ============================================

WITH duplicate_check AS (
    SELECT 
        staff_id,
        clock_in_time,
        COUNT(*) as duplicate_count
    FROM backoffice.time_entries
    WHERE DATE_TRUNC('month', clock_in_time AT TIME ZONE 'Asia/Bangkok') = '2025-05-01'::date
    AND entry_type = 'clock_in'
    GROUP BY staff_id, clock_in_time
    HAVING COUNT(*) > 1
)
SELECT 
    'Duplicate Entries Check' as check_type,
    COUNT(*) as duplicate_groups,
    SUM(duplicate_count) as total_duplicates,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No duplicates'
        ELSE '❌ Found duplicates - this could cause calculation errors'
    END as status
FROM duplicate_check; 