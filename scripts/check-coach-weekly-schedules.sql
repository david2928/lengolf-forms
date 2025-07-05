-- Check Coach Weekly Schedules Data
-- Run these queries in Supabase SQL Editor

-- Query 1: Get all coach weekly schedules
SELECT * FROM coach_weekly_schedules ORDER BY coach_id, day_of_week;

-- Query 2: Count schedules by coach
SELECT coach_id, COUNT(*) as schedule_count 
FROM coach_weekly_schedules 
GROUP BY coach_id;

-- Query 3: Get all coaches from allowed_users
SELECT id, email, coach_name, coach_display_name, is_coach, is_active_coach 
FROM backoffice.allowed_users 
WHERE is_coach = true;

-- Query 4: Check which coaches have schedules vs which don't
WITH coaches AS (
  SELECT id, email, coach_name, coach_display_name, coach_code
  FROM backoffice.allowed_users 
  WHERE is_coach = true AND is_active_coach = true
),
schedules AS (
  SELECT coach_id, COUNT(*) as schedule_count
  FROM coach_weekly_schedules
  GROUP BY coach_id
)
SELECT 
  c.coach_code,
  c.coach_display_name,
  c.email,
  COALESCE(s.schedule_count, 0) as schedule_count,
  CASE 
    WHEN s.schedule_count > 0 THEN 'Has Schedule'
    ELSE 'No Schedule'
  END as status
FROM coaches c
LEFT JOIN schedules s ON c.id = s.coach_id
ORDER BY c.coach_display_name;

-- Query 5: Show detailed schedule for coaches who have data
SELECT 
  au.coach_code,
  au.coach_display_name,
  cws.day_of_week,
  CASE cws.day_of_week
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day_name,
  cws.start_time,
  cws.end_time,
  cws.is_available
FROM backoffice.allowed_users au
JOIN coach_weekly_schedules cws ON au.id = cws.coach_id
WHERE au.is_coach = true
ORDER BY au.coach_display_name, cws.day_of_week;

-- Query 6: Check if the view exists
SELECT * FROM coach_schedules_by_code;