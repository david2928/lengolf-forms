-- Fix Google Ads offline conversion values
-- Replace duration-based estimates (~2,149 THB avg) with booking_type-based values
-- grounded in actual POS revenue data (180-day analysis)
--
-- Impact: Average conversion value drops from ~2,149 to ~1,050 THB
-- This prevents Smart Bidding from overspending due to inflated conversion values
--
-- Value rationale (from POS revenue analysis):
--   Normal Bay Rate: POS avg 1,151 / median 900 → 1,000
--   Package:         POS avg 1,143 / median 90  → 1,000
--   Play_Food_Package: POS avg 2,184 / median 2,100 → 2,000
--   Coaching (all):  POS avg 2,770-6,912 → 2,500
--   ClassPass:       POS avg 146 / median 70 → 200
--   Bay Block:       internal/events → 0 (excluded from bidding)
--   Others (Events): event packages → 5,000
--   Default:         catch-all → 1,000

CREATE OR REPLACE VIEW public.google_ads_offline_conversions AS
SELECT
    b.email,
    b.phone_number,
    (b.created_at AT TIME ZONE 'Asia/Bangkok') AS conversion_time,
    'Booking Confirmed'::text AS conversion_name,
    CASE
        WHEN b.booking_type LIKE 'Coaching%' THEN 2500
        WHEN b.booking_type = 'Play_Food_Package' THEN 2000
        WHEN b.booking_type = 'Others (e.g. Events)' THEN 5000
        WHEN b.booking_type = 'ClassPass' THEN 200
        WHEN b.booking_type = 'Bay Block' THEN 0
        ELSE 1000  -- Normal Bay Rate, Package, Shooting, any future types
    END AS conversion_value,
    'THB'::text AS currency_code,
    b.id AS booking_id,
    b.name AS customer_name,
    b.status,
    b.number_of_people,
    b.duration,
    b.date AS booking_date,
    b.booking_type
FROM public.bookings b
WHERE
    b.status <> ALL (ARRAY['cancelled','pending','rejected'])
    AND (b.email IS NOT NULL OR b.phone_number IS NOT NULL)
    AND b.created_at >= (now() - '90 days'::interval)
ORDER BY b.created_at DESC;
