-- Add recurring schedule fields to staff_schedules table
-- This migration adds fields to identify recurring schedules

-- Add new columns for recurring schedule tracking
ALTER TABLE backoffice.staff_schedules 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_group_id UUID DEFAULT NULL;

-- Create index for recurring schedules
CREATE INDEX IF NOT EXISTS idx_staff_schedules_recurring ON backoffice.staff_schedules(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_staff_schedules_recurring_group ON backoffice.staff_schedules(recurring_group_id) WHERE recurring_group_id IS NOT NULL;

-- Update the get_staff_schedule function to include recurring information
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
  duration_hours DECIMAL(4,2),
  is_recurring BOOLEAN,
  recurring_group_id UUID
) AS $
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
    ) as duration_hours,
    COALESCE(s.is_recurring, false) as is_recurring,
    s.recurring_group_id
  FROM backoffice.staff_schedules s
  JOIN backoffice.staff st ON s.staff_id = st.id
  WHERE (p_staff_id IS NULL OR s.staff_id = p_staff_id)
    AND s.schedule_date BETWEEN p_start_date AND p_end_date
    AND st.is_active = true
  ORDER BY s.schedule_date, s.start_time, st.staff_name;
END;
$ LANGUAGE plpgsql;

-- Update the get_team_schedule_for_date function to include recurring information
CREATE OR REPLACE FUNCTION get_team_schedule_for_date(
  p_schedule_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  staff_id INTEGER,
  staff_name TEXT,
  shifts JSONB,
  total_shifts INTEGER
) AS $
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
          'is_recurring', COALESCE(s.is_recurring, false),
          'recurring_group_id', s.recurring_group_id,
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
$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_staff_schedule TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_schedule_for_date TO authenticated;

-- Add comments
COMMENT ON COLUMN backoffice.staff_schedules.is_recurring IS 'Indicates if this schedule entry is part of a recurring schedule';
COMMENT ON COLUMN backoffice.staff_schedules.recurring_group_id IS 'Groups recurring schedule entries together with a shared UUID';