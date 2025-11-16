-- Fix get_bill_data function to handle table sessions without customers
-- This allows printing bills from bar area without selecting a customer

CREATE OR REPLACE FUNCTION public.get_bill_data(p_table_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_table_number TEXT;
    v_customer_name TEXT;
    v_staff_name TEXT;
    v_session_start TIMESTAMP;
    v_pax_count INT;
    v_items JSON;
    v_subtotal DECIMAL;
    v_tax DECIMAL;
    v_total DECIMAL;
    v_order_items_total DECIMAL;
    v_receipt_discount JSON;
    v_receipt_discount_amount DECIMAL;
BEGIN
    -- Get table session data with LEFT JOIN to allow null customer
    SELECT
        t.table_number::TEXT,
        c.customer_name,
        s.staff_name,
        ts.session_start,
        COALESCE(ts.pax_count, 0)
    INTO
        v_table_number,
        v_customer_name,
        v_staff_name,
        v_session_start,
        v_pax_count
    FROM pos.table_sessions ts
    JOIN pos.tables t ON ts.table_id = t.id
    LEFT JOIN public.customers c ON ts.customer_id = c.id  -- LEFT JOIN allows null customer
    LEFT JOIN public.staff s ON ts.staff_id = s.id
    WHERE ts.id = p_table_session_id
        AND ts.status IN ('occupied', 'paid');

    -- Check if table session exists
    IF v_table_number IS NULL THEN
        RAISE EXCEPTION 'Table session not found or not active: %', p_table_session_id;
    END IF;

    -- Get order items with discounts
    SELECT COALESCE(json_agg(
        json_build_object(
            'name', p.product_name,
            'price', oi.unit_price,
            'qty', oi.quantity,
            'notes', oi.notes,
            'originalPrice', oi.original_price,
            'discountedPrice', oi.discounted_price,
            'itemDiscount', CASE
                WHEN d.id IS NOT NULL THEN
                    json_build_object(
                        'id', d.id,
                        'title', d.discount_title,
                        'type', d.discount_type,
                        'value', d.discount_value,
                        'amount', oi.discount_amount
                    )
                ELSE NULL
            END,
            'itemDiscountAmount', COALESCE(oi.discount_amount, 0),
            'totalPrice', oi.total_price
        )
    ), '[]'::json)
    INTO v_items
    FROM pos.table_orders tor
    JOIN pos.orders o ON tor.order_id = o.id
    JOIN pos.order_items oi ON o.id = oi.order_id
    JOIN pos.products p ON oi.product_id = p.id
    LEFT JOIN pos.discounts d ON oi.discount_id = d.id
    WHERE tor.table_session_id = p_table_session_id
        AND o.order_status != 'cancelled';

    -- Calculate totals
    SELECT
        COALESCE(SUM(oi.total_price), 0)
    INTO v_order_items_total
    FROM pos.table_orders tor
    JOIN pos.orders o ON tor.order_id = o.id
    JOIN pos.order_items oi ON o.id = oi.order_id
    WHERE tor.table_session_id = p_table_session_id
        AND o.order_status != 'cancelled';

    -- Get receipt discount if applied
    SELECT
        json_build_object(
            'id', d.id,
            'title', d.discount_title,
            'type', d.discount_type,
            'value', d.discount_value,
            'amount', ts.receipt_discount_amount
        ),
        COALESCE(ts.receipt_discount_amount, 0)
    INTO
        v_receipt_discount,
        v_receipt_discount_amount
    FROM pos.table_sessions ts
    LEFT JOIN pos.discounts d ON ts.receipt_discount_id = d.id
    WHERE ts.id = p_table_session_id;

    -- Calculate final totals
    v_subtotal := v_order_items_total - COALESCE(v_receipt_discount_amount, 0);
    v_tax := v_subtotal * 0.07; -- 7% VAT
    v_total := v_subtotal + v_tax;

    -- Build result JSON
    v_result := json_build_object(
        'tableSessionId', p_table_session_id,
        'tableNumber', v_table_number,
        'customerName', v_customer_name,  -- Can be NULL for bar area sales
        'staffName', v_staff_name,
        'sessionStart', v_session_start,
        'paxCount', v_pax_count,
        'items', v_items,
        'subtotal', v_subtotal,
        'tax', v_tax,
        'total', v_total,
        'orderItemsTotal', v_order_items_total,
        'receiptDiscount', v_receipt_discount,
        'receiptDiscountAmount', v_receipt_discount_amount
    );

    RETURN v_result;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.get_bill_data(UUID) IS
'Retrieves bill data for a table session. Supports sessions without customers (e.g., bar area walk-ins). Returns JSON with table, customer (nullable), items, and totals.';
