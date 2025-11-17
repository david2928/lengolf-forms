-- Fix auto_create_packages_from_transaction to NOT set expiration_date at purchase
-- Expiration dates should only be calculated when package is first used (via trigger)
--
-- Problem: The function was setting expiration_date = purchase_date + validity_period
-- This is incorrect - packages should have NULL expiration until first use
--
-- Solution: Remove expiration_date calculation and let the tr_set_expiration_date trigger
-- handle it automatically when first_use_date is set

CREATE OR REPLACE FUNCTION backoffice.auto_create_packages_from_transaction(p_transaction_id uuid)
RETURNS TABLE(package_id uuid, product_name text, package_type_name text, created boolean, message text)
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaction RECORD;
    v_item RECORD;
    v_mapping RECORD;
    v_package_type RECORD;
    v_customer RECORD;
    v_existing_package UUID;
    v_new_package_id UUID;
    v_discount_pct NUMERIC;
BEGIN
    -- Get transaction details
    SELECT t.*, t.transaction_date::date as trans_date
    INTO v_transaction
    FROM pos.transactions t
    WHERE t.transaction_id = p_transaction_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, ''::TEXT, ''::TEXT, FALSE, 'Transaction not found'::TEXT;
        RETURN;
    END IF;

    -- Check if transaction has payment (is paid)
    IF NOT EXISTS (
        SELECT 1 FROM pos.transaction_payments
        WHERE transaction_id = p_transaction_id
    ) THEN
        RETURN QUERY SELECT NULL::UUID, ''::TEXT, ''::TEXT, FALSE, 'Transaction not yet paid'::TEXT;
        RETURN;
    END IF;

    -- Loop through transaction items
    FOR v_item IN
        SELECT
            ti.*,
            p.name as product_name,
            c.id as customer_id,
            c.customer_name,
            COALESCE(t.staff_name, 'POS Staff') as employee_name
        FROM pos.transaction_items ti
        JOIN products.products p ON ti.product_id = p.id
        LEFT JOIN customers c ON ti.customer_id = c.id
        LEFT JOIN pos.transactions t ON ti.transaction_id = t.transaction_id
        WHERE ti.transaction_id = p_transaction_id
    LOOP
        -- Check if product maps to a package type
        SELECT * INTO v_mapping
        FROM backoffice.product_package_type_mapping
        WHERE product_id = v_item.product_id;

        IF FOUND THEN
            -- Get package type details
            SELECT * INTO v_package_type
            FROM backoffice.package_types
            WHERE id = v_mapping.package_type_id;

            -- Check if package already exists for this transaction + product
            SELECT id INTO v_existing_package
            FROM backoffice.packages
            WHERE source_transaction_id = p_transaction_id
              AND package_type_id = v_mapping.package_type_id
            LIMIT 1;

            IF v_existing_package IS NOT NULL THEN
                -- Package already exists, skip
                RETURN QUERY SELECT
                    v_existing_package,
                    v_item.product_name,
                    v_package_type.name,
                    FALSE,
                    'Package already exists'::TEXT;
            ELSE
                -- Calculate discount percentage if applicable
                IF v_item.line_discount > 0 AND v_item.subtotal > 0 THEN
                    v_discount_pct := (v_item.line_discount / (v_item.subtotal + v_item.line_discount)) * 100;
                ELSE
                    v_discount_pct := 0;
                END IF;

                -- Get discount note from discount table if applicable
                DECLARE
                    v_discount_note TEXT;
                BEGIN
                    SELECT title INTO v_discount_note
                    FROM pos.discounts
                    WHERE id = v_item.applied_discount_id;
                EXCEPTION WHEN OTHERS THEN
                    v_discount_note := NULL;
                END;

                -- Create package WITHOUT expiration_date
                -- The expiration_date will be set automatically by the tr_set_expiration_date trigger
                -- when the package is first used (first_use_date is set)
                INSERT INTO backoffice.packages (
                    customer_id,
                    customer_name,
                    package_type_id,
                    purchase_date,
                    employee_name,
                    source_transaction_id,
                    auto_created,
                    purchase_price,
                    discount_amount,
                    discount_percentage,
                    applied_discount_id,
                    discount_note,
                    last_modified_by,
                    modification_notes
                ) VALUES (
                    v_item.customer_id,
                    v_item.customer_name,
                    v_mapping.package_type_id,
                    v_transaction.trans_date,
                    v_item.employee_name,
                    p_transaction_id,
                    TRUE,
                    v_item.subtotal + COALESCE(v_item.line_discount, 0),
                    COALESCE(v_item.line_discount, 0),
                    v_discount_pct,
                    v_item.applied_discount_id,
                    v_discount_note,
                    'auto_package_creation',
                    'Automatically created from POS transaction ' || p_transaction_id::TEXT
                )
                RETURNING id INTO v_new_package_id;

                RETURN QUERY SELECT
                    v_new_package_id,
                    v_item.product_name,
                    v_package_type.name,
                    TRUE,
                    'Package created successfully'::TEXT;
            END IF;
        END IF;
    END LOOP;

    RETURN;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION backoffice.auto_create_packages_from_transaction(uuid) IS
'Automatically creates packages from a paid transaction based on product→package_type mappings.
Returns details of packages created or skipped.
NOTE: Does NOT set expiration_date - that is handled by tr_set_expiration_date trigger when package is first used.';
