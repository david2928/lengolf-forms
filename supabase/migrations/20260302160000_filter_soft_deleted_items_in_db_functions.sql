-- Filter soft-deleted order items (quantity=0) from bill data and transaction functions
-- These functions previously included qty=0 items in line item lists and transaction records

-- Update all 3 get_bill_data variants to exclude qty=0 items from line items and totals
-- The key change in each: AND oi.quantity > 0 added to WHERE clauses

-- 1. pos.get_bill_data_v2
CREATE OR REPLACE FUNCTION pos.get_bill_data_v2(p_table_session_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    session_record RECORD;
    staff_record RECORD;
    booking_record RECORD;
    order_items JSON;
    product_items JSON;
    result JSON;
    order_items_total DECIMAL := 0;
    receipt_discount_amount DECIMAL := 0;
    discount_info JSON := NULL;
    total_incl_vat DECIMAL := 0;
    vat_rate DECIMAL := 0.07;
    total_excl_vat DECIMAL := 0;
    vat_amount DECIMAL := 0;
    session_uuid UUID;
BEGIN
    session_uuid := p_table_session_id::UUID;

    SELECT
        ts.id, ts.session_start, ts.pax_count, ts.staff_id, ts.customer_id,
        ts.booking_id, ts.applied_receipt_discount_id, ts.receipt_discount_amount,
        t.table_number, ts.status
    INTO session_record
    FROM pos.table_sessions ts
    LEFT JOIN pos.tables t ON ts.table_id = t.id
    WHERE ts.id = session_uuid AND ts.status IN ('occupied', 'paid');

    IF session_record.id IS NULL THEN
        RAISE EXCEPTION 'Table session not found or not in valid status (occupied/paid): %', p_table_session_id;
    END IF;

    IF session_record.staff_id IS NOT NULL THEN
        SELECT staff_name INTO staff_record FROM backoffice.staff WHERE id = session_record.staff_id;
    END IF;

    IF session_record.booking_id IS NOT NULL THEN
        SELECT name INTO booking_record FROM public.bookings WHERE id = session_record.booking_id;
    END IF;

    IF session_record.applied_receipt_discount_id IS NOT NULL THEN
        SELECT JSON_BUILD_OBJECT('id', d.id, 'title', d.title, 'type', d.discount_type, 'value', d.discount_value, 'amount', session_record.receipt_discount_amount)
        INTO discount_info FROM pos.discounts d WHERE d.id = session_record.applied_receipt_discount_id;
        receipt_discount_amount := COALESCE(session_record.receipt_discount_amount, 0);
    END IF;

    WITH ordered_items AS (
        SELECT
            COALESCE(p.name, 'Unknown Item') as name, oi.unit_price as price, oi.quantity as qty, oi.notes,
            oi.unit_price as originalPrice,
            CASE WHEN oi.discount_amount IS NOT NULL AND oi.discount_amount > 0 THEN oi.total_price / oi.quantity ELSE oi.unit_price END as discountedPrice,
            CASE WHEN oi.applied_discount_id IS NOT NULL THEN JSON_BUILD_OBJECT('id', d.id, 'title', d.title, 'type', d.discount_type, 'value', d.discount_value, 'amount', oi.discount_amount) ELSE NULL END as itemDiscount,
            COALESCE(oi.discount_amount, 0) as itemDiscountAmount,
            oi.total_price as totalPrice,
            o.created_at as order_created, oi.created_at as item_created
        FROM pos.orders o
        JOIN pos.order_items oi ON o.id = oi.order_id
        LEFT JOIN products.products p ON oi.product_id = p.id
        LEFT JOIN pos.discounts d ON oi.applied_discount_id = d.id
        WHERE o.table_session_id = session_uuid AND o.status = 'confirmed' AND oi.quantity > 0
        ORDER BY o.created_at ASC, oi.created_at ASC
    )
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT('name', name, 'price', price, 'qty', qty, 'notes', notes, 'originalPrice', originalPrice, 'discountedPrice', discountedPrice, 'itemDiscount', itemDiscount, 'itemDiscountAmount', itemDiscountAmount, 'totalPrice', totalPrice, '_orderCreated', order_created, '_itemCreated', item_created)
        ORDER BY order_created ASC, item_created ASC
    ) INTO product_items FROM ordered_items;

    SELECT SUM(oi.total_price) INTO order_items_total
    FROM pos.orders o JOIN pos.order_items oi ON o.id = oi.order_id
    WHERE o.table_session_id = session_uuid AND o.status = 'confirmed' AND oi.quantity > 0;

    IF order_items_total IS NULL THEN order_items_total := 0; END IF;
    IF product_items IS NULL THEN product_items := '[]'::JSON; END IF;

    total_incl_vat := order_items_total - receipt_discount_amount;
    total_excl_vat := total_incl_vat / (1 + vat_rate);
    vat_amount := total_incl_vat - total_excl_vat;

    result := JSON_BUILD_OBJECT(
        'tableSessionId', session_record.id, 'tableNumber', session_record.table_number,
        'customerName', booking_record.name, 'staffName', staff_record.staff_name,
        'sessionStart', session_record.session_start, 'paxCount', COALESCE(session_record.pax_count, 1),
        'items', product_items, 'subtotal', ROUND(total_excl_vat, 2), 'tax', ROUND(vat_amount, 2),
        'total', ROUND(total_incl_vat, 2), 'orderItemsTotal', ROUND(order_items_total, 2),
        'receiptDiscount', discount_info, 'receiptDiscountAmount', receipt_discount_amount,
        'isBill', true, 'sessionStatus', session_record.status
    );

    RETURN result;
