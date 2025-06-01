-- Setup Supabase Cron for Weekly Inventory Reports
-- This will replace the Vercel cron job with a Supabase-based solution

-- First, enable the pg_cron extension if not already enabled
-- (This should be done via the Supabase dashboard under Integrations > Cron)

-- Create a database function to call the weekly inventory report API
CREATE OR REPLACE FUNCTION trigger_weekly_inventory_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    response_status int;
    response_body text;
    api_url text;
BEGIN
    -- Set the API URL - replace with your actual domain
    api_url := 'https://your-app-domain.vercel.app/api/inventory/weekly-report';
    
    -- Make HTTP request to trigger the weekly report
    SELECT status, content INTO response_status, response_body
    FROM http_post(
        api_url,
        '{}',  -- Empty JSON body for POST request
        'application/json'
    );
    
    -- Log the result
    IF response_status = 200 THEN
        RAISE NOTICE 'Weekly inventory report triggered successfully';
    ELSE
        RAISE WARNING 'Weekly inventory report failed with status: %, body: %', response_status, response_body;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error triggering weekly inventory report: %', SQLERRM;
END;
$$;

-- Create a cron job to run every Monday at 2 AM UTC (9 AM Thailand time)
-- This replaces the Vercel cron job "0 2 * * 1"
SELECT cron.schedule(
    'weekly-inventory-report',           -- Job name
    '0 2 * * 1',                        -- Cron schedule (Monday 2 AM UTC)
    'SELECT trigger_weekly_inventory_report();'
);

-- Alternative: Create a more direct approach using SQL to generate and send the report
-- This version keeps everything in the database without external HTTP calls

CREATE OR REPLACE FUNCTION generate_and_send_inventory_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    latest_date date;
    low_stock_items text[];
    report_message text;
    line_webhook_url text;
    http_response record;
BEGIN
    -- Get the latest submission date
    SELECT date INTO latest_date
    FROM inventory_submission
    ORDER BY date DESC
    LIMIT 1;
    
    IF latest_date IS NULL THEN
        RAISE NOTICE 'No inventory data found';
        RETURN;
    END IF;
    
    -- Initialize array for low stock items
    low_stock_items := ARRAY[]::text[];
    
    -- Find items that need reordering
    WITH latest_inventory AS (
        SELECT DISTINCT ON (product_id)
            product_id,
            value_numeric,
            value_text,
            created_at
        FROM inventory_submission
        WHERE date = latest_date
        ORDER BY product_id, created_at DESC
    ),
    low_stock AS (
        SELECT 
            p.name as product_name,
            p.supplier,
            p.input_type,
            p.reorder_threshold,
            li.value_numeric,
            li.value_text,
            CASE 
                WHEN p.input_type = 'number' AND li.value_numeric IS NOT NULL AND p.reorder_threshold IS NOT NULL
                    THEN li.value_numeric <= p.reorder_threshold
                WHEN p.input_type = 'stock_slider'
                    THEN true  -- Task 4: All slider products should go to "Need to order"
                ELSE false
            END as needs_reorder,
            CASE 
                WHEN p.input_type = 'number' THEN li.value_numeric::text
                ELSE li.value_text
            END as value_display
        FROM latest_inventory li
        JOIN inventory_products p ON p.id = li.product_id
        WHERE p.is_active = true
    )
    SELECT array_agg(
        product_name || ' levels are low, only ' || 
        COALESCE(value_display, 'Unknown') || ' in stock.' ||
        CASE WHEN supplier IS NOT NULL AND supplier != '' 
             THEN ' Re-order from ' || supplier || '.'
             ELSE ''
        END
    )
    INTO low_stock_items
    FROM low_stock
    WHERE needs_reorder = true;
    
    -- Generate report message
    report_message := '🛒 Weekly Inventory Update 🛒' || E'\n\n' || 'This week''s inventory status:' || E'\n\n';
    
    IF array_length(low_stock_items, 1) > 0 THEN
        report_message := report_message || 'Items to be re-ordered:' || E'\n\n';
        
        -- Add each low stock item
        FOR i IN 1..array_length(low_stock_items, 1) LOOP
            report_message := report_message || low_stock_items[i] || E'\n';
        END LOOP;
        
        report_message := report_message || E'\n' || 'Please proceed with the necessary orders.';
    ELSE
        report_message := report_message || 'All inventory levels are good! No items need to be re-ordered at this time.';
    END IF;
    
    -- Send to LINE (you'll need to set the webhook URL)
    line_webhook_url := 'https://api.line.me/v2/bot/message/push';
    
    -- Note: You'll need to configure the LINE webhook properly with authentication
    -- This is a simplified version - you may need to use a different approach
    -- depending on your LINE bot setup
    
    RAISE NOTICE 'Generated inventory report: %', report_message;
    
    -- For now, just log the message. To actually send to LINE, you'd need
    -- to set up proper HTTP authentication with LINE's API
    
END;
$$;

-- Schedule the direct database function version
-- Comment out the previous cron job first if you want to use this version instead
/*
SELECT cron.unschedule('weekly-inventory-report');

SELECT cron.schedule(
    'weekly-inventory-report-direct',    -- Job name
    '0 2 * * 1',                        -- Cron schedule (Monday 2 AM UTC)
    'SELECT generate_and_send_inventory_report();'
);
*/

-- View scheduled cron jobs
SELECT * FROM cron.job;

-- To delete a cron job if needed:
-- SELECT cron.unschedule('job-name-here'); 