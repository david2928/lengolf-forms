-- Database functions for club rental availability checking

-- 1. Check availability for a specific club set over a date range
-- For indoor: checks time overlap on the same date
-- For course: checks date range overlap
CREATE OR REPLACE FUNCTION public.check_club_set_availability(
  p_set_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_duration_hours numeric DEFAULT NULL,
  p_exclude_rental_id uuid DEFAULT NULL
)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT GREATEST(0,
    (SELECT rcs.quantity FROM public.rental_club_sets rcs WHERE rcs.id = p_set_id)
    -
    (
      SELECT COUNT(*)::int
      FROM public.club_rentals cr
      WHERE cr.rental_club_set_id = p_set_id
        AND cr.status NOT IN ('cancelled', 'no_show', 'returned')
        AND cr.start_date <= COALESCE(p_end_date, p_start_date)
        AND cr.end_date >= p_start_date
        -- For indoor rentals on the same date, also check time overlap
        AND (
          cr.rental_type = 'course'
          OR p_start_time IS NULL
          OR p_duration_hours IS NULL
          OR (
            cr.start_time IS NOT NULL
            AND cr.duration_hours IS NOT NULL
            AND cr.start_time < (p_start_time + make_interval(hours => p_duration_hours::int))
            AND (cr.start_time + make_interval(hours => cr.duration_hours::int)) > p_start_time
          )
        )
        AND (p_exclude_rental_id IS NULL OR cr.id != p_exclude_rental_id)
    )
  );
$$;

COMMENT ON FUNCTION public.check_club_set_availability IS
  'Returns number of available sets for a given date range and optional time window. Used for both indoor (time-aware) and course (date-range) availability.';


-- 2. Get all club sets with availability counts for a given rental type and date range
CREATE OR REPLACE FUNCTION public.get_available_club_sets(
  p_rental_type text,
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_duration_hours numeric DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  tier text,
  gender text,
  brand text,
  model text,
  description text,
  specifications jsonb,
  image_url text,
  rental_type text,
  indoor_price_1h numeric,
  indoor_price_2h numeric,
  indoor_price_4h numeric,
  course_price_1d numeric,
  course_price_3d numeric,
  course_price_7d numeric,
  course_price_14d numeric,
  quantity int,
  display_order int,
  rented_count bigint,
  available_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    rcs.id,
    rcs.name,
    rcs.slug,
    rcs.tier,
    rcs.gender,
    rcs.brand,
    rcs.model,
    rcs.description,
    rcs.specifications,
    rcs.image_url,
    rcs.rental_type,
    rcs.indoor_price_1h,
    rcs.indoor_price_2h,
    rcs.indoor_price_4h,
    rcs.course_price_1d,
    rcs.course_price_3d,
    rcs.course_price_7d,
    rcs.course_price_14d,
    rcs.quantity,
    rcs.display_order,
    COUNT(cr.id) AS rented_count,
    GREATEST(0, rcs.quantity - COUNT(cr.id)::int) AS available_count
  FROM public.rental_club_sets rcs
  LEFT JOIN public.club_rentals cr
    ON cr.rental_club_set_id = rcs.id
    AND cr.status NOT IN ('cancelled', 'no_show', 'returned')
    AND cr.start_date <= COALESCE(p_end_date, p_start_date)
    AND cr.end_date >= p_start_date
    -- Time overlap check for indoor rentals
    AND (
      p_start_time IS NULL
      OR p_duration_hours IS NULL
      OR cr.rental_type = 'course'
      OR (
        cr.start_time IS NOT NULL
        AND cr.duration_hours IS NOT NULL
        AND cr.start_time < (p_start_time + make_interval(hours => p_duration_hours::int))
        AND (cr.start_time + make_interval(hours => cr.duration_hours::int)) > p_start_time
      )
    )
  WHERE rcs.is_active = true
    AND rcs.rental_type IN (p_rental_type, 'both')
  GROUP BY rcs.id
  ORDER BY rcs.display_order;
$$;

COMMENT ON FUNCTION public.get_available_club_sets IS
  'Returns all active club sets with real-time availability counts for a given rental type, date range, and optional time window.';


-- 3. Generate a unique rental code
CREATE OR REPLACE FUNCTION public.generate_rental_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    v_code := 'CR-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 4));
    SELECT EXISTS(SELECT 1 FROM public.club_rentals WHERE rental_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION public.generate_rental_code IS
  'Generates a unique human-readable rental code in format CR-YYYYMMDD-XXXX';
