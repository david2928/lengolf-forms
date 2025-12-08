-- Enable multi-package creation from a single product (1-to-many mapping)
--
-- 1. Remove UNIQUE constraint on product_package_type_mapping(product_id)
-- 2. Update auto_create_packages_from_transaction to iterate through ALL mappings for a product
-- 3. Add new mappings for "Starter Package" and "Starter Package (2 Person)"
-- 4. Backfill missed transaction

-- 1. Remove UNIQUE constraint
ALTER TABLE backoffice.product_package_type_mapping DROP CONSTRAINT IF EXISTS product_package_type_mapping_product_id_key;

-- 2. Update function to handle multiple mappings per product
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
    v_new_package_id UUID;
    v_discount_pct NUMERIC;
    v_discount_note TEXT;
BEGIN
    -- Get transaction details - Use t.id to look up (trigger passes transactions.id)
    SELECT t.*, t.transaction_date::date as trans_date
    INTO v_transaction
    FROM pos.transactions t
    WHERE t.id = p_transaction_id;

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
            p.name::text as product_name,
            c.id as customer_id,
            c.customer_name,
            COALESCE(s.staff_name, 'POS Staff') as employee_name
        FROM pos.transaction_items ti
        JOIN products.products p ON ti.product_id = p.id
        LEFT JOIN customers c ON ti.customer_id = c.id
        LEFT JOIN backoffice.staff s ON ti.staff_id = s.id
        WHERE ti.transaction_id = p_transaction_id
    LOOP
        -- CHANGED: Loop through ALL mappings for this product (previously just picked one)
        FOR v_mapping IN
            SELECT * 
            FROM backoffice.product_package_type_mapping
            WHERE product_id = v_item.product_id
        LOOP
            -- Get package type details
            SELECT * INTO v_package_type
            FROM backoffice.package_types
            WHERE id = v_mapping.package_type_id;

            -- Calculate discount percentage if applicable
            IF v_item.line_discount > 0 AND (v_item.line_total_incl_vat + v_item.line_discount) > 0 THEN
                v_discount_pct := (v_item.line_discount / (v_item.line_total_incl_vat + v_item.line_discount)) * 100;
            ELSE
                v_discount_pct := 0;
            END IF;

            -- Get discount note from discount table if applicable
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
                v_transaction.transaction_id,  -- FK references transactions.transaction_id
                TRUE,
                v_item.line_total_incl_vat + COALESCE(v_item.line_discount, 0),
                COALESCE(v_item.line_discount, 0),
                v_discount_pct,
                v_item.applied_discount_id,
                v_discount_note,
                'auto_package_creation',
                'Automatically created from POS transaction ' || v_transaction.transaction_id::TEXT || ' (item: ' || v_item.id::TEXT || ')'
            )
            RETURNING id INTO v_new_package_id;

            RETURN QUERY SELECT
                v_new_package_id,
                v_item.product_name,
                v_package_type.name::text,
                TRUE,
                'Package created successfully (' || v_package_type.name || ')'::TEXT;
        END LOOP;
    END LOOP;

    RETURN;
END;
$$;

COMMENT ON FUNCTION backoffice.auto_create_packages_from_transaction(uuid) IS
'Automatically creates packages from a paid transaction based on product→package_type mappings.
Supports 1-to-many mappings (e.g., 1 product creates 2 packages).
Creates ONE set of packages per transaction item.
Returns details of packages created.
NOTE: Does NOT set expiration_date - that is handled by tr_set_expiration_date trigger when package is first used.';

-- 3. Insert new mappings
-- Starter Package (ID: 60c5e422-6c3b-41c9-b024-8ff451b1943b)
-- Maps to: 
--   - Starter Package (Coaching) (ID: 8)
--   - Starter Package (Sim) (ID: 9)

INSERT INTO backoffice.product_package_type_mapping (product_id, package_type_id)
VALUES 
    ('60c5e422-6c3b-41c9-b024-8ff451b1943b', 8),
    ('60c5e422-6c3b-41c9-b024-8ff451b1943b', 9)
ON CONFLICT DO NOTHING;

-- Starter Package (2 Person) (ID: 16a48c53-867f-4b83-803f-0a9fa16fd3ce)
-- Maps to:
--   - Starter Package (Sim) (ID: 9)
--   - Starter Package (Coaching, 2 Pax) (ID: 14)

INSERT INTO backoffice.product_package_type_mapping (product_id, package_type_id)
VALUES 
    ('16a48c53-867f-4b83-803f-0a9fa16fd3ce', 9),
    ('16a48c53-867f-4b83-803f-0a9fa16fd3ce', 14)
ON CONFLICT DO NOTHING;

-- 4. Backfill missed transaction
-- Transaction ID: fd4bbd45-aa4a-418d-8b61-edb022d2fe3a
-- (Receipt R20251202-1651)
SELECT * FROM backoffice.auto_create_packages_from_transaction('fd4bbd45-aa4a-418d-8b61-edb022d2fe3a');
