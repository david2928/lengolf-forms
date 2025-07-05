-- Setup Missing Coach Schedules
-- This script will add weekly schedules for coaches who don't have any data

-- First, check which coaches need schedules
WITH coaches_without_schedules AS (
  SELECT id, coach_name, coach_display_name, coach_code
  FROM backoffice.allowed_users 
  WHERE is_coach = true 
  AND is_active_coach = true
  AND id NOT IN (
    SELECT DISTINCT coach_id FROM coach_weekly_schedules
  )
)
SELECT * FROM coaches_without_schedules;

-- If the set_coach_availability function doesn't exist, create it
CREATE OR REPLACE FUNCTION set_coach_availability(
  p_coach_code TEXT,
  p_day_of_week INTEGER,
  p_start_time TIME,
  p_end_time TIME,
  p_is_available BOOLEAN DEFAULT true
) RETURNS void AS $$
DECLARE
  v_coach_id UUID;
BEGIN
  -- Get coach ID from coach code
  SELECT id INTO v_coach_id
  FROM backoffice.allowed_users
  WHERE UPPER(coach_code) = UPPER(p_coach_code)
  AND is_coach = true
  AND is_active_coach = true;
  
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Coach with code % not found or not active', p_coach_code;
  END IF;
  
  -- Insert or update schedule
  INSERT INTO coach_weekly_schedules (coach_id, day_of_week, start_time, end_time, is_available)
  VALUES (v_coach_id, p_day_of_week, p_start_time, p_end_time, p_is_available)
  ON CONFLICT (coach_id, day_of_week) 
  DO UPDATE SET 
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    is_available = EXCLUDED.is_available,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Set up schedules for each coach based on their typical availability
-- Adjust these based on actual coach schedules

-- BOSS (Ratchavin) - Already has data, but included for completeness
-- Monday-Friday 9:00-17:00
SELECT set_coach_availability('BOSS', 1, '09:00', '17:00'); -- Monday
SELECT set_coach_availability('BOSS', 2, '09:00', '17:00'); -- Tuesday
SELECT set_coach_availability('BOSS', 3, '09:00', '17:00'); -- Wednesday
SELECT set_coach_availability('BOSS', 4, '09:00', '17:00'); -- Thursday
SELECT set_coach_availability('BOSS', 5, '09:00', '17:00'); -- Friday

-- NOON - Example schedule Monday/Wednesday/Friday 10:00-16:00
SELECT set_coach_availability('NOON', 1, '10:00', '16:00'); -- Monday
SELECT set_coach_availability('NOON', 3, '10:00', '16:00'); -- Wednesday
SELECT set_coach_availability('NOON', 5, '10:00', '16:00'); -- Friday

-- ALSON - Example schedule Tuesday/Thursday/Saturday 11:00-17:00
SELECT set_coach_availability('ALSON', 2, '11:00', '17:00'); -- Tuesday
SELECT set_coach_availability('ALSON', 4, '11:00', '17:00'); -- Thursday
SELECT set_coach_availability('ALSON', 6, '11:00', '17:00'); -- Saturday

-- Add more coaches as needed based on their coach_code values
-- You can find all coach codes with:
-- SELECT coach_code, coach_display_name FROM backoffice.allowed_users WHERE is_coach = true AND is_active_coach = true;

-- Verify the schedules were created
SELECT 
  au.coach_code,
  au.coach_display_name,
  COUNT(cws.id) as days_scheduled
FROM backoffice.allowed_users au
LEFT JOIN coach_weekly_schedules cws ON au.id = cws.coach_id
WHERE au.is_coach = true AND au.is_active_coach = true
GROUP BY au.coach_code, au.coach_display_name
ORDER BY au.coach_display_name;