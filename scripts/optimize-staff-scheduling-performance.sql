-- Performance Optimization Script for Staff Scheduling System
-- Adds additional indexes and optimizations for better query performance

-- Additional indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_schedules_staff_date_time 
ON backoffice.staff_schedules(staff_id, schedule_date, start_time, end_time);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_schedules_date_staff_time 
ON backoffice.staff_schedules(schedule_date, staff_id, start_time);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_schedules_location 
ON backoffice.staff_schedules(location) WHERE location IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_schedules_created_at 
ON backoffice.staff_schedules(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_schedules_updated_at 
ON backoffice.staff_schedules(updated_at DESC);

-- Partial indexes for active staff only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_active 
ON backoffice.staff(id, staff_name, is_active) WHERE is_active = true;

-- Composite index for team schedule queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_schedules_team_view 
ON backoffice.staff_schedules(schedule_date, start_time, staff_id, end_time, location);

-- Index for conflict checking queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_schedules_conflict_check 
ON backoffice.staff_schedules(staff_id, schedule_date, start_time, end_time, id);

-- Optimized function for getting staff schedules with better performance
CREATE OR REPLACE FUNCTION get_staff_schedule_optimized(
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
) AS $
BEGIN
  -- Use optimized query with proper index usage
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
  INNER JOIN backoffice.staff st ON s.staff_id = st.id AND st.is_active = true
  WHERE (p_staff_id IS NULL OR s.staff_id = p_staff_id)
    AND s.schedule_date >= p_start_date 
    AND s.schedule_date <= p_end_date
  ORDER BY s.schedule_date, s.start_time, st.staff_name;
END;
$ LANGUAGE plpgsql;

-- Optimized function for schedule indicators with better performance
CREATE OR REPLACE FUNCTION get_schedule_indicators_optimized(
  p_staff_id INTEGER DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '7 days'
)
RETURNS TABLE (
  schedule_date DATE,
  shift_count INTEGER,
  indicator_type TEXT
) AS $
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
  INNER JOIN backoffice.staff st ON s.staff_id = st.id AND st.is_active = true
  WHERE (p_staff_id IS NULL OR s.staff_id = p_staff_id)
    AND s.schedule_date >= p_start_date 
    AND s.schedule_date <= p_end_date
  GROUP BY s.schedule_date
  ORDER BY s.schedule_date;
END;
$ LANGUAGE plpgsql;

-- Optimized team schedule function with better JSON aggregation
CREATE OR REPLACE FUNCTION get_team_schedule_for_date_optimized(
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
  WITH staff_shifts AS (
    SELECT 
      st.id as staff_id,
      st.staff_name,
      s.id as schedule_id,
      s.start_time,
      s.end_time,
      s.location,
      s.notes,
      CASE 
        WHEN EXTRACT(HOUR FROM s.start_time) BETWEEN 6 AND 11 THEN '#06B6D4'
        WHEN EXTRACT(HOUR FROM s.start_time) BETWEEN 12 AND 17 THEN '#F59E0B'
        ELSE '#EC4899'
      END as color
    FROM backoffice.staff st
    LEFT JOIN backoffice.staff_schedules s ON st.id = s.staff_id AND s.schedule_date = p_schedule_date
    WHERE st.is_active = true
  )
  SELECT 
    ss.staff_id,
    ss.staff_name,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ss.schedule_id,
          'start_time', ss.start_time,
          'end_time', ss.end_time,
          'location', ss.location,
          'notes', ss.notes,
          'color', ss.color
        ) ORDER BY ss.start_time
      ) FILTER (WHERE ss.schedule_id IS NOT NULL),
      '[]'::jsonb
    ) as shifts,
    COUNT(ss.schedule_id)::INTEGER as total_shifts
  FROM staff_shifts ss
  GROUP BY ss.staff_id, ss.staff_name
  ORDER BY ss.staff_name;
END;
$ LANGUAGE plpgsql;

