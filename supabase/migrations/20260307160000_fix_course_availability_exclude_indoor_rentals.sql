-- Fix: Indoor rentals (time-bound simulator sessions) should not block course rentals
-- (off-site multi-day). Only course rentals conflict with other course rentals on date overlap.

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
    AND (
      -- Course availability: only other course rentals are conflicts
      -- (indoor rentals are time-bound simulator sessions, clubs are returned after)
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
          AND cr.start_time < (p_start_time + make_interval(hours => p_duration_hours::int))
          AND (cr.start_time + make_interval(hours => cr.duration_hours::int)) > p_start_time
        )
      ))
    )
  WHERE rcs.is_active = true
    AND rcs.rental_type IN (p_rental_type, 'both')
  GROUP BY rcs.id
  ORDER BY rcs.display_order;
$$;

-- Also update check_club_set_availability to accept rental_type context
CREATE OR REPLACE FUNCTION public.check_club_set_availability(
  p_set_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_duration_hours numeric DEFAULT NULL,
  p_exclude_rental_id uuid DEFAULT NULL,
  p_rental_type text DEFAULT NULL
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
        AND (
          -- When rental_type context is 'course', only course rentals conflict
          (p_rental_type = 'course' AND cr.rental_type = 'course')
          OR
          -- When rental_type is 'indoor' or NULL, use original logic
          (COALESCE(p_rental_type, 'indoor') = 'indoor' AND (
            cr.rental_type = 'course'
            OR p_start_time IS NULL
            OR p_duration_hours IS NULL
            OR (
              cr.start_time IS NOT NULL
              AND cr.duration_hours IS NOT NULL
              AND cr.start_time < (p_start_time + make_interval(hours => p_duration_hours::int))
              AND (cr.start_time + make_interval(hours => cr.duration_hours::int)) > p_start_time
            )
          ))
        )
        AND (p_exclude_rental_id IS NULL OR cr.id != p_exclude_rental_id)
    )
  );
$$;
