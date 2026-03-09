-- Add course club rentals to the Google Ads offline conversions view
-- This allows the ETL pipeline to upload course rental conversions for attribution

CREATE OR REPLACE VIEW public.google_ads_offline_conversions AS
-- Existing: Bay bookings and coaching
SELECT b.email,
    b.phone_number,
    (b.created_at AT TIME ZONE 'Asia/Bangkok') AS conversion_time,
    'Booking Confirmed' AS conversion_name,
    CASE
        WHEN b.booking_type ~~ 'Coaching%' THEN 2500
        WHEN b.booking_type = 'Play_Food_Package' THEN 2000
        WHEN b.booking_type = 'Others (e.g. Events)' THEN 5000
        WHEN b.booking_type = 'ClassPass' THEN 200
        WHEN b.booking_type = 'Bay Block' THEN 0
        ELSE 1000
    END AS conversion_value,
    'THB' AS currency_code,
    b.id AS booking_id,
    b.name AS customer_name,
    b.status,
    b.number_of_people,
    b.duration,
    b.date AS booking_date,
    b.booking_type
FROM bookings b
WHERE b.status NOT IN ('cancelled', 'pending', 'rejected')
    AND (b.email IS NOT NULL OR b.phone_number IS NOT NULL)
    AND b.created_at >= (now() - '90 days'::interval)

UNION ALL

-- New: Course club rentals
SELECT cr.customer_email AS email,
    cr.customer_phone AS phone_number,
    (cr.created_at AT TIME ZONE 'Asia/Bangkok') AS conversion_time,
    'Course Rental Confirmed' AS conversion_name,
    cr.total_price::integer AS conversion_value,
    'THB' AS currency_code,
    cr.id::text AS booking_id,
    cr.customer_name,
    cr.status,
    NULL::integer AS number_of_people,
    cr.duration_days::real AS duration,
    cr.start_date AS booking_date,
    'Course Rental' AS booking_type
FROM club_rentals cr
WHERE cr.rental_type = 'course'
    AND cr.status NOT IN ('cancelled', 'no_show')
    AND (cr.customer_email IS NOT NULL OR cr.customer_phone IS NOT NULL)
    AND cr.created_at >= (now() - '90 days'::interval)

ORDER BY conversion_time DESC;
