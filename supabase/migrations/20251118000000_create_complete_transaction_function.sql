-- Create function to handle complete transaction creation with payments
-- This function creates a transaction, payment allocations, transaction items,
-- and closes the table session in a single atomic operation

-- Drop function if exists
DROP FUNCTION IF EXISTS public.create_complete_transaction(uuid, jsonb, integer, uuid, uuid);

-- Create the function in public schema (can be called from any schema context)
CREATE OR REPLACE FUNCTION public.create_complete_transaction(
    p_table_session_id uuid,
    p_payment_allocations jsonb,
    p_staff_id integer,
    p_customer_id uuid DEFAULT NULL,
    p_booking_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_transaction_id uuid;
    v_transaction_db_id uuid;
    v_receipt_number text;
    v_subtotal numeric;
    v_vat_amount numeric;
    v_total_amount numeric;
    v_discount_amount numeric;
    v_item RECORD;
    v_item_sequence integer;
    v_payment jsonb;
    v_customer_id uuid;
    v_booking_id uuid;
BEGIN
    -- Get table session details
    SELECT
        ts.*,
        COALESCE(ts.total_amount, 0) as session_total,
        COALESCE(ts.customer_id, p_customer_id) as resolved_customer_id,
        COALESCE(ts.booking_id::text, p_booking_id::text) as resolved_booking_id
    INTO v_session
    FROM pos.table_sessions ts
    WHERE ts.id = p_table_session_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Table session not found'
        );
    END IF;

    -- Use session's customer/booking if available, otherwise use parameters
    v_customer_id := v_session.resolved_customer_id;
    v_booking_id := v_session.resolved_booking_id::uuid;

    -- Calculate totals from session
    v_total_amount := v_session.session_total;
    v_discount_amount := 0; -- Could be extracted from current_order_items if needed
    v_vat_amount := v_total_amount * 0.07 / 1.07; -- 7% VAT included
    v_subtotal := v_total_amount - v_vat_amount;

    -- Generate receipt number (using existing function if available, else create simple one)
    BEGIN
        SELECT pos.generate_receipt_number() INTO v_receipt_number;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback: Generate simple receipt number
        v_receipt_number := 'RCP-' || TO_CHAR(NOW(), 'YYYYMMDD-') ||
                           LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    END;

    -- Generate unique transaction ID
    v_transaction_id := gen_random_uuid();

    -- Create transaction record
    INSERT INTO pos.transactions (
        id,
        transaction_id,
        receipt_number,
        table_session_id,
        customer_id,
        booking_id,
        subtotal_amount,
        net_amount,
        vat_amount,
        total_amount,
        discount_amount,
        status,
        staff_id,
        transaction_date
    ) VALUES (
        gen_random_uuid(),
        v_transaction_id,
        v_receipt_number,
        p_table_session_id,
        v_customer_id,
        v_booking_id,
        v_total_amount, -- subtotal_amount is VAT-inclusive final amount
        v_subtotal, -- net_amount is VAT-exclusive
        v_vat_amount,
        v_total_amount,
        v_discount_amount,
        'paid',
        p_staff_id,
        NOW()
    )
    RETURNING id INTO v_transaction_db_id;

    -- Create payment allocation records
    v_item_sequence := 1;
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payment_allocations)
    LOOP
        INSERT INTO pos.transaction_payments (
            transaction_id,
            payment_sequence,
            payment_method_id,
            payment_amount,
            payment_reference,
            payment_status,
            processed_by,
            processed_at
        ) VALUES (
            v_transaction_db_id,
            v_item_sequence,
            (v_payment->>'method_id')::integer,
            (v_payment->>'amount')::numeric,
            v_payment->>'reference',
            'completed',
            p_staff_id,
            NOW()
        );
        v_item_sequence := v_item_sequence + 1;
    END LOOP;

    -- Create transaction items from session's order items
    v_item_sequence := 1;

    -- Extract items from current_order_items JSONB
    IF v_session.current_order_items IS NOT NULL AND jsonb_array_length(v_session.current_order_items) > 0 THEN
        FOR v_item IN
            SELECT
                COALESCE(item->>'productId', item->>'product_id') as product_id,
                item->>'name' as product_name,
                item->>'category' as category_name,
                (item->>'quantity')::integer as quantity,
                (COALESCE(item->>'unitPrice', item->>'unit_price'))::numeric as unit_price,
                (COALESCE(item->>'totalPrice', item->>'total_price'))::numeric as total_price,
                item->>'sku' as sku_number,
                item->>'notes' as notes
            FROM jsonb_array_elements(v_session.current_order_items) as item
        LOOP
            INSERT INTO pos.transaction_items (
                transaction_id,
                line_number,
                table_session_id,
                product_id,
                staff_id,
                customer_id,
                booking_id,
                item_cnt,
                item_price_incl_vat,
                item_price_excl_vat,
                unit_price_incl_vat,
                unit_price_excl_vat,
                line_discount,
                line_total_incl_vat,
                line_total_excl_vat,
                line_vat_amount,
                item_notes,
                is_voided
            ) VALUES (
                v_transaction_db_id,
                v_item_sequence,
                p_table_session_id,
                v_item.product_id::uuid,
                p_staff_id,
                v_customer_id,
                v_booking_id,
                v_item.quantity,
                v_item.unit_price * v_item.quantity,
                (v_item.unit_price * v_item.quantity) / 1.07,
                v_item.unit_price,
                v_item.unit_price / 1.07,
                0, -- line_discount (no discount for now)
                v_item.total_price,
                v_item.total_price / 1.07,
                v_item.total_price - (v_item.total_price / 1.07),
                v_item.notes,
                FALSE
            );

            v_item_sequence := v_item_sequence + 1;
        END LOOP;
    END IF;

    -- Close the table session
    UPDATE pos.table_sessions
    SET
        status = 'closed',
        session_end = NOW(),
        pax_count = 0,
        updated_at = NOW()
    WHERE id = p_table_session_id;

    -- Return success with transaction details
    RETURN jsonb_build_object(
        'success', true,
        'transaction_db_id', v_transaction_db_id,
        'transaction_id', v_transaction_id,
        'receipt_number', v_receipt_number,
        'total_amount', v_total_amount,
        'discount_amount', v_discount_amount,
        'subtotal', v_subtotal,
        'vat_amount', v_vat_amount
    );

EXCEPTION WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION public.create_complete_transaction(uuid, jsonb, integer, uuid, uuid) IS
'Creates a complete transaction with payments, items, and closes the table session.
Parameters:
  - p_table_session_id: UUID of the table session
  - p_payment_allocations: JSONB array of {method_id, amount, reference}
  - p_staff_id: Staff member processing the transaction
  - p_customer_id: Optional customer ID (uses session customer if not provided)
  - p_booking_id: Optional booking ID (uses session booking if not provided)
Returns JSONB with success status and transaction details.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_complete_transaction(uuid, jsonb, integer, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_complete_transaction(uuid, jsonb, integer, uuid, uuid) TO service_role;
