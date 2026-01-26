-- OB Calling Queue Auto-Generation Functions
-- Created: 2026-01-26
-- Purpose: Replace manual audience selection with automatically generated calling queue
-- Note: Handles legacy data where follow_up_date may be NULL but follow_up_required is true

-- ============================================================================
-- Function 1: get_ob_calling_queue
-- Returns paginated list of customers eligible for OB calls
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_ob_calling_queue(
    p_offset INTEGER DEFAULT 0,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    customer_code VARCHAR,
    customer_name VARCHAR,
    contact_number VARCHAR,
    email VARCHAR,
    lifetime_spending NUMERIC,
    total_bookings INTEGER,
    last_visit_date DATE,
    active_packages BIGINT,
    last_package_name VARCHAR,
    last_package_type TEXT,
    last_package_first_use_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH latest_calls AS (
        -- Get most recent call per customer
        SELECT DISTINCT ON (osn.customer_id)
            osn.customer_id,
            osn.reachable,
            osn.response,
            osn.follow_up_required,
            osn.follow_up_date,
            osn.call_date,
            osn.created_at
        FROM marketing.ob_sales_notes osn
        ORDER BY osn.customer_id, osn.created_at DESC
    ),
    customers_with_future_bookings AS (
        -- Get customers who have any future confirmed booking
        SELECT DISTINCT b.customer_id
        FROM public.bookings b
        WHERE b.date >= CURRENT_DATE
        AND b.status = 'confirmed'
        AND b.customer_id IS NOT NULL
    )
    SELECT
        cma.id,
        cma.customer_code,
        cma.customer_name,
        cma.contact_number,
        cma.email,
        cma.lifetime_spending,
        cma.total_bookings,
        cma.last_visit_date,
        cma.active_packages,
        cma.last_package_name,
        cma.last_package_type::TEXT,
        cma.last_package_first_use_date
    FROM public.customer_marketing_analytics cma
    -- Exclude customers with future bookings
    LEFT JOIN customers_with_future_bookings fb ON fb.customer_id = cma.id
    -- Get latest call info
    LEFT JOIN latest_calls lc ON lc.customer_id = cma.id
    WHERE
        -- Thai phone number filter (must have valid Thai phone)
        cma.contact_number IS NOT NULL
        AND (
            cma.contact_number ~ '^0[0-9]{9}$'           -- 0812345678
            OR cma.contact_number ~ '^\+66[0-9]{9}$'     -- +66812345678
            OR cma.contact_number ~ '^66[0-9]{9}$'       -- 66812345678
            OR cma.contact_number ~ '^[689][0-9]{8}$'    -- 812345678 (9 digits starting with 6,8,9)
        )
        -- No future bookings
        AND fb.customer_id IS NULL
        -- No visit in last 90 days (or never visited)
        AND (cma.last_visit_date < CURRENT_DATE - INTERVAL '90 days' OR cma.last_visit_date IS NULL)
        -- Call history exclusion logic
        AND (
            -- Never called - eligible
            lc.customer_id IS NULL
            OR (
                -- Unreachable: eligible after 30 days
                lc.reachable = false
                AND lc.call_date < CURRENT_DATE - INTERVAL '30 days'
            )
            OR (
                -- Negative: eligible after 180 days (6 months)
                lc.response = 'negative'
                AND lc.call_date < CURRENT_DATE - INTERVAL '180 days'
            )
            OR (
                -- Positive/Neutral WITHOUT follow-up required: eligible after 90 days
                lc.response IN ('positive', 'neutral')
                AND lc.follow_up_required = false
                AND lc.call_date < CURRENT_DATE - INTERVAL '90 days'
            )
            -- Note: Customers with follow_up_required = true are excluded and handled by Follow-ups view
        )
        -- Exclude those with pending follow-ups (they go to Follow-ups view)
        -- This handles both legacy (follow_up_date NULL) and new (follow_up_date set) records
        AND NOT (
            lc.customer_id IS NOT NULL
            AND lc.follow_up_required = true
        )
    ORDER BY cma.lifetime_spending DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_ob_calling_queue(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ob_calling_queue(INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION public.get_ob_calling_queue IS 'Returns paginated list of customers eligible for OB calling queue based on business rules';

-- ============================================================================
-- Function 2: count_ob_calling_queue
-- Returns total count of customers eligible for OB calls
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_ob_calling_queue()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    queue_count INTEGER;
BEGIN
    WITH latest_calls AS (
        -- Get most recent call per customer
        SELECT DISTINCT ON (osn.customer_id)
            osn.customer_id,
            osn.reachable,
            osn.response,
            osn.follow_up_required,
            osn.follow_up_date,
            osn.call_date,
            osn.created_at
        FROM marketing.ob_sales_notes osn
        ORDER BY osn.customer_id, osn.created_at DESC
    ),
    customers_with_future_bookings AS (
        -- Get customers who have any future confirmed booking
        SELECT DISTINCT b.customer_id
        FROM public.bookings b
        WHERE b.date >= CURRENT_DATE
        AND b.status = 'confirmed'
        AND b.customer_id IS NOT NULL
    )
    SELECT COUNT(*)::INTEGER INTO queue_count
    FROM public.customer_marketing_analytics cma
    -- Exclude customers with future bookings
    LEFT JOIN customers_with_future_bookings fb ON fb.customer_id = cma.id
    -- Get latest call info
    LEFT JOIN latest_calls lc ON lc.customer_id = cma.id
    WHERE
        -- Thai phone number filter
        cma.contact_number IS NOT NULL
        AND (
            cma.contact_number ~ '^0[0-9]{9}$'
            OR cma.contact_number ~ '^\+66[0-9]{9}$'
            OR cma.contact_number ~ '^66[0-9]{9}$'
            OR cma.contact_number ~ '^[689][0-9]{8}$'
        )
        -- No future bookings
        AND fb.customer_id IS NULL
        -- No visit in last 90 days
        AND (cma.last_visit_date < CURRENT_DATE - INTERVAL '90 days' OR cma.last_visit_date IS NULL)
        -- Call history exclusion logic
        AND (
            lc.customer_id IS NULL
            OR (
                lc.reachable = false
                AND lc.call_date < CURRENT_DATE - INTERVAL '30 days'
            )
            OR (
                lc.response = 'negative'
                AND lc.call_date < CURRENT_DATE - INTERVAL '180 days'
            )
            OR (
                lc.response IN ('positive', 'neutral')
                AND lc.follow_up_required = false
                AND lc.call_date < CURRENT_DATE - INTERVAL '90 days'
            )
        )
        -- Exclude those with pending follow-ups (including legacy without date)
        AND NOT (
            lc.customer_id IS NOT NULL
            AND lc.follow_up_required = true
        );

    RETURN queue_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.count_ob_calling_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_ob_calling_queue() TO service_role;

COMMENT ON FUNCTION public.count_ob_calling_queue IS 'Returns total count of customers eligible for OB calling queue';

-- ============================================================================
-- Function 3: get_ob_followups
-- Returns customers with scheduled follow-ups (most recent call has follow-up)
-- Includes legacy records where follow_up_date may be NULL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_ob_followups(
    p_offset INTEGER DEFAULT 0,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    customer_code VARCHAR,
    customer_name VARCHAR,
    contact_number VARCHAR,
    email VARCHAR,
    lifetime_spending NUMERIC,
    total_bookings INTEGER,
    last_visit_date DATE,
    active_packages BIGINT,
    last_package_name VARCHAR,
    last_package_type TEXT,
    last_package_first_use_date DATE,
    follow_up_date DATE,
    last_call_date DATE,
    last_call_notes TEXT,
    last_call_response TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH latest_calls AS (
        -- Get most recent call per customer
        SELECT DISTINCT ON (osn.customer_id)
            osn.customer_id,
            osn.follow_up_required,
            osn.follow_up_date,
            osn.call_date,
            osn.notes,
            osn.response,
            osn.created_at
        FROM marketing.ob_sales_notes osn
        ORDER BY osn.customer_id, osn.created_at DESC
    )
    SELECT
        cma.id,
        cma.customer_code,
        cma.customer_name,
        cma.contact_number,
        cma.email,
        cma.lifetime_spending,
        cma.total_bookings,
        cma.last_visit_date,
        cma.active_packages,
        cma.last_package_name,
        cma.last_package_type::TEXT,
        cma.last_package_first_use_date,
        lc.follow_up_date,
        lc.call_date AS last_call_date,
        lc.notes AS last_call_notes,
        lc.response AS last_call_response
    FROM public.customer_marketing_analytics cma
    INNER JOIN latest_calls lc ON lc.customer_id = cma.id
    WHERE
        -- Must have follow-up required in most recent call
        -- (follow_up_date may be NULL for legacy records)
        lc.follow_up_required = true
    ORDER BY lc.follow_up_date ASC NULLS LAST, lc.call_date DESC, cma.lifetime_spending DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_ob_followups(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ob_followups(INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION public.get_ob_followups IS 'Returns customers with scheduled follow-ups sorted by follow-up date (includes legacy records without date)';

-- ============================================================================
-- Function 4: count_ob_followups
-- Returns total count of customers with scheduled follow-ups
-- Includes legacy records where follow_up_date may be NULL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_ob_followups()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    followup_count INTEGER;
BEGIN
    WITH latest_calls AS (
        -- Get most recent call per customer
        SELECT DISTINCT ON (osn.customer_id)
            osn.customer_id,
            osn.follow_up_required,
            osn.follow_up_date,
            osn.created_at
        FROM marketing.ob_sales_notes osn
        ORDER BY osn.customer_id, osn.created_at DESC
    )
    SELECT COUNT(*)::INTEGER INTO followup_count
    FROM latest_calls lc
    WHERE
        -- Must have follow-up required (date may be NULL for legacy)
        lc.follow_up_required = true;

    RETURN followup_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.count_ob_followups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_ob_followups() TO service_role;

COMMENT ON FUNCTION public.count_ob_followups IS 'Returns total count of customers with scheduled follow-ups (includes legacy records without date)';

-- ============================================================================
-- Create indexes for performance optimization
-- ============================================================================

-- Index on ob_sales_notes for faster latest call lookup
CREATE INDEX IF NOT EXISTS idx_ob_sales_notes_customer_created
ON marketing.ob_sales_notes(customer_id, created_at DESC);

-- Index for follow-up queries
CREATE INDEX IF NOT EXISTS idx_ob_sales_notes_followup
ON marketing.ob_sales_notes(customer_id, follow_up_required, follow_up_date)
WHERE follow_up_required = true;

-- Index for call_date filtering
CREATE INDEX IF NOT EXISTS idx_ob_sales_notes_call_date
ON marketing.ob_sales_notes(customer_id, call_date);
