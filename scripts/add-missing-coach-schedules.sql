-- Add missing coach weekly schedules
-- This script adds default schedules for coaches who don't have any schedules configured

-- First, let's check which coaches are missing schedules
WITH coaches_with_schedules AS (
    SELECT DISTINCT coach_id
    FROM coach_weekly_schedules
),
all_coaches AS (
    SELECT id, email, coach_name, coach_display_name, coach_code
    FROM backoffice.allowed_users
    WHERE is_coach = true AND is_active_coach = true
)
SELECT 
    ac.id,
    ac.coach_code,
    ac.coach_display_name,
    ac.email,
    CASE 
        WHEN cws.coach_id IS NULL THEN 'No schedule configured'
        ELSE 'Has schedule'
    END as schedule_status
FROM all_coaches ac
LEFT JOIN coaches_with_schedules cws ON ac.id = cws.coach_id;

-- Add schedules for Coach Boss (if missing)
DO $$
DECLARE
    coach_boss_id UUID;
BEGIN
    -- Get Coach Boss ID
    SELECT id INTO coach_boss_id 
    FROM backoffice.allowed_users 
    WHERE coach_code = 'BOSS' AND is_coach = true LIMIT 1;
    
    IF coach_boss_id IS NOT NULL THEN
        -- Check if schedules already exist
        IF NOT EXISTS (SELECT 1 FROM coach_weekly_schedules WHERE coach_id = coach_boss_id) THEN
            -- Add default schedule: Monday-Friday 10:00-18:00
            INSERT INTO coach_weekly_schedules (coach_id, day_of_week, start_time, end_time, is_available)
            VALUES 
                (coach_boss_id, 1, '10:00', '18:00', true), -- Monday
                (coach_boss_id, 2, '10:00', '18:00', true), -- Tuesday
                (coach_boss_id, 3, '10:00', '18:00', true), -- Wednesday
                (coach_boss_id, 4, '10:00', '18:00', true), -- Thursday
                (coach_boss_id, 5, '10:00', '18:00', true); -- Friday
            
            RAISE NOTICE 'Added schedule for Coach Boss';
        ELSE
            RAISE NOTICE 'Coach Boss already has a schedule';
        END IF;
    END IF;
END $$;

-- Add schedules for Coach Noon (if missing)
DO $$
DECLARE
    coach_noon_id UUID;
BEGIN
    -- Get Coach Noon ID
    SELECT id INTO coach_noon_id 
    FROM backoffice.allowed_users 
    WHERE coach_code = 'NOON' AND is_coach = true LIMIT 1;
    
    IF coach_noon_id IS NOT NULL THEN
        -- Check if schedules already exist
        IF NOT EXISTS (SELECT 1 FROM coach_weekly_schedules WHERE coach_id = coach_noon_id) THEN
            -- Add default schedule: Tuesday, Thursday, Saturday
            INSERT INTO coach_weekly_schedules (coach_id, day_of_week, start_time, end_time, is_available)
            VALUES 
                (coach_noon_id, 2, '13:00', '20:00', true), -- Tuesday
                (coach_noon_id, 4, '13:00', '20:00', true), -- Thursday
                (coach_noon_id, 6, '10:00', '18:00', true); -- Saturday
            
            RAISE NOTICE 'Added schedule for Coach Noon';
        ELSE
            RAISE NOTICE 'Coach Noon already has a schedule';
        END IF;
    END IF;
END $$;

-- Add schedules for Coach Alson (if exists and missing)
DO $$
DECLARE
    coach_alson_id UUID;
BEGIN
    -- Get Coach Alson ID
    SELECT id INTO coach_alson_id 
    FROM backoffice.allowed_users 
    WHERE coach_code = 'ALSON' AND is_coach = true LIMIT 1;
    
    IF coach_alson_id IS NOT NULL THEN
        -- Check if schedules already exist
        IF NOT EXISTS (SELECT 1 FROM coach_weekly_schedules WHERE coach_id = coach_alson_id) THEN
            -- Add default schedule: Wednesday, Friday, Sunday
            INSERT INTO coach_weekly_schedules (coach_id, day_of_week, start_time, end_time, is_available)
            VALUES 
                (coach_alson_id, 3, '14:00', '21:00', true), -- Wednesday
                (coach_alson_id, 5, '14:00', '21:00', true), -- Friday
                (coach_alson_id, 0, '10:00', '17:00', true); -- Sunday
            
            RAISE NOTICE 'Added schedule for Coach Alson';
        ELSE
            RAISE NOTICE 'Coach Alson already has a schedule';
        END IF;
    END IF;
END $$;

-- Verify the schedules were added
SELECT 
    au.coach_display_name,
    au.coach_code,
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
FROM coach_weekly_schedules cws
JOIN backoffice.allowed_users au ON au.id = cws.coach_id
ORDER BY au.coach_display_name, cws.day_of_week;