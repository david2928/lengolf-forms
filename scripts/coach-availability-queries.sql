-- Coach Availability Specific Queries
-- Run these queries in Supabase SQL Editor

-- Query 1: Get latest 20 coach availability records
SELECT * 
FROM backoffice.coach_availability 
ORDER BY created_at DESC 
LIMIT 20;

-- Query 2: Count records by availability type and coach email
SELECT 
    COUNT(*) as total, 
    availability_type, 
    coach_email 
FROM backoffice.coach_availability 
GROUP BY availability_type, coach_email
ORDER BY coach_email, availability_type;

-- Query 3: Get all coaches from allowed_users
SELECT 
    email, 
    name, 
    is_coach 
FROM backoffice.allowed_users 
WHERE is_coach = true
ORDER BY name;

-- Query 4: Get distinct coach emails from coach_availability
SELECT DISTINCT coach_email 
FROM backoffice.coach_availability
ORDER BY coach_email;

-- Additional useful queries:

-- Query 5: Compare coaches in allowed_users vs coach_availability
WITH coaches_in_allowed_users AS (
    SELECT email, name, coach_name, coach_display_name, coach_code
    FROM backoffice.allowed_users 
    WHERE is_coach = true
),
coaches_in_availability AS (
    SELECT DISTINCT coach_email 
    FROM backoffice.coach_availability
)
SELECT 
    'Coaches with availability data' as status,
    au.*,
    CASE WHEN ca.coach_email IS NOT NULL THEN 'Has availability data' ELSE 'No availability data' END as availability_status
FROM coaches_in_allowed_users au
LEFT JOIN coaches_in_availability ca ON au.email = ca.coach_email
ORDER BY au.name;

-- Query 6: Summary of availability by coach and type
SELECT 
    ca.coach_email,
    au.coach_display_name,
    au.coach_code,
    ca.availability_type,
    COUNT(*) as record_count,
    MIN(ca.created_at) as first_created,
    MAX(ca.created_at) as last_created
FROM backoffice.coach_availability ca
LEFT JOIN backoffice.allowed_users au ON ca.coach_email = au.email
GROUP BY ca.coach_email, au.coach_display_name, au.coach_code, ca.availability_type
ORDER BY ca.coach_email, ca.availability_type;