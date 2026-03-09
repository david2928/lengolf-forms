-- Migration: Add free trial fallback to coach_earnings view
--
-- Business rule: When a student does a free trial and buys a coaching package
-- within 30 days, the coach is compensated at the package's rate.
--
-- Changes (modern/booking branch only):
-- 1. WHERE EXISTS: Add third condition to include free trial bookings
-- 2. rate_type COALESCE: Add third branch for package lookup
-- 3. rate/gross_coach_earnings/coach_earnings: Same third branch in inner COALESCE
-- 4. Safety: pkg.purchase_date >= b.date ensures only packages bought AFTER the trial match

CREATE OR REPLACE VIEW backoffice.coach_earnings AS
WITH coaching_sales AS (
    SELECT ls.*
    FROM pos.lengolf_sales ls
    WHERE ls.receipt_number IN (
        SELECT DISTINCT ls2.receipt_number
        FROM pos.lengolf_sales ls2
        WHERE ls2.product_name LIKE '%Lesson Used (%'
    )
    AND ls.product_name LIKE '%Lesson%'
    AND ls.date <= pos.get_active_cutoff_date()
),
sales_with_packages AS (
    SELECT
        cs.id,
        cs.receipt_number,
        cs.date,
        cs.customer_id,
        cs.customer_name AS pos_customer_name,
        cs.product_name,
        cs.item_cnt,
        COALESCE(c.customer_name, cs.customer_name::character varying) AS customer_name,
        COALESCE(c.contact_number, ''::character varying) AS customer_phone_number,
        COALESCE(c.customer_code, ''::character varying) AS customer_code,
        COALESCE(
            (SELECT pt.name
             FROM backoffice.packages p
             JOIN backoffice.package_types pt ON p.package_type_id = pt.id
             JOIN backoffice.package_usage pu ON p.id = pu.package_id
             WHERE p.customer_id = cs.customer_id
               AND pt.type = 'Coaching'::backoffice.package_type
               AND pu.used_date = cs.date
             LIMIT 1),
            CASE
                WHEN cs.product_name = '1 Golf Lesson' THEN 'Individual, 1 PAX'
                WHEN cs.product_name = '1 Golf Lesson (2 PAX)' THEN 'Individual, 2 PAX'
                ELSE 'Individual, 1 PAX'
            END::character varying
        ) AS rate_type,
        (SELECT p.discount_amount
         FROM backoffice.packages p
         JOIN backoffice.package_usage pu ON p.id = pu.package_id
         WHERE p.customer_id = cs.customer_id AND pu.used_date = cs.date
         LIMIT 1) AS package_discount_amount,
        (SELECT pt.hours
         FROM backoffice.packages p
         JOIN backoffice.package_types pt ON p.package_type_id = pt.id
         JOIN backoffice.package_usage pu ON p.id = pu.package_id
         WHERE p.customer_id = cs.customer_id
           AND pt.type = 'Coaching'::backoffice.package_type
           AND pu.used_date = cs.date
         LIMIT 1) AS package_total_hours,
        (SELECT p.discount_note
         FROM backoffice.packages p
         JOIN backoffice.package_usage pu ON p.id = pu.package_id
         WHERE p.customer_id = cs.customer_id AND pu.used_date = cs.date
         LIMIT 1) AS discount_note
    FROM coaching_sales cs
    LEFT JOIN customers c ON cs.customer_id = c.id
)
-- Legacy POS-based branch (date <= cutoff)
SELECT
    a.receipt_number,
    a.date,
    a.customer_name,
    a.customer_phone_number,
    a.customer_id,
    a.customer_code,
    a.coach,
    a.rate_type,
    a.hour_cnt::numeric AS hour_cnt,
    f.rate,
    a.hour_cnt::numeric * f.rate AS gross_coach_earnings,
    COALESCE(
        CASE
            WHEN a.package_discount_amount > 0::numeric AND a.package_total_hours > 0::numeric
            THEN a.package_discount_amount / a.package_total_hours * a.hour_cnt::numeric
            ELSE 0::numeric
        END,
        0::numeric
    ) AS discount_deduction,
    a.hour_cnt::numeric * f.rate - COALESCE(
        CASE
            WHEN a.package_discount_amount > 0::numeric AND a.package_total_hours > 0::numeric
            THEN a.package_discount_amount / a.package_total_hours * a.hour_cnt::numeric
            ELSE 0::numeric
        END,
        0::numeric
    ) AS coach_earnings,
    a.discount_note