END;
$function$;

-- 2. public.get_bill_data
CREATE OR REPLACE FUNCTION public.get_bill_data(p_table_session_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    session_record RECORD;
    staff_record RECORD;
    booking_record RECORD;
    customer_record RECORD;
    order_items JSON;
    product_items JSON;
    result JSON;
    order_items_total DECIMAL := 0;
    receipt_discount_amount DECIMAL := 0;
    discount_info JSON := NULL;
    total_incl_vat DECIMAL := 0;
    vat_rate DECIMAL := 0.07;
    total_excl_vat DECIMAL := 0;
    vat_amount DECIMAL := 0;
    session_uuid UUID;
    customer_name TEXT := NULL;
BEGIN
    session_uuid := p_table_session_id::UUID;

    SELECT ts.id, ts.session_start, ts.pax_count, ts.staff_id, ts.customer_id,
        ts.booking_id, ts.applied_receipt_discount_id, ts.receipt_discount_amount,
        t.table_number, ts.status
    INTO session_record
    FROM pos.table_sessions ts
    LEFT JOIN pos.tables t ON ts.table_id = t.id
    WHERE ts.id = session_uuid AND ts.status IN ('occupied', 'paid');

    IF session_record.id IS NULL THEN
        RAISE EXCEPTION 'Table session not found or not in valid status (occupied/paid): %', p_table_session_id;
    END IF;

    IF session_record.staff_id IS NOT NULL THEN
        SELECT staff_name INTO staff_record FROM backoffice.staff WHERE id = session_record.staff_id;
    END IF;

    IF session_record.booking_id IS NOT NULL THEN
        SELECT name INTO booking_record FROM public.bookings WHERE id = session_record.booking_id;
        customer_name := booking_record.name;
    END IF;

    IF session_record.customer_id IS NOT NULL THEN
        SELECT c.customer_name INTO customer_record FROM public.customers c WHERE c.id = session_record.customer_id;
        customer_name := customer_record.customer_name;
    END IF;

    IF session_record.applied_receipt_discount_id IS NOT NULL THEN
        SELECT JSON_BUILD_OBJECT('id', d.id, 'title', d.title, 'type', d.discount_type, 'value', d.discount_value, 'amount', session_record.receipt_discount_amount)
        INTO discount_info FROM pos.discounts d WHERE d.id = session_record.applied_receipt_discount_id;
        receipt_discount_amount := COALESCE(session_record.receipt_discount_amount, 0);
    END IF;

    WITH ordered_items AS (
        SELECT
            COALESCE(p.name, 'Unknown Item') as name, oi.unit_price as price, oi.quantity as qty, oi.notes,
            oi.unit_price as originalPrice,
            CASE WHEN oi.discount_amount IS NOT NULL AND oi.discount_amount > 0 THEN oi.total_price / oi.quantity ELSE oi.unit_price END as discountedPrice,
            CASE WHEN oi.applied_discount_id IS NOT NULL THEN JSON_BUILD_OBJECT('id', d.id, 'title', d.title, 'type', d.discount_type, 'value', d.discount_value, 'amount', oi.discount_amount) ELSE NULL END as itemDiscount,
            COALESCE(oi.discount_amount, 0) as itemDiscountAmount,
            oi.total_price as totalPrice,
            o.created_at as order_created, oi.created_at as item_created
        FROM pos.orders o
        JOIN pos.order_items oi ON o.id = oi.order_id
        LEFT JOIN products.products p ON oi.product_id = p.id
        LEFT JOIN pos.discounts d ON oi.applied_discount_id = d.id
        WHERE o.table_session_id = session_uuid AND o.status = 'confirmed' AND oi.quantity > 0
        ORDER BY o.created_at ASC, oi.created_at ASC
    )
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT('name', name, 'price', price, 'qty', qty, 'notes', notes, 'originalPrice', originalPrice, 'discountedPrice', discountedPrice, 'itemDiscount', itemDiscount, 'itemDiscountAmount', itemDiscountAmount, 'totalPrice', totalPrice)
        ORDER BY order_created ASC, item_created ASC
    ) INTO product_items FROM ordered_items;

    SELECT SUM(oi.total_price) INTO order_items_total
    FROM pos.orders o JOIN pos.order_items oi ON o.id = oi.order_id
    WHERE o.table_session_id = session_uuid AND o.status = 'confirmed' AND oi.quantity > 0;

    IF order_items_total IS NULL THEN order_items_total := 0; END IF;
    IF product_items IS NULL THEN product_items := '[]'::JSON; END IF;

    total_incl_vat := order_items_total - receipt_discount_amount;
    total_excl_vat := total_incl_vat / (1 + vat_rate);
    vat_amount := total_incl_vat - total_excl_vat;

    result := JSON_BUILD_OBJECT(
        'tableSessionId', session_record.id, 'tableNumber', session_record.table_number,
        'customerName', customer_name, 'staffName', staff_record.staff_name,
        'sessionStart', session_record.session_start, 'paxCount', COALESCE(session_record.pax_count, 1),
        'items', product_items, 'subtotal', ROUND(total_excl_vat, 2), 'tax', ROUND(vat_amount, 2),
        'total', ROUND(total_incl_vat, 2), 'orderItemsTotal', ROUND(order_items_total, 2),
        'receiptDiscount', discount_info, 'receiptDiscountAmount', receipt_discount_amount,
        'isBill', true, 'sessionStatus', session_record.status
    );

    RETURN result;
