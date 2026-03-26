-- Fix fractional hours truncation in both availability functions
-- Previously used make_interval(hours => ::int) which truncates 1.5h to 1h
-- Now uses make_interval(secs => * 3600) to preserve fractional hours

-- Fix get_available_club_sets
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
LANGUAGE sql STABLE
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
    AND (
      -- Course availability: only other course rentals are conflicts
      (p_rental_type = 'course' AND cr.rental_type = 'course')
      OR
      -- Indoor availability: course rentals always conflict, indoor rentals check time overlap
      (p_rental_type = 'indoor' AND (
        cr.rental_type = 'course'
        OR p_start_time IS NULL
        OR p_duration_hours IS NULL
        OR (
          cr.start_time IS NOT NULL
          AND cr.duration_hours IS NOT NULL
          AND cr.start_time < (p_start_time + make_interval(secs => (p_duration_hours * 3600)::int))
          AND (cr.start_time + make_interval(secs => (cr.duration_hours * 3600)::int)) > p_start_time
        )
      ))
    )
  WHERE rcs.is_active = true
    AND rcs.rental_type IN (p_rental_type, 'both')
  GROUP BY rcs.id
  ORDER BY rcs.display_order;
$$;

-- Fix check_club_set_availability
CREATE OR REPLACE FUNCTION public.check_club_set_availability(
  p_set_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_duration_hours numeric DEFAULT NULL,
  p_exclude_rental_id uuid DEFAULT NULL,
  p_rental_type text DEFAULT NULL,
  p_return_time time DEFAULT NULL
)
RETURNS int
LANGUAGE sql STABLE
AS $$
  SELECT GREATEST(0,
    (SELECT rcs.quantity FROM public.rental_club_sets rcs WHERE rcs.id = p_set_id)
    -
    (
      SELECT COUNT(*)::int
      FROM public.club_rentals cr
      WHERE cr.rental_club_set_id = p_set_id
        AND cr.status NOT IN ('cancelled', 'no_show', 'returned')
        AND (
          -- Course-to-course: timestamp overlap with 1-hour buffer on existing rental
          (p_rental_type = 'course' AND cr.rental_type = 'course' AND
            (cr.start_date::timestamp + COALESCE(cr.start_time, '00:00'::time) - interval '1 hour')
              < (COALESCE(p_end_date, p_start_date)::timestamp + COALESCE(p_return_time, '23:59'::time))
            AND
            (cr.end_date::timestamp + COALESCE(cr.return_time::time, '23:59'::time) + interval '1 hour')
              > (p_start_date::timestamp + COALESCE(p_start_time, '00:00'::time))
          )
          OR
          -- Indoor or unspecified: date overlap + time overlap for indoor
          (COALESCE(p_rental_type, 'indoor') = 'indoor' AND
            cr.start_date <= COALESCE(p_end_date, p_start_date)
            AND cr.end_date >= p_start_date
            AND (
              cr.rental_type = 'course'
              OR p_start_time IS NULL
              OR p_duration_hours IS NULL
              OR (
                cr.start_time IS NOT NULL
                AND cr.duration_hours IS NOT NULL
                AND cr.start_time < (p_start_time + make_interval(secs => (p_duration_hours * 3600)::int))
                AND (cr.start_time + make_interval(secs => (cr.duration_hours * 3600)::int)) > p_start_time
              )
            )
          )
        )
        AND (p_exclude_rental_id IS NULL OR cr.id != p_exclude_rental_id)
    )
  );
$$;
