-- Script to fix the ETL duplicate join issue
-- Generated: 2025-07-12
--
-- This modifies the transform_sales_data function to handle duplicate customers gracefully

-- Create or replace the transform_sales_data function with duplicate customer handling
CREATE OR REPLACE FUNCTION pos.transform_sales_data(match_customers boolean DEFAULT false)
RETURNS TABLE(processed_count integer, inserted_count integer, error_count integer, latest_timestamp timestamptz, customers_matched integer)
LANGUAGE plpgsql
AS $function$
DECLARE
  processed_count INTEGER := 0;
  inserted_count INTEGER := 0;
  customers_matched INTEGER := 0;
  latest_ts TIMESTAMPTZ;
  min_date DATE;
  max_date DATE;
  customer_result RECORD;
BEGIN
  -- Get date range from staging data
  SELECT 
    MIN(CASE 
      WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
      THEN staging.date::DATE
      WHEN staging.date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2}$'
      THEN TO_DATE(SUBSTRING(staging.date FROM 1 FOR 10), 'DD/MM/YYYY')
      ELSE NULL 
    END),
    MAX(CASE 
      WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
      THEN staging.date::DATE
      WHEN staging.date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2}$'
      THEN TO_DATE(SUBSTRING(staging.date FROM 1 FOR 10), 'DD/MM/YYYY')
      ELSE NULL 
    END)
  INTO min_date, max_date
  FROM pos.lengolf_sales_staging staging
  WHERE staging.date IS NOT NULL
    AND staging.receipt_number IS NOT NULL
    AND staging.receipt_number != '';

  -- If we have dates, extend range by 2 days buffer on each side
  IF min_date IS NOT NULL AND max_date IS NOT NULL THEN
    min_date := min_date - INTERVAL '2 days';
    max_date := max_date + INTERVAL '2 days';
    
    -- DELETE existing data in the date range (replace completely)
    DELETE FROM pos.lengolf_sales 
    WHERE date >= min_date AND date <= max_date;
    
    RAISE NOTICE 'Deleted existing data for date range: % to %', min_date, max_date;
  END IF;

  -- PROCESS ALL STAGING DATA (no duplicate detection needed since we deleted the range)
  WITH sales_transformation AS (
    SELECT
      -- Parse date from staging.date text field
      CASE 
        WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
        THEN staging.date::DATE
        WHEN staging.date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2}$'
        THEN TO_DATE(SUBSTRING(staging.date FROM 1 FOR 10), 'DD/MM/YYYY')
        ELSE NULL 
      END AS date,
      
      staging.receipt_number,
      staging.invoice_no AS invoice_number,
      staging.invoice_payment_type,
      staging.transaction_payment_method AS payment_method,
      staging.order_type,
      staging.staff_name,
      
      -- Enhanced customer data with modifications
      TRIM(REGEXP_REPLACE(
        COALESCE(mods.customer_name_mod, staging.customer_name), 
        '\\s+', ' ', 'g'
      )) AS customer_name,
      
      COALESCE(mods.customer_phone_number_mod, staging.customer_phone_number) AS customer_phone_number,
      
      -- Customer ID matching - FIX: Use DISTINCT ON to get only one customer per phone
      CASE 
        WHEN match_customers AND staging.customer_phone_number IS NOT NULL AND staging.customer_phone_number != ''
        THEN (
          SELECT id FROM (
            SELECT DISTINCT ON (normalized_phone) 
              id, normalized_phone, created_at
            FROM public.customers
            WHERE normalized_phone = public.normalize_phone_number(
              COALESCE(mods.customer_phone_number_mod, staging.customer_phone_number)
            )
            AND normalized_phone IS NOT NULL
            AND normalized_phone != ''
            ORDER BY normalized_phone, created_at, id
          ) first_customer
          LIMIT 1
        )
        ELSE NULL
      END AS customer_id,
      
      -- Parse voided status
      CASE WHEN LOWER(TRIM(staging.voided)) = 'true' THEN TRUE ELSE FALSE END AS is_voided,
      staging.void_reason AS voided_reason,
      staging.transaction_item_notes AS item_notes,
      staging.transaction_item AS product_name,
      dim_product.category AS product_category,
      dim_product.tab AS product_tab,
      dim_product.parent_category AS product_parent_category,
      
      -- SIM usage from product table (INTEGER for easy summing)
      CASE WHEN COALESCE(dim_product.is_sim_usage, FALSE) THEN 1 ELSE 0 END AS is_sim_usage,
      
      staging.sku_number,
      
      -- Parse quantities and amounts
      CASE 
        WHEN staging.transaction_item_quantity ~ '^[0-9]+\.?[0-9]*$' 
        THEN staging.transaction_item_quantity::INTEGER 
        ELSE 1 
      END AS item_cnt,
      
      CASE 
        WHEN staging.amount_before_subsidy ~ '^[0-9]+\.?[0-9]*$' 
        THEN staging.amount_before_subsidy::NUMERIC 
        ELSE NULL 
      END AS item_price_before_discount,
      
      CASE 
        WHEN staging.transaction_item_final_amount ~ '^[0-9]+\.?[0-9]*$' 
        THEN staging.transaction_item_final_amount::NUMERIC 
        ELSE NULL 
      END AS item_price,
      
      -- Business logic calculations (unchanged)
      CASE 
        WHEN staging.amount_before_subsidy ~ '^[0-9]+\.?[0-9]*$' 
             AND staging.transaction_item_final_amount ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity::INTEGER > 0
        THEN staging.amount_before_subsidy::NUMERIC - 
             (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER)
        ELSE 0
      END AS item_discount,
      
      -- VAT calculation based on transaction date
      CASE 
        WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
             AND staging.date::DATE < '2024-09-01'
             AND staging.transaction_item_final_amount ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity::INTEGER > 0
        THEN 0.07 * (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER)
        WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
             AND staging.date::DATE >= '2024-09-01'
             AND staging.transaction_item_final_amount ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity::INTEGER > 0
        THEN 0.07 * (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER / 1.07)
        ELSE 0
      END AS item_vat,
      
      -- Price calculations excluding VAT
      CASE 
        WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
             AND staging.date::DATE < '2024-09-01'
             AND staging.transaction_item_final_amount ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity::INTEGER > 0
        THEN staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER
        WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
             AND staging.date::DATE >= '2024-09-01'
             AND staging.transaction_item_final_amount ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity::INTEGER > 0
        THEN (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER) / 1.07
        ELSE NULL
      END AS item_price_excl_vat,
      
      -- Price calculations including VAT
      CASE
        WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
             AND staging.date::DATE < '2024-09-01'
             AND staging.transaction_item_final_amount ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity::INTEGER > 0
        THEN (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER) * 1.07
        WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
             AND staging.date::DATE >= '2024-09-01'
             AND staging.transaction_item_final_amount ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity::INTEGER > 0
        THEN staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER
        ELSE NULL
      END AS item_price_incl_vat,
      
      dim_product.unit_cost AS item_cost,
      
      -- Sales totals
      CASE
        WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
             AND staging.date::DATE < '2024-09-01'
             AND staging.transaction_item_final_amount ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity::INTEGER > 0
        THEN (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER) * 1.07 * staging.transaction_item_quantity::INTEGER
        WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
             AND staging.date::DATE >= '2024-09-01'
             AND staging.transaction_item_final_amount ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity ~ '^[0-9]+\.?[0-9]*$'
             AND staging.transaction_item_quantity::INTEGER > 0
        THEN (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER) * staging.transaction_item_quantity::INTEGER
        ELSE NULL
      END AS sales_total,
      
      -- VAT totals
      CASE 
        WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
             AND staging.date::DATE < '2024-09-01'
             AND staging.transaction_item_final_amount ~ '^[0-9]+\.?[0-9]*$'
        THEN 0.07 * staging.transaction_item_final_amount::NUMERIC
        WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
             AND staging.date::DATE >= '2024-09-01'
             AND staging.transaction_item_final_amount ~ '^[0-9]+\.?[0-9]*$'
        THEN 0.07 * (staging.transaction_item_final_amount::NUMERIC / 1.07)
        ELSE 0
      END AS sales_vat,
      
      -- Timestamp handling
      CASE 
        WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
        THEN (staging.date::TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'
        WHEN staging.date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
        THEN (TO_TIMESTAMP(staging.date, 'DD/MM/YYYY HH24:MI:SS') AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'
        ELSE NULL 
      END AS sales_timestamp,
      
      CASE 
        WHEN staging.update_time ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
        THEN timezone('UTC', staging.update_time::TIMESTAMP)
        ELSE NULL 
      END AS update_time,
      
      NOW() AS created_at_bkk
      
    FROM pos.lengolf_sales_staging staging
    LEFT JOIN (
      SELECT
        receipt_number,
        MAX(CASE WHEN field_name = 'customer_name' THEN new_value ELSE NULL END) AS customer_name_mod,
        MAX(CASE WHEN field_name = 'customer_phone_number' THEN new_value ELSE NULL END) AS customer_phone_number_mod
      FROM pos.lengolf_sales_modifications
      GROUP BY receipt_number
    ) AS mods ON staging.receipt_number = mods.receipt_number
    LEFT JOIN pos.dim_product AS dim_product ON TRIM(staging.transaction_item) = TRIM(dim_product.product_name)
    WHERE staging.date IS NOT NULL
      AND staging.receipt_number IS NOT NULL
      AND staging.receipt_number != ''
  ),
  
  final_calculations AS (
    SELECT *,
      COALESCE((item_price_excl_vat * item_cnt) + (item_discount * item_cnt), 0) AS sales_gross,
      COALESCE(item_discount * item_cnt, 0) AS sales_discount,
      COALESCE(item_price_excl_vat * item_cnt, 0) AS sales_net,
      CASE 
        WHEN item_cost IS NOT NULL 
        THEN item_cost * item_cnt
        ELSE NULL
      END AS sales_cost
    FROM sales_transformation
  )
  
  -- Insert ALL processed staging records (no duplicate checking needed)
  INSERT INTO pos.lengolf_sales (
    date, receipt_number, invoice_number, invoice_payment_type, payment_method, order_type, staff_name,
    customer_name, customer_phone_number, customer_id, is_voided, voided_reason, item_notes, product_name,
    product_category, product_tab, product_parent_category, is_sim_usage, sku_number, item_cnt,
    item_price_before_discount, item_discount, item_vat, item_price_excl_vat, item_price_incl_vat,
    item_price, item_cost, sales_total, sales_vat, sales_gross, sales_discount, sales_net, sales_cost,
    gross_profit, sales_timestamp, update_time, created_at, updated_at
  )
  SELECT 
    date, receipt_number, invoice_number, invoice_payment_type, payment_method, order_type, staff_name,
    customer_name, customer_phone_number, customer_id, is_voided, voided_reason, item_notes, product_name,
    product_category, product_tab, product_parent_category, is_sim_usage, sku_number, item_cnt,
    item_price_before_discount, item_discount, item_vat, item_price_excl_vat, item_price_incl_vat,
    item_price, item_cost, sales_total, sales_vat, sales_gross, sales_discount, sales_net, sales_cost,
    CASE 
      WHEN sales_cost IS NOT NULL 
      THEN sales_net - sales_cost
      ELSE NULL
    END AS gross_profit,
    sales_timestamp, 
    update_time,
    created_at_bkk AS created_at,
    created_at_bkk AS updated_at
  FROM final_calculations
  WHERE date IS NOT NULL AND sales_timestamp IS NOT NULL;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  -- Count all processed staging records
  SELECT COUNT(*) INTO processed_count
  FROM pos.lengolf_sales_staging staging
  WHERE staging.date IS NOT NULL
    AND staging.receipt_number IS NOT NULL
    AND staging.receipt_number != '';
  
  -- If customer matching was not done during ETL, run it as a separate batch process
  IF NOT match_customers THEN
    SELECT * INTO customer_result FROM pos.update_sales_customer_ids();
    customers_matched := customer_result.total_updated;
  ELSE
    -- Count how many customers were matched during ETL
    SELECT COUNT(*) INTO customers_matched
    FROM pos.lengolf_sales
    WHERE customer_id IS NOT NULL
      AND date >= COALESCE(min_date, CURRENT_DATE)
      AND date <= COALESCE(max_date, CURRENT_DATE);
  END IF;
    
  SELECT MAX(sales_timestamp) INTO latest_ts FROM pos.lengolf_sales WHERE sales_timestamp IS NOT NULL;

  RETURN QUERY SELECT processed_count, inserted_count, 0, latest_ts, customers_matched;
END;
$function$;