FROM (
    SELECT
        swp.receipt_number,
        swp.date,
        max(swp.customer_name::text) AS customer_name,
        max(swp.customer_phone_number::text) AS customer_phone_number,
        swp.customer_id,
        max(swp.customer_code::text) AS customer_code,
        max(CASE
            WHEN swp.product_name = '1 Golf Lesson Used (Boss)' THEN 'BOSS'
            WHEN swp.product_name = '1 Golf Lesson Used (Ratchavin)' THEN 'RATCHAVIN'
            WHEN swp.product_name = '1 Golf Lesson Used (Noon)' THEN 'NOON'
            WHEN swp.product_name = '1 Golf Lesson Used (Min)' THEN 'MIN'
            ELSE NULL
        END) AS coach,
        max(swp.rate_type::text) AS rate_type,
        sum(CASE WHEN swp.product_name LIKE '%Lesson Used (%' THEN swp.item_cnt ELSE 0 END) AS hour_cnt,
        max(swp.package_discount_amount) AS package_discount_amount,
        max(swp.package_total_hours) AS package_total_hours,
        max(swp.discount_note::text) AS discount_note
    FROM sales_with_packages swp
    GROUP BY swp.receipt_number, swp.date, swp.customer_id
) a
LEFT JOIN backoffice.coach_rates f ON f.rate_type = a.rate_type

UNION ALL

-- Modern booking-based branch (date > cutoff)
SELECT DISTINCT
    b.id AS receipt_number,
    b.date,
    b.name AS customer_name,
    b.phone_number AS customer_phone_number,
    b.customer_id,
    COALESCE(c.customer_code, ''::character varying) AS customer_code,
    CASE
        WHEN b.booking_type = 'Coaching (Boss)' THEN 'BOSS'
        WHEN b.booking_type = 'Coaching (Boss - Ratchavin)' THEN 'RATCHAVIN'
        WHEN b.booking_type = 'Coaching (Noon)' THEN 'NOON'
        WHEN b.booking_type = 'Coaching (Min)' THEN 'MIN'
        ELSE NULL
    END AS coach,
    -- rate_type: package_usage -> transaction_items -> free trial fallback
    COALESCE(
        (SELECT pt.name
         FROM backoffice.package_usage pu
         JOIN backoffice.packages pkg ON pu.package_id = pkg.id
         JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
         WHERE pu.booking_id = b.id
         LIMIT 1),
        ((SELECT
            CASE p.name
                WHEN '1 Golf Lesson' THEN 'Individual, 1 PAX'
                WHEN '1 Golf Lesson (2 PAX)' THEN 'Individual, 2 PAX'
                ELSE NULL
            END
         FROM pos.transaction_items ti
         JOIN products.products p ON ti.product_id = p.id
         JOIN products.categories pc ON p.category_id = pc.id
         WHERE ti.booking_id = b.id AND pc.name::text = 'Coaching'
         LIMIT 1))::character varying,
        -- Free trial fallback: customer's coaching package purchased within 30 days
        (SELECT pt.name
         FROM backoffice.packages pkg
         JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
         WHERE pkg.customer_id = b.customer_id
           AND pt.type = 'Coaching'::backoffice.package_type
           AND pkg.purchase_date >= b.date
           AND pkg.purchase_date <= b.date + INTERVAL '30 days'
         ORDER BY pkg.purchase_date ASC
         LIMIT 1)
    ) AS rate_type,
    b.duration::numeric AS hour_cnt,
    -- rate lookup (with free trial fallback in COALESCE)
    (SELECT r.rate
     FROM backoffice.coach_rates r
     WHERE r.rate_type = COALESCE(
         (SELECT pt.name
          FROM backoffice.package_usage pu
          JOIN backoffice.packages pkg ON pu.package_id = pkg.id
          JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
          WHERE pu.booking_id = b.id
          LIMIT 1),
         ((SELECT
             CASE p.name
                 WHEN '1 Golf Lesson' THEN 'Individual, 1 PAX'
                 WHEN '1 Golf Lesson (2 PAX)' THEN 'Individual, 2 PAX'
                 ELSE NULL
             END
          FROM pos.transaction_items ti
          JOIN products.products p ON ti.product_id = p.id
          JOIN products.categories pc ON p.category_id = pc.id
          WHERE ti.booking_id = b.id AND pc.name::text = 'Coaching'
          LIMIT 1))::character varying,
         (SELECT pt.name
          FROM backoffice.packages pkg
          JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
          WHERE pkg.customer_id = b.customer_id
            AND pt.type = 'Coaching'::backoffice.package_type
            AND pkg.purchase_date >= b.date
            AND pkg.purchase_date <= b.date + INTERVAL '30 days'
          ORDER BY pkg.purchase_date ASC
          LIMIT 1)
     )::text
     LIMIT 1) AS rate,
    -- gross_coach_earnings (with free trial fallback)
    b.duration::numeric * (
        (SELECT r.rate
         FROM backoffice.coach_rates r
         WHERE r.rate_type = COALESCE(
             (SELECT pt.name
              FROM backoffice.package_usage pu
              JOIN backoffice.packages pkg ON pu.package_id = pkg.id
              JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
              WHERE pu.booking_id = b.id
              LIMIT 1),
             ((SELECT
                 CASE p.name
                     WHEN '1 Golf Lesson' THEN 'Individual, 1 PAX'
                     WHEN '1 Golf Lesson (2 PAX)' THEN 'Individual, 2 PAX'
                     ELSE NULL
                 END
              FROM pos.transaction_items ti
              JOIN products.products p ON ti.product_id = p.id
              JOIN products.categories pc ON p.category_id = pc.id
              WHERE ti.booking_id = b.id AND pc.name::text = 'Coaching'
              LIMIT 1))::character varying,
             (SELECT pt.name
              FROM backoffice.packages pkg
              JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
              WHERE pkg.customer_id = b.customer_id
                AND pt.type = 'Coaching'::backoffice.package_type
                AND pkg.purchase_date >= b.date
                AND pkg.purchase_date <= b.date + INTERVAL '30 days'
              ORDER BY pkg.purchase_date ASC
              LIMIT 1)
         )::text
         LIMIT 1)
    ) AS gross_coach_earnings,
    -- discount_deduction: unchanged (free trials have no package discount via package_usage)
    COALESCE(
        (SELECT
            CASE
                WHEN pkg.discount_amount > 0::numeric AND pt.hours > 0::numeric
                THEN pkg.discount_amount / pt.hours * b.duration::numeric
                ELSE 0::numeric
            END
         FROM backoffice.package_usage pu
         JOIN backoffice.packages pkg ON pu.package_id = pkg.id
         JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
         WHERE pu.booking_id = b.id
         LIMIT 1),
        0::numeric
    ) AS discount_deduction,
    -- coach_earnings: gross - discount (with free trial fallback)
    b.duration::numeric * (
        (SELECT r.rate
         FROM backoffice.coach_rates r
         WHERE r.rate_type = COALESCE(
             (SELECT pt.name
              FROM backoffice.package_usage pu
              JOIN backoffice.packages pkg ON pu.package_id = pkg.id
              JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
              WHERE pu.booking_id = b.id
              LIMIT 1),
             ((SELECT
                 CASE p.name
                     WHEN '1 Golf Lesson' THEN 'Individual, 1 PAX'
                     WHEN '1 Golf Lesson (2 PAX)' THEN 'Individual, 2 PAX'
                     ELSE NULL
                 END
              FROM pos.transaction_items ti
              JOIN products.products p ON ti.product_id = p.id
              JOIN products.categories pc ON p.category_id = pc.id
              WHERE ti.booking_id = b.id AND pc.name::text = 'Coaching'
              LIMIT 1))::character varying,
             (SELECT pt.name
              FROM backoffice.packages pkg
              JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
              WHERE pkg.customer_id = b.customer_id
                AND pt.type = 'Coaching'::backoffice.package_type
                AND pkg.purchase_date >= b.date
                AND pkg.purchase_date <= b.date + INTERVAL '30 days'
              ORDER BY pkg.purchase_date ASC
              LIMIT 1)
         )::text
         LIMIT 1)
    ) - COALESCE(
        (SELECT
            CASE
                WHEN pkg.discount_amount > 0::numeric AND pt.hours > 0::numeric
                THEN pkg.discount_amount / pt.hours * b.duration::numeric
                ELSE 0::numeric
            END
         FROM backoffice.package_usage pu
         JOIN backoffice.packages pkg ON pu.package_id = pkg.id
         JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
         WHERE pu.booking_id = b.id
         LIMIT 1),
        0::numeric
    ) AS coach_earnings,
    -- discount_note: unchanged
    (SELECT pkg.discount_note
     FROM backoffice.package_usage pu
     JOIN backoffice.packages pkg ON pu.package_id = pkg.id
     WHERE pu.booking_id = b.id
     LIMIT 1) AS discount_note
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
WHERE b.date > pos.get_active_cutoff_date()
    AND b.booking_type LIKE 'Coaching (%'
    AND b.status = 'confirmed'
    AND (
        EXISTS (SELECT 1 FROM backoffice.package_usage pu WHERE pu.booking_id = b.id)
        OR EXISTS (
            SELECT 1
            FROM pos.transaction_items ti
            JOIN products.products p ON ti.product_id = p.id
            JOIN products.categories pc ON p.category_id = pc.id
            WHERE ti.booking_id = b.id AND pc.name::text = 'Coaching'
        )
        -- Free trial: include bookings where customer bought coaching package within 30 days
        OR EXISTS (
            SELECT 1
            FROM backoffice.packages pkg
            JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
            WHERE pkg.customer_id = b.customer_id
              AND pt.type = 'Coaching'::backoffice.package_type
              AND pkg.purchase_date >= b.date
              AND pkg.purchase_date <= b.date + INTERVAL '30 days'
        )
    );