END;
$function$;

-- 3. public.get_bill_data_v2
CREATE OR REPLACE FUNCTION public.get_bill_data_v2(p_table_session_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    session_record RECORD;
    staff_record RECORD;
    booking_record RECORD;
    order_items JSON;
    product_items JSON;
    result JSON;
    order_items_total DECIMAL := 0;
    receipt_discount_amount DECIMAL := 0;
    discount_info JSON := NULL;
    total_incl_vat DECIMAL := 0;
    vat_rate DECIMAL := 0.07;
    total_excl_vat DECIMAL := 0;
    vat_amount DECIMAL := 0;
    session_uuid UUID;
BEGIN
    session_uuid := p_table_session_id::UUID;

    SELECT ts.id, ts.session_start, ts.pax_count, ts.staff_id, ts.customer_id,
        ts.booking_id, ts.applied_receipt_discount_id, ts.receipt_discount_amount,
        t.table_number, ts.status
    INTO session_record
    FROM pos.table_sessions ts
    LEFT JOIN pos.tables t ON ts.table_id = t.id
    WHERE ts.id = session_uuid AND ts.status IN ('occupied', 'paid');

    IF session_record.id IS NULL THEN
        RAISE EXCEPTION 'Table session not found or not in valid status (occupied/paid): %', p_table_session_id;
    END IF;

    IF session_record.staff_id IS NOT NULL THEN
        SELECT staff_name INTO staff_record FROM backoffice.staff WHERE id = session_record.staff_id;
    END IF;

    IF session_record.booking_id IS NOT NULL THEN
        SELECT name INTO booking_record FROM public.bookings WHERE id = session_record.booking_id;
    END IF;

    IF session_record.applied_receipt_discount_id IS NOT NULL THEN
        SELECT JSON_BUILD_OBJECT('id', d.id, 'title', d.title, 'type', d.discount_type, 'value', d.discount_value, 'amount', session_record.receipt_discount_amount)
        INTO discount_info FROM pos.discounts d WHERE d.id = session_record.applied_receipt_discount_id;
        receipt_discount_amount := COALESCE(session_record.receipt_discount_amount, 0);
    END IF;

    WITH ordered_items AS (
        SELECT
            COALESCE(p.name, 'Unknown Item') as name, oi.unit_price as price, oi.quantity as qty, oi.notes,
            oi.unit_price as originalPrice,
            CASE WHEN oi.discount_amount IS NOT NULL AND oi.discount_amount > 0 THEN oi.total_price / oi.quantity ELSE oi.unit_price END as discountedPrice,
            CASE WHEN oi.applied_discount_id IS NOT NULL THEN JSON_BUILD_OBJECT('id', d.id, 'title', d.title, 'type', d.discount_type, 'value', d.discount_value, 'amount', oi.discount_amount) ELSE NULL END as itemDiscount,
            COALESCE(oi.discount_amount, 0) as itemDiscountAmount,
            oi.total_price as totalPrice,
            o.created_at as order_created, oi.created_at as item_created
        FROM pos.orders o
        JOIN pos.order_items oi ON o.id = oi.order_id
        LEFT JOIN products.products p ON oi.product_id = p.id
        LEFT JOIN pos.discounts d ON oi.applied_discount_id = d.id
        WHERE o.table_session_id = session_uuid AND o.status = 'confirmed' AND oi.quantity > 0
        ORDER BY o.created_at ASC, oi.created_at ASC
    )
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT('name', name, 'price', price, 'qty', qty, 'notes', notes, 'originalPrice', originalPrice, 'discountedPrice', discountedPrice, 'itemDiscount', itemDiscount, 'itemDiscountAmount', itemDiscountAmount, 'totalPrice', totalPrice)
        ORDER BY order_created ASC, item_created ASC
    ) INTO product_items FROM ordered_items;

    SELECT SUM(oi.total_price) INTO order_items_total
    FROM pos.orders o JOIN pos.order_items oi ON o.id = oi.order_id
    WHERE o.table_session_id = session_uuid AND o.status = 'confirmed' AND oi.quantity > 0;

    IF order_items_total IS NULL THEN order_items_total := 0; END IF;
    IF product_items IS NULL THEN product_items := '[]'::JSON; END IF;

    total_incl_vat := order_items_total - receipt_discount_amount;
    total_excl_vat := total_incl_vat / (1 + vat_rate);
    vat_amount := total_incl_vat - total_excl_vat;

    result := JSON_BUILD_OBJECT(
        'tableSessionId', session_record.id, 'tableNumber', session_record.table_number,
        'customerName', booking_record.name, 'staffName', staff_record.staff_name,
        'sessionStart', session_record.session_start, 'paxCount', COALESCE(session_record.pax_count, 1),
        'items', product_items, 'subtotal', ROUND(total_excl_vat, 2), 'tax', ROUND(vat_amount, 2),
        'total', ROUND(total_incl_vat, 2), 'orderItemsTotal', ROUND(order_items_total, 2),
        'receiptDiscount', discount_info, 'receiptDiscountAmount', receipt_discount_amount,
        'isBill', true, 'sessionStatus', session_record.status
    );

    RETURN result;
