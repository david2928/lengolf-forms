-- Test script to check if availability tables exist and have data
-- Run this in your Supabase SQL editor

-- Check if tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('coach_weekly_schedules', 'coach_recurring_blocks', 'coach_date_overrides')
ORDER BY table_name;

-- Check coach_weekly_schedules data
SELECT 
  'Weekly Schedules' as table_name,
  coach_id,
  day_of_week,
  start_time,
  end_time,
  is_available
FROM coach_weekly_schedules
LIMIT 5;

-- Check coach_recurring_blocks data  
SELECT 
  'Recurring Blocks' as table_name,
  coach_id,
  day_of_week,
  start_time,
  end_time
FROM coach_recurring_blocks
LIMIT 5;

-- Check coach_date_overrides data
SELECT 
  'Date Overrides' as table_name,
  coach_id,
  override_date,
  override_type,
  start_time,
  end_time
FROM coach_date_overrides
LIMIT 5;

-- Check which coaches exist in allowed_users
SELECT 
  'Available Coaches' as table_name,
  id,
  coach_name,
  coach_display_name,
  is_coach,
  is_active_coach
FROM backoffice.allowed_users
WHERE is_coach = true;

-- Sample query to see if data is properly linked
SELECT 
  au.coach_display_name,
  cws.day_of_week,
  cws.start_time,
  cws.end_time,
  cws.is_available
FROM backoffice.allowed_users au
LEFT JOIN coach_weekly_schedules cws ON au.id = cws.coach_id
WHERE au.is_coach = true
ORDER BY au.coach_display_name, cws.day_of_week;