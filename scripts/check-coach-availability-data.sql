-- Comprehensive Coach Availability Data Check
-- Run this script in Supabase SQL Editor to check the current state of coach availability

-- 1. Check if coach_availability table exists and its structure
SELECT 
    'coach_availability table structure' as query_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'backoffice' 
AND table_name = 'coach_availability'
ORDER BY ordinal_position;

-- 2. Check if coach_availability_slots table exists
SELECT 
    'Table existence check' as query_type,
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_name LIKE '%coach%availability%'
ORDER BY table_schema, table_name;

-- 3. Check data in coach_availability table
SELECT 
    'coach_availability data' as query_type,
    ca.*,
    au.coach_name,
    au.coach_display_name,
    au.coach_code
FROM backoffice.coach_availability ca
LEFT JOIN backoffice.allowed_users au ON ca.coach_email = au.email
ORDER BY ca.coach_email, ca.availability_type, ca.day_of_week, ca.specific_date
LIMIT 20;

-- 4. Count records by availability type
SELECT 
    'coach_availability count by type' as query_type,
    availability_type,
    COUNT(*) as record_count
FROM backoffice.coach_availability
GROUP BY availability_type
ORDER BY availability_type;

-- 5. Count total records
SELECT 
    'Total coach_availability records' as query_type,
    COUNT(*) as total_records
FROM backoffice.coach_availability;

-- 6. Check if coach_weekly_schedules table exists (from the other script)
SELECT 
    'coach_weekly_schedules existence' as query_type,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'coach_weekly_schedules'
    ) as table_exists;

-- 7. If coach_weekly_schedules exists, check its data
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'coach_weekly_schedules'
    ) THEN
        RAISE NOTICE 'coach_weekly_schedules table exists';
        -- This would need dynamic SQL to actually query it
    ELSE
        RAISE NOTICE 'coach_weekly_schedules table does NOT exist';
    END IF;
END $$;

-- 8. Check all coaches and their availability status
SELECT 
    'Coach availability summary' as query_type,
    au.id,
    au.email,
    au.coach_name,
    au.coach_display_name,
    au.coach_code,
    au.is_coach,
    au.is_active_coach,
    COUNT(ca.id) as availability_records
FROM backoffice.allowed_users au
LEFT JOIN backoffice.coach_availability ca ON au.email = ca.coach_email
WHERE au.is_coach = true
GROUP BY au.id, au.email, au.coach_name, au.coach_display_name, au.coach_code, au.is_coach, au.is_active_coach
ORDER BY au.coach_name;

-- 9. Check recurring availability by coach
SELECT 
    'Recurring availability by coach' as query_type,
    au.coach_display_name,
    au.coach_code,
    ca.day_of_week,
    CASE ca.day_of_week
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name,
    ca.start_time,
    ca.end_time,
    ca.is_available
FROM backoffice.coach_availability ca
JOIN backoffice.allowed_users au ON ca.coach_email = au.email
WHERE ca.availability_type = 'recurring'
AND au.is_coach = true
ORDER BY au.coach_display_name, ca.day_of_week;

-- 10. Check date-specific overrides
SELECT 
    'Date-specific overrides' as query_type,
    au.coach_display_name,
    au.coach_code,
    ca.specific_date,
    ca.specific_time_start,
    ca.specific_time_end,
    ca.is_available,
    ca.notes
FROM backoffice.coach_availability ca
JOIN backoffice.allowed_users au ON ca.coach_email = au.email
WHERE ca.availability_type IN ('date_specific', 'slot_override')
AND au.is_coach = true
ORDER BY ca.specific_date DESC
LIMIT 20;

-- 11. Check recurring blocks (lunch breaks, etc.)
SELECT 
    'Recurring blocks' as query_type,
    au.coach_display_name,
    au.coach_code,
    ca.day_of_week,
    ca.start_time,
    ca.end_time,
    ca.notes
FROM backoffice.coach_availability ca
JOIN backoffice.allowed_users au ON ca.coach_email = au.email
WHERE ca.availability_type = 'recurring_block'
AND au.is_coach = true
ORDER BY au.coach_display_name, ca.day_of_week, ca.start_time;

-- 12. Sample query to get available slots for a specific coach on a specific date
-- This shows how the availability system should work
WITH target_date AS (
    SELECT CURRENT_DATE as check_date
),
coach_info AS (
    SELECT 
        id,
        email,
        coach_display_name,
        coach_code
    FROM backoffice.allowed_users
    WHERE coach_code = 'BOSS' -- Change this to test different coaches
    AND is_coach = true
    AND is_active_coach = true
)
SELECT 
    'Sample availability check for BOSS today' as query_type,
    ci.coach_display_name,
    ci.coach_code,
    td.check_date,
    EXTRACT(DOW FROM td.check_date) as day_of_week,
    ca.start_time,
    ca.end_time,
    ca.is_available,
    ca.availability_type,
    ca.notes
FROM coach_info ci
CROSS JOIN target_date td
LEFT JOIN backoffice.coach_availability ca ON (
    ca.coach_email = ci.email
    AND (
        -- Recurring availability for this day of week
        (ca.availability_type = 'recurring' AND ca.day_of_week = EXTRACT(DOW FROM td.check_date))
        OR
        -- Date-specific availability
        (ca.availability_type IN ('date_specific', 'slot_override') AND ca.specific_date = td.check_date)
        OR
        -- Recurring blocks for this day of week
        (ca.availability_type = 'recurring_block' AND ca.day_of_week = EXTRACT(DOW FROM td.check_date))
    )
)
ORDER BY ca.start_time;