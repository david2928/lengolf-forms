-- Migration: Fix duplicate entries in coach_earnings view
-- Date: 2025-10-29
-- Description: Fixes duplicate entries caused by multiple LEFT JOINs creating Cartesian products
--              when a booking has both package_usage and transaction_items records

CREATE OR REPLACE VIEW backoffice.coach_earnings AS
WITH coaching_sales AS (
    SELECT *
    FROM pos.lengolf_sales
    WHERE receipt_number IN (
        SELECT DISTINCT receipt_number
        FROM pos.lengolf_sales
        WHERE product_name LIKE '%Lesson Used (%'
    )
    AND product_name LIKE '%Lesson%'
    AND date <= pos.get_active_cutoff_date()
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
        COALESCE(c.customer_name, cs.customer_name::VARCHAR) AS customer_name,
        COALESCE(c.contact_number, ''::VARCHAR) AS customer_phone_number,
        COALESCE(c.customer_code, ''::VARCHAR) AS customer_code,
        COALESCE(
            (
                SELECT pt.name
                FROM backoffice.packages p
                JOIN backoffice.package_types pt ON p.package_type_id = pt.id
                JOIN backoffice.package_usage pu ON p.id = pu.package_id
                WHERE p.customer_id = cs.customer_id
                AND pt.type = 'Coaching'::backoffice.package_type
                AND pu.used_date = cs.date
                LIMIT 1
            ),
            CASE
                WHEN cs.product_name = '1 Golf Lesson' THEN 'Individual, 1 PAX'
                WHEN cs.product_name = '1 Golf Lesson (2 PAX)' THEN 'Individual, 2 PAX'
                ELSE 'Individual, 1 PAX'
            END::VARCHAR
        ) AS rate_type
    FROM coaching_sales cs
    LEFT JOIN customers c ON cs.customer_id = c.id
)
-- Legacy POS data (before cutoff date)
SELECT
    a.receipt_number,
    a.date,
    a.customer_name,
    a.customer_phone_number,
    a.customer_id,
    a.customer_code,
    a.coach,
    a.rate_type,
    a.hour_cnt::NUMERIC AS hour_cnt,
    f.rate,
    (a.hour_cnt::NUMERIC * f.rate) AS coach_earnings
FROM (
    SELECT
        swp.receipt_number,
        swp.date,
        MAX(swp.customer_name) AS customer_name,
        MAX(swp.customer_phone_number) AS customer_phone_number,
        swp.customer_id,
        MAX(swp.customer_code) AS customer_code,
        MAX(CASE
            WHEN swp.product_name = '1 Golf Lesson Used (Boss)' THEN 'BOSS'
            WHEN swp.product_name = '1 Golf Lesson Used (Ratchavin)' THEN 'RATCHAVIN'
            WHEN swp.product_name = '1 Golf Lesson Used (Noon)' THEN 'NOON'
            WHEN swp.product_name = '1 Golf Lesson Used (Min)' THEN 'MIN'
            ELSE NULL
        END) AS coach,
        MAX(swp.rate_type) AS rate_type,
        SUM(CASE
            WHEN swp.product_name LIKE '%Lesson Used (%' THEN swp.item_cnt
            ELSE 0
        END) AS hour_cnt
    FROM sales_with_packages swp
    GROUP BY swp.receipt_number, swp.date, swp.customer_id
) a
LEFT JOIN backoffice.coach_rates f ON f.rate_type = a.rate_type

UNION ALL

-- Modern bookings data (after cutoff date)
-- Use subqueries to avoid Cartesian product from multiple LEFT JOINs
SELECT DISTINCT
    b.id AS receipt_number,
    b.date,
    b.name AS customer_name,
    b.phone_number AS customer_phone_number,
    b.customer_id,
    COALESCE(c.customer_code, ''::VARCHAR) AS customer_code,
    CASE
        WHEN b.booking_type = 'Coaching (Boss)' THEN 'BOSS'
        WHEN b.booking_type = 'Coaching (Boss - Ratchavin)' THEN 'RATCHAVIN'
        WHEN b.booking_type = 'Coaching (Noon)' THEN 'NOON'
        WHEN b.booking_type = 'Coaching (Min)' THEN 'MIN'
        ELSE NULL
    END AS coach,
    -- Get rate_type from package OR transaction_item (prefer package)
    COALESCE(
        (
            SELECT pt.name
            FROM backoffice.package_usage pu
            JOIN backoffice.packages pkg ON pu.package_id = pkg.id
            JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
            WHERE pu.booking_id = b.id
            LIMIT 1
        ),
        (
            SELECT CASE p.name
                WHEN '1 Golf Lesson' THEN 'Individual, 1 PAX'
                WHEN '1 Golf Lesson (2 PAX)' THEN 'Individual, 2 PAX'
                ELSE NULL
            END
            FROM pos.transaction_items ti
            JOIN products.products p ON ti.product_id = p.id
            JOIN products.categories pc ON p.category_id = pc.id
            WHERE ti.booking_id = b.id
              AND pc.name = 'Coaching'
            LIMIT 1
        )
    ) AS rate_type,
    b.duration::NUMERIC AS hour_cnt,
    -- Get rate from coach_rates table using the rate_type
    (
        SELECT r.rate
        FROM backoffice.coach_rates r
        WHERE r.rate_type = COALESCE(
            (
                SELECT pt.name
                FROM backoffice.package_usage pu
                JOIN backoffice.packages pkg ON pu.package_id = pkg.id
                JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
                WHERE pu.booking_id = b.id
                LIMIT 1
            ),
            (
                SELECT CASE p.name
                    WHEN '1 Golf Lesson' THEN 'Individual, 1 PAX'
                    WHEN '1 Golf Lesson (2 PAX)' THEN 'Individual, 2 PAX'
                    ELSE NULL
                END
                FROM pos.transaction_items ti
                JOIN products.products p ON ti.product_id = p.id
                JOIN products.categories pc ON p.category_id = pc.id
                WHERE ti.booking_id = b.id
                  AND pc.name = 'Coaching'
                LIMIT 1
            )
        )
        LIMIT 1
    ) AS rate,
    (
        b.duration::NUMERIC *
        (
            SELECT r.rate
            FROM backoffice.coach_rates r
            WHERE r.rate_type = COALESCE(
                (
                    SELECT pt.name
                    FROM backoffice.package_usage pu
                    JOIN backoffice.packages pkg ON pu.package_id = pkg.id
                    JOIN backoffice.package_types pt ON pkg.package_type_id = pt.id
                    WHERE pu.booking_id = b.id
                    LIMIT 1
                ),
                (
                    SELECT CASE p.name
                        WHEN '1 Golf Lesson' THEN 'Individual, 1 PAX'
                        WHEN '1 Golf Lesson (2 PAX)' THEN 'Individual, 2 PAX'
                        ELSE NULL
                    END
                    FROM pos.transaction_items ti
                    JOIN products.products p ON ti.product_id = p.id
                    JOIN products.categories pc ON p.category_id = pc.id
                    WHERE ti.booking_id = b.id
                      AND pc.name = 'Coaching'
                    LIMIT 1
                )
            )
            LIMIT 1
        )
    ) AS coach_earnings
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
        WHERE ti.booking_id = b.id
          AND pc.name = 'Coaching'
    )
);
