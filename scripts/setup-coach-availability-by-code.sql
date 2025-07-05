-- Setup Coach Availability using Coach Codes (not IDs)
-- This is much easier and less error-prone!

-- Function to set coach availability by coach code
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

-- Example: Set up Boss's schedule for Monday-Friday 9-17
SELECT set_coach_availability('BOSS', 1, '09:00', '17:00'); -- Monday
SELECT set_coach_availability('BOSS', 2, '09:00', '17:00'); -- Tuesday
SELECT set_coach_availability('BOSS', 3, '09:00', '17:00'); -- Wednesday
SELECT set_coach_availability('BOSS', 4, '09:00', '17:00'); -- Thursday
SELECT set_coach_availability('BOSS', 5, '09:00', '17:00'); -- Friday

-- Example: Set up Noon's schedule for Mon/Wed/Fri 10-16
SELECT set_coach_availability('NOON', 1, '10:00', '16:00'); -- Monday
SELECT set_coach_availability('NOON', 3, '10:00', '16:00'); -- Wednesday
SELECT set_coach_availability('NOON', 5, '10:00', '16:00'); -- Friday

-- Example: Set up Ratchavin's schedule for Tue/Thu/Sat 11-17
SELECT set_coach_availability('RATCHAVIN', 2, '11:00', '17:00'); -- Tuesday
SELECT set_coach_availability('RATCHAVIN', 4, '11:00', '17:00'); -- Thursday
SELECT set_coach_availability('RATCHAVIN', 6, '11:00', '17:00'); -- Saturday

-- Helper function to clear a coach's schedule
CREATE OR REPLACE FUNCTION clear_coach_availability(p_coach_code TEXT)
RETURNS void AS $$
DECLARE
  v_coach_id UUID;
BEGIN
  SELECT id INTO v_coach_id
  FROM backoffice.allowed_users
  WHERE UPPER(coach_code) = UPPER(p_coach_code)
  AND is_coach = true;
  
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Coach with code % not found', p_coach_code;
  END IF;
  
  DELETE FROM coach_weekly_schedules WHERE coach_id = v_coach_id;
END;
$$ LANGUAGE plpgsql;

-- View to see schedules by coach code
CREATE OR REPLACE VIEW coach_schedules_by_code AS
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
ORDER BY au.coach_code, cws.day_of_week;

-- Check current schedules
SELECT * FROM coach_schedules_by_code;