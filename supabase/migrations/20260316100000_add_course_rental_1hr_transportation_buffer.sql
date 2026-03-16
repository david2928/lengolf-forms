-- Add 1-hour transportation buffer for course rental availability checks.
-- When checking course-to-course conflicts, existing rentals block the set
-- for 1 hour before their start_time and 1 hour after their return_time.
-- Also adds p_return_time parameter for accurate new-rental end time checking.
CREATE OR REPLACE FUNCTION public.check_club_set_availability(
  p_set_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_start_time time WITHOUT TIME ZONE DEFAULT NULL,
  p_duration_hours numeric DEFAULT NULL,
  p_exclude_rental_id uuid DEFAULT NULL,
  p_rental_type text DEFAULT NULL,
  p_return_time time WITHOUT TIME ZONE DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE
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
            -- existing start (buffered) < new end
            (cr.start_date::timestamp + COALESCE(cr.start_time, '00:00'::time) - interval '1 hour')
              < (COALESCE(p_end_date, p_start_date)::timestamp + COALESCE(p_return_time, '23:59'::time))
            AND
            -- existing end (buffered) > new start
            (cr.end_date::timestamp + COALESCE(cr.return_time::time, '23:59'::time) + interval '1 hour')
              > (p_start_date::timestamp + COALESCE(p_start_time, '00:00'::time))
          )
          OR
          -- Indoor or unspecified: original logic (date overlap + time overlap for indoor)
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
                AND cr.start_time < (p_start_time + make_interval(hours => p_duration_hours::int))
                AND (cr.start_time + make_interval(hours => cr.duration_hours::int)) > p_start_time
              )
            )
          )
        )
        AND (p_exclude_rental_id IS NULL OR cr.id != p_exclude_rental_id)
    )
  );
$$;