-- Function to get schedule statistics for dashboard KPIs
CREATE OR REPLACE FUNCTION get_schedule_statistics(
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '7 days'
)
RETURNS TABLE (
  total_staff INTEGER,
  total_schedules INTEGER,
  unique_scheduled_staff INTEGER,
  total_hours DECIMAL(8,2),
  coverage_percentage DECIMAL(5,2)
) AS $
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      (SELECT COUNT(*) FROM backoffice.staff WHERE is_active = true) as total_staff_count,
      COUNT(s.id) as schedule_count,
      COUNT(DISTINCT s.staff_id) as scheduled_staff_count,
      SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0) as total_hours_sum
    FROM backoffice.staff_schedules s
    INNER JOIN backoffice.staff st ON s.staff_id = st.id AND st.is_active = true
    WHERE s.schedule_date >= p_start_date 
      AND s.schedule_date <= p_end_date
  )
  SELECT 
    stats.total_staff_count::INTEGER,
    stats.schedule_count::INTEGER,
    stats.scheduled_staff_count::INTEGER,
    COALESCE(stats.total_hours_sum, 0)::DECIMAL(8,2),
    CASE 
      WHEN stats.total_staff_count > 0 
      THEN (stats.scheduled_staff_count::DECIMAL / stats.total_staff_count * 100)::DECIMAL(5,2)
      ELSE 0::DECIMAL(5,2)
    END
  FROM stats;
END;
$ LANGUAGE plpgsql;

-- Optimized conflict checking with better index usage
CREATE OR REPLACE FUNCTION check_schedule_conflict_optimized(
  p_staff_id INTEGER,
  p_schedule_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_schedule_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $
DECLARE
  conflict_exists BOOLEAN;
BEGIN
  -- Use EXISTS for better performance
  SELECT EXISTS(
    SELECT 1
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
      )
  ) INTO conflict_exists;
  
  RETURN conflict_exists;
END;
$ LANGUAGE plpgsql;

-- Create materialized view for frequently accessed schedule data (optional)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_current_week_schedules AS
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
    WHEN EXTRACT(HOUR FROM s.start_time) BETWEEN 6 AND 11 THEN '#06B6D4'
    WHEN EXTRACT(HOUR FROM s.start_time) BETWEEN 12 AND 17 THEN '#F59E0B'
    ELSE '#EC4899'
  END as shift_color,
  ROUND(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0, 2) as duration_hours
FROM backoffice.staff_schedules s
INNER JOIN backoffice.staff st ON s.staff_id = st.id AND st.is_active = true
WHERE s.schedule_date >= date_trunc('week', CURRENT_DATE)
  AND s.schedule_date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
ORDER BY s.schedule_date, s.start_time, st.staff_name;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_current_week_schedules_id 
ON mv_current_week_schedules(id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_current_week_schedules()
RETURNS VOID AS $
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_current_week_schedules;
END;
$ LANGUAGE plpgsql;

-- Set up automatic refresh of materialized view (run every hour)
-- This would typically be set up as a cron job or scheduled task

-- Analyze tables to update statistics for query planner
ANALYZE backoffice.staff_schedules;
ANALYZE backoffice.staff_weekly_schedules;
ANALYZE backoffice.staff;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION get_staff_schedule_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION get_schedule_indicators_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_schedule_for_date_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION get_schedule_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION check_schedule_conflict_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_current_week_schedules TO authenticated;
GRANT SELECT ON mv_current_week_schedules TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_staff_schedule_optimized IS 'Optimized version of get_staff_schedule with better index usage';
COMMENT ON FUNCTION get_schedule_indicators_optimized IS 'Optimized version of get_schedule_indicators with better performance';
COMMENT ON FUNCTION get_team_schedule_for_date_optimized IS 'Optimized team schedule function with improved JSON aggregation';
COMMENT ON FUNCTION get_schedule_statistics IS 'Returns schedule statistics for dashboard KPIs';
COMMENT ON FUNCTION check_schedule_conflict_optimized IS 'Optimized conflict checking with better index usage';
COMMENT ON MATERIALIZED VIEW mv_current_week_schedules IS 'Materialized view for current week schedules to improve query performance';

-- Performance monitoring queries (for debugging)
-- These can be used to monitor query performance

-- Query to check index usage
-- SELECT schemaname, tablename, attname, n_distinct, correlation 
-- FROM pg_stats 
-- WHERE tablename IN ('staff_schedules', 'staff_weekly_schedules', 'staff');

-- Query to check slow queries
-- SELECT query, mean_time, calls, total_time 
-- FROM pg_stat_statements 
-- WHERE query LIKE '%staff_schedule%' 
-- ORDER BY mean_time DESC;