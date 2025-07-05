DROP FUNCTION IF EXISTS public.get_student_coaching_summary(text);

CREATE OR REPLACE FUNCTION public.get_student_coaching_summary(p_coach_code TEXT)
RETURNS TABLE (
    student_name TEXT,
    last_lesson_date DATE,
    total_lessons BIGINT,
    packages JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH lesson_counts AS (
        SELECT 
            sub.stable_hash_id,
            max(trim(sub.customer_name)) as student_name,
            MAX(sub.date) as last_lesson_date,
            SUM(sub.hour_cnt) as lesson_count
        FROM (
            SELECT 
                a.id,
                a.date,
                a.customer_name,
                a.customer_phone_number,
                b.stable_hash_id,
                UPPER(
                  MAX(CASE WHEN product_name LIKE '%Lesson Used (%' THEN substring(product_name from '\(([^)]+)\)') END)
                ) as coach,
                MAX(
                  CASE 
                    WHEN product_name = '1 Golf Lesson' THEN 'Individual, 1 PAX'
                    WHEN product_name = '1 Golf Lesson (2 PAX)' THEN 'Individual, 2 PAX'
                    ELSE d.name 
                  END
                ) as rate_type,
                COUNT(DISTINCT a.id) as hour_cnt
            FROM pos.lengolf_sales a
            LEFT JOIN backoffice.customers b ON regexp_replace(ltrim(a.customer_phone_number, '0'), '^0+', '') = regexp_replace(ltrim(b.contact_number, '0'), '^0+', '')
            LEFT JOIN backoffice.packages c ON b.stable_hash_id = c.stable_hash_id
            LEFT JOIN backoffice.package_types d ON c.package_type_id = d.id
            LEFT JOIN backoffice.package_usage e ON c.id = e.package_id AND a.date = e.used_date
            WHERE a.receipt_number IN (
                SELECT DISTINCT receipt_number 
                FROM pos.lengolf_sales 
                WHERE product_name LIKE '%Lesson Used (%'
            )
            AND (d.type = 'Coaching' OR d.type IS NULL)
            AND a.product_name LIKE '%Lesson%'
            GROUP BY a.id, a.date, a.customer_name, a.customer_phone_number, b.stable_hash_id
        ) sub
        WHERE sub.coach = UPPER(p_coach_code)
        GROUP BY sub.stable_hash_id
    ),
    student_packages_with_usage AS (
        SELECT
            p.stable_hash_id,
            p.id as package_id,
            pt.name as package_name,
            pt.hours as total_sessions,
            p.purchase_date,
            p.expiration_date,
            COALESCE(puc.used_sessions, 0) as used_sessions
        FROM backoffice.packages p
        JOIN backoffice.package_types pt ON p.package_type_id = pt.id
        LEFT JOIN (
            SELECT package_id, SUM(used_hours) as used_sessions
            FROM backoffice.package_usage
            GROUP BY package_id
        ) puc ON p.id = puc.package_id
        WHERE
            pt.type = 'Coaching'
            AND p.stable_hash_id IN (SELECT stable_hash_id FROM lesson_counts)
    )
    SELECT
        lc.student_name,
        lc.last_lesson_date,
        COALESCE(lc.lesson_count, 0)::bigint as total_lessons,
        jsonb_agg(
            jsonb_build_object(
                'package_name', spu.package_name,
                'total_sessions', spu.total_sessions,
                'purchase_date', spu.purchase_date,
                'expiration_date', spu.expiration_date,
                'status',
                    CASE
                        WHEN (spu.total_sessions - spu.used_sessions) <= 0 THEN 'Past'
                        WHEN spu.expiration_date IS NOT NULL AND spu.expiration_date < CURRENT_DATE THEN 'Past'
                        ELSE 'Active'
                    END,
                'used_sessions', spu.used_sessions,
                'remaining_sessions', (spu.total_sessions - spu.used_sessions)
            )
        ) FILTER (WHERE spu.package_id IS NOT NULL) as packages
    FROM lesson_counts lc
    LEFT JOIN student_packages_with_usage spu ON lc.stable_hash_id = spu.stable_hash_id
    GROUP BY lc.student_name, lc.last_lesson_date, lc.lesson_count;

END;
$$ LANGUAGE plpgsql; 