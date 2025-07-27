-- Staff Scheduling System Database Schema
-- Creates tables and functions for staff schedule management

-- Main staff schedules table - stores individual shift assignments
CREATE TABLE IF NOT EXISTS backoffice.staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id INTEGER NOT NULL REFERENCES backoffice.staff(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_group_id UUID DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT unique_staff_schedule UNIQUE(staff_id, schedule_date, start_time)
);

-- Weekly recurring schedules table - for admin convenience in creating patterns
CREATE TABLE IF NOT EXISTS backoffice.staff_weekly_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id INTEGER NOT NULL REFERENCES backoffice.staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  CONSTRAINT valid_weekly_time_range CHECK (end_time > start_time),
  CONSTRAINT unique_staff_weekly_schedule UNIQUE(staff_id, day_of_week, start_time)
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_staff_schedules_date ON backoffice.staff_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_date ON backoffice.staff_schedules(staff_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_date_range ON backoffice.staff_schedules(schedule_date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_staff_weekly_schedules_staff ON backoffice.staff_weekly_schedules(staff_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_staff_weekly_schedules_active ON backoffice.staff_weekly_schedules(is_active) WHERE is_active = true;

-- Function to get staff schedule for a specific date range with color coding
CREATE OR REPLACE FUNCTION get_staff_schedule(
  p_staff_id INTEGER DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '7 days'
)
RETURNS TABLE (
  schedule_id UUID,
  staff_id INTEGER,
  staff_name TEXT,
  schedule_date DATE,
  start_time TIME,
  end_time TIME,
  location TEXT,
  notes TEXT,
  shift_color TEXT,
  duration_hours DECIMAL(4,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.staff_id,
    st.staff_name,
    s.schedule_date,
    s.start_time,
    s.end_time,
    s.location,
    s.notes,
    CASE 
      WHEN EXTRACT(HOUR FROM s.start_time) BETWEEN 6 AND 11 THEN '#06B6D4'  -- Morning: cyan
      WHEN EXTRACT(HOUR FROM s.start_time) BETWEEN 12 AND 17 THEN '#F59E0B' -- Afternoon: amber
      ELSE '#EC4899'  -- Evening: pink
    END as shift_color,
    ROUND(
      EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0, 2
    ) as duration_hours
  FROM backoffice.staff_schedules s
  JOIN backoffice.staff st ON s.staff_id = st.id
  WHERE (p_staff_id IS NULL OR s.staff_id = p_staff_id)
    AND s.schedule_date BETWEEN p_start_date AND p_end_date
    AND st.is_active = true
  ORDER BY s.schedule_date, s.start_time, st.staff_name;
END;
$$ LANGUAGE plpgsql;

-- Function to check for scheduling conflicts
CREATE OR REPLACE FUNCTION check_schedule_conflict(
  p_staff_id INTEGER,
  p_schedule_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_schedule_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO conflict_count
  FROM backoffice.staff_schedules
  WHERE staff_id = p_staff_id
    AND schedule_date = p_schedule_date
    AND (p_exclude_schedule_id IS NULL OR id != p_exclude_schedule_id)
    AND (
      -- New shift starts during existing shift
      (p_start_time >= start_time AND p_start_time < end_time)
      OR
      -- New shift ends during existing shift
      (p_end_time > start_time AND p_end_time <= end_time)
      OR
      -- New shift completely encompasses existing shift
      (p_start_time <= start_time AND p_end_time >= end_time)
    );
  
  RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get schedule indicators for date picker (shows which dates have schedules)
CREATE OR REPLACE FUNCTION get_schedule_indicators(
  p_staff_id INTEGER DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '7 days'
)
RETURNS TABLE (
  schedule_date DATE,
  shift_count INTEGER,
  indicator_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.schedule_date,
    COUNT(*)::INTEGER as shift_count,
    CASE 
      WHEN COUNT(*) > 1 THEN 'multiple'
      ELSE 'single'
    END as indicator_type
  FROM backoffice.staff_schedules s
  JOIN backoffice.staff st ON s.staff_id = st.id
  WHERE (p_staff_id IS NULL OR s.staff_id = p_staff_id)
    AND s.schedule_date BETWEEN p_start_date AND p_end_date
    AND st.is_active = true
  GROUP BY s.schedule_date
  ORDER BY s.schedule_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get team schedule overview for a specific date
CREATE OR REPLACE FUNCTION get_team_schedule_for_date(
  p_schedule_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  staff_id INTEGER,
  staff_name TEXT,
  shifts JSONB,
  total_shifts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.id,
    st.staff_name,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'start_time', s.start_time,
          'end_time', s.end_time,
          'location', s.location,
          'notes', s.notes,
          'color', CASE 
            WHEN EXTRACT(HOUR FROM s.start_time) BETWEEN 6 AND 11 THEN '#06B6D4'
            WHEN EXTRACT(HOUR FROM s.start_time) BETWEEN 12 AND 17 THEN '#F59E0B'
            ELSE '#EC4899'
          END
        ) ORDER BY s.start_time
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::jsonb
    ) as shifts,
    COALESCE(COUNT(s.id), 0)::INTEGER as total_shifts
  FROM backoffice.staff st
  LEFT JOIN backoffice.staff_schedules s ON st.id = s.staff_id AND s.schedule_date = p_schedule_date
  WHERE st.is_active = true
  GROUP BY st.id, st.staff_name
  ORDER BY st.staff_name;
END;
$$ LANGUAGE plpgsql;

-- Function to generate weekly schedules from templates (for admin convenience)
CREATE OR REPLACE FUNCTION generate_schedules_from_weekly_template(
  p_staff_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  template_record RECORD;
  current_date DATE;
  schedules_created INTEGER := 0;
BEGIN
  -- Loop through each day in the date range
  current_date := p_start_date;
  WHILE current_date <= p_end_date LOOP
    -- Get weekly template for this day of week
    FOR template_record IN
      SELECT * FROM backoffice.staff_weekly_schedules
      WHERE staff_id = p_staff_id
        AND day_of_week = EXTRACT(DOW FROM current_date)
        AND is_active = true
    LOOP
      -- Check if schedule already exists for this date/time
      IF NOT EXISTS (
        SELECT 1 FROM backoffice.staff_schedules
        WHERE staff_id = p_staff_id
          AND schedule_date = current_date
          AND start_time = template_record.start_time
      ) THEN
        -- Create schedule from template
        INSERT INTO backoffice.staff_schedules (
          staff_id, schedule_date, start_time, end_time, location, created_by
        ) VALUES (
          p_staff_id, current_date, template_record.start_time, 
          template_record.end_time, template_record.location, 'weekly_template'
        );
        schedules_created := schedules_created + 1;
      END IF;
    END LOOP;
    
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN schedules_created;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger for staff_schedules
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_schedules_updated_at
  BEFORE UPDATE ON backoffice.staff_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_weekly_schedules_updated_at
  BEFORE UPDATE ON backoffice.staff_weekly_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- This will be useful for development and testing
DO $$
DECLARE
  staff_record RECORD;
BEGIN
  -- Only insert sample data if tables are empty
  IF NOT EXISTS (SELECT 1 FROM backoffice.staff_schedules LIMIT 1) THEN
    -- Get first 4 active staff members
    FOR staff_record IN
      SELECT id, staff_name FROM backoffice.staff 
      WHERE is_active = true 
      ORDER BY id 
      LIMIT 4
    LOOP
      -- Add some sample schedules for the current week
      INSERT INTO backoffice.staff_schedules (staff_id, schedule_date, start_time, end_time, location, created_by)
      VALUES 
        -- Monday
        (staff_record.id, CURRENT_DATE + (1 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER, '09:00', '13:00', 'Pro Shop', 'system'),
        -- Wednesday  
        (staff_record.id, CURRENT_DATE + (3 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER, '14:00', '18:00', 'Driving Range', 'system'),
        -- Friday
        (staff_record.id, CURRENT_DATE + (5 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER, '18:00', '22:00', 'Restaurant', 'system')
      ON CONFLICT (staff_id, schedule_date, start_time) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Sample staff schedule data inserted for testing';
  END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON backoffice.staff_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON backoffice.staff_weekly_schedules TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_schedule TO authenticated;
GRANT EXECUTE ON FUNCTION check_schedule_conflict TO authenticated;
GRANT EXECUTE ON FUNCTION get_schedule_indicators TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_schedule_for_date TO authenticated;
GRANT EXECUTE ON FUNCTION generate_schedules_from_weekly_template TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE backoffice.staff_schedules IS 'Stores individual staff shift assignments with date, time, and location';
COMMENT ON TABLE backoffice.staff_weekly_schedules IS 'Stores weekly recurring schedule patterns for admin convenience';
COMMENT ON FUNCTION get_staff_schedule IS 'Retrieves staff schedules for date range with color coding based on start time';
COMMENT ON FUNCTION check_schedule_conflict IS 'Checks if a new schedule conflicts with existing schedules for the same staff member';
COMMENT ON FUNCTION get_schedule_indicators IS 'Returns schedule indicators for date picker showing which dates have shifts';
COMMENT ON FUNCTION get_team_schedule_for_date IS 'Returns all staff schedules for a specific date in team view format';
COMMENT ON FUNCTION generate_schedules_from_weekly_template IS 'Generates daily schedules from weekly templates for a date range';