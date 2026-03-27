-- Opening hours change: 10am → 9am (effective April 1, 2026)
-- Affects: is_within_business_hours (SLA), calculate_business_hours_interval (SLA reporting)
-- APPLY ON APRIL 1 — do not apply before then as it affects live SLA calculations

CREATE OR REPLACE FUNCTION is_within_business_hours(ts TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  bangkok_ts TIMESTAMPTZ;
  hour_of_day INTEGER;
BEGIN
  bangkok_ts := ts AT TIME ZONE 'Asia/Bangkok';
  hour_of_day := EXTRACT(HOUR FROM bangkok_ts);
  -- Business hours: 9am to 10pm (9-22)
  RETURN hour_of_day >= 9 AND hour_of_day < 22;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_business_hours_interval(start_ts TIMESTAMPTZ, end_ts TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  start_of_business TIMESTAMPTZ;
  end_of_business TIMESTAMPTZ;
  overlap_start TIMESTAMPTZ;
  overlap_end TIMESTAMPTZ;
  total_seconds INTEGER := 0;
  loop_date DATE;
  business_start_hour INTEGER := 9;
  business_end_hour INTEGER := 22;
BEGIN
  IF start_ts >= end_ts THEN
    RETURN 0;
  END IF;
  loop_date := DATE(start_ts AT TIME ZONE 'Asia/Bangkok');
  WHILE loop_date <= DATE(end_ts AT TIME ZONE 'Asia/Bangkok') LOOP
    start_of_business := (loop_date || ' 09:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok';
    end_of_business := (loop_date || ' 22:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok';
    overlap_start := GREATEST(start_ts, start_of_business);
    overlap_end := LEAST(end_ts, end_of_business);
    IF overlap_start < overlap_end THEN
      total_seconds := total_seconds + EXTRACT(EPOCH FROM (overlap_end - overlap_start))::INTEGER;
    END IF;
    loop_date := loop_date + 1;
  END LOOP;
  RETURN total_seconds;
END;
$$;