END;
$function$;

-- 4. public.create_complete_transaction - exclude qty=0 from transaction items and count
CREATE OR REPLACE FUNCTION public.create_complete_transaction(p_table_session_id uuid, p_payment_allocations jsonb, p_staff_id integer, p_customer_id uuid DEFAULT NULL::uuid, p_booking_id text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_transaction_id UUID := gen_random_uuid();
  v_transaction_db_id UUID := gen_random_uuid();
  v_receipt_number VARCHAR;
  v_session_data RECORD;
  v_total_payment DECIMAL := 0;
  v_result JSON;
BEGIN
  SELECT SUM((value->>'amount')::DECIMAL) INTO v_total_payment
  FROM JSONB_ARRAY_ELEMENTS(p_payment_allocations);

  SELECT
    ts.subtotal_amount, ts.total_amount, ts.receipt_discount_amount,
    ts.applied_receipt_discount_id, ts.booking_id, ts.customer_id,
    d.title as discount_title, d.discount_type, d.discount_value
  INTO v_session_data
  FROM pos.table_sessions ts
  LEFT JOIN pos.discounts d ON ts.applied_receipt_discount_id = d.id
  WHERE ts.id = p_table_session_id;

  SELECT CONCAT('R', TO_CHAR(NOW(), 'YYYYMMDD'), '-',
                LPAD(NEXTVAL('receipt_sequence')::TEXT, 4, '0'))
  INTO v_receipt_number;

  INSERT INTO pos.transactions (
    id, transaction_id, receipt_number,
    subtotal_amount, discount_amount, total_amount, vat_amount,
    net_amount, table_session_id, staff_id,
    customer_id, booking_id, transaction_date, status,
    applied_discount_id, created_at, updated_at
  ) VALUES (
    v_transaction_db_id, v_transaction_id, v_receipt_number,
    v_total_payment,
    COALESCE(v_session_data.receipt_discount_amount, 0),
    v_total_payment,
    v_total_payment * 0.07 / 1.07,
    v_total_payment / 1.07,
    p_table_session_id, p_staff_id,
    COALESCE(p_customer_id, v_session_data.customer_id),
    COALESCE(p_booking_id, v_session_data.booking_id),
    NOW(), 'paid',
    v_session_data.applied_receipt_discount_id,
    NOW(), NOW()
  );

  -- Create transaction items excluding soft-deleted order items (quantity=0)
  INSERT INTO pos.transaction_items (
    id, transaction_id, table_session_id, product_id,
    line_number, item_cnt, staff_id, customer_id, booking_id,
    unit_price_incl_vat, unit_price_excl_vat,
    item_price_incl_vat, item_price_excl_vat,
    line_discount, line_total_incl_vat, line_total_excl_vat,
    line_vat_amount, applied_discount_id, item_discount, item_notes,
    sales_timestamp, created_at, updated_at, is_voided
  )
  SELECT
    gen_random_uuid(),
    v_transaction_db_id,
    p_table_session_id,
    oi.product_id,
    ROW_NUMBER() OVER (ORDER BY oi.created_at),
    oi.quantity,
    p_staff_id,
    COALESCE(p_customer_id, v_session_data.customer_id),
    COALESCE(p_booking_id, v_session_data.booking_id),
    oi.unit_price, oi.unit_price / 1.07,
    oi.unit_price * oi.quantity, (oi.unit_price * oi.quantity) / 1.07,
    COALESCE(oi.discount_amount, 0) +
    CASE WHEN v_session_data.subtotal_amount > 0
      THEN (oi.total_price / v_session_data.subtotal_amount) * COALESCE(v_session_data.receipt_discount_amount, 0)
      ELSE 0 END,
    oi.total_price -
    CASE WHEN v_session_data.subtotal_amount > 0
      THEN (oi.total_price / v_session_data.subtotal_amount) * COALESCE(v_session_data.receipt_discount_amount, 0)
      ELSE 0 END,
    (oi.total_price - CASE WHEN v_session_data.subtotal_amount > 0
      THEN (oi.total_price / v_session_data.subtotal_amount) * COALESCE(v_session_data.receipt_discount_amount, 0)
      ELSE 0 END) / 1.07,
    (oi.total_price - CASE WHEN v_session_data.subtotal_amount > 0
      THEN (oi.total_price / v_session_data.subtotal_amount) * COALESCE(v_session_data.receipt_discount_amount, 0)
      ELSE 0 END) - ((oi.total_price - CASE WHEN v_session_data.subtotal_amount > 0
      THEN (oi.total_price / v_session_data.subtotal_amount) * COALESCE(v_session_data.receipt_discount_amount, 0)
      ELSE 0 END) / 1.07),
    oi.applied_discount_id,
    COALESCE(oi.discount_amount, 0),
    oi.notes,
    NOW(), NOW(), NOW(), false
  FROM pos.orders o
  JOIN pos.order_items oi ON oi.order_id = o.id
  WHERE o.table_session_id = p_table_session_id AND o.status = 'confirmed' AND oi.quantity > 0;

  INSERT INTO pos.transaction_payments (
    id, transaction_id, payment_sequence, payment_method_id,
    payment_amount, payment_reference, payment_status, processed_at,
    processed_by, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), v_transaction_db_id, ROW_NUMBER() OVER (),
    (value->>'method_id')::INTEGER, (value->>'amount')::DECIMAL,
    (value->>'reference')::VARCHAR, 'completed', NOW(), p_staff_id, NOW(), NOW()
  FROM JSONB_ARRAY_ELEMENTS(p_payment_allocations);

  UPDATE pos.table_sessions
  SET status = 'paid', session_end = NOW(), updated_at = NOW()
  WHERE id = p_table_session_id;

  SELECT JSON_BUILD_OBJECT(
    'success', true,
    'transaction_id', v_transaction_id,
    'transaction_db_id', v_transaction_db_id,
    'receipt_number', v_receipt_number,
    'total_amount', v_total_payment,
    'discount_amount', COALESCE(v_session_data.receipt_discount_amount, 0),
    'items_processed', (
      SELECT COUNT(*)
      FROM pos.orders o
      JOIN pos.order_items oi ON oi.order_id = o.id
      WHERE o.table_session_id = p_table_session_id AND o.status = 'confirmed' AND oi.quantity > 0
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
