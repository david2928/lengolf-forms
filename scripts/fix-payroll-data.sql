-- Fix Payroll Data Script
-- This script populates missing data that's likely causing the payroll feature to fail

-- ============================================
-- 1. ADD MISSING COLUMN TO STAFF TABLE (if not exists)
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'backoffice' 
        AND table_name = 'staff' 
        AND column_name = 'is_service_charge_eligible'
    ) THEN
        ALTER TABLE backoffice.staff 
        ADD COLUMN is_service_charge_eligible BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Added is_service_charge_eligible column to staff table';
    ELSE
        RAISE NOTICE 'Column is_service_charge_eligible already exists';
    END IF;
END $$;

-- ============================================
-- 2. UPDATE ALL ACTIVE STAFF TO BE SERVICE CHARGE ELIGIBLE
-- ============================================

UPDATE backoffice.staff 
SET is_service_charge_eligible = true 
WHERE is_active = true;

-- ============================================
-- 3. INSERT MISSING STAFF COMPENSATION DATA
-- ============================================

-- Insert compensation data for all active staff who don't have it
INSERT INTO backoffice.staff_compensation (
    staff_id, 
    base_salary, 
    ot_rate_per_hour, 
    holiday_rate_per_hour, 
    is_service_charge_eligible, 
    effective_from
)
SELECT 
    s.id as staff_id,
    15000.00 as base_salary,  -- Default 15,000 THB base salary
    108.00 as ot_rate_per_hour,  -- Default 108 THB/hour OT
    100.00 as holiday_rate_per_hour,  -- Default 100 THB/hour holiday premium
    true as is_service_charge_eligible,  -- Default eligible for service charge
    CURRENT_DATE as effective_from
FROM backoffice.staff s
LEFT JOIN backoffice.staff_compensation sc ON s.id = sc.staff_id
WHERE s.is_active = true 
AND sc.staff_id IS NULL;  -- Only insert if no compensation record exists

-- ============================================
-- 4. INSERT MISSING PAYROLL SETTINGS
-- ============================================

-- Insert daily allowance setting if it doesn't exist
INSERT INTO backoffice.payroll_settings (setting_key, setting_value, description) 
SELECT 
    'daily_allowance_thb' as setting_key,
    '100' as setting_value,
    'Daily allowance in THB for working days (>=6 hours)' as description
WHERE NOT EXISTS (
    SELECT 1 FROM backoffice.payroll_settings 
    WHERE setting_key = 'daily_allowance_thb'
);

-- ============================================
-- 5. INSERT SAMPLE PUBLIC HOLIDAYS (if table is empty)
-- ============================================

-- Insert Thai public holidays for 2024 if none exist
INSERT INTO backoffice.public_holidays (holiday_date, holiday_name)
SELECT * FROM (VALUES
    ('2024-01-01'::date, 'New Year''s Day'),
    ('2024-02-12'::date, 'Makha Bucha Day'),
    ('2024-04-06'::date, 'Chakri Day'),
    ('2024-04-13'::date, 'Songkran Festival'),
    ('2024-04-14'::date, 'Songkran Festival'),
    ('2024-04-15'::date, 'Songkran Festival'),
    ('2024-05-01'::date, 'Labour Day'),
    ('2024-05-04'::date, 'Coronation Day'),
    ('2024-05-22'::date, 'Visakha Bucha Day'),
    ('2024-07-22'::date, 'Khao Phansa Day'),
    ('2024-08-12'::date, 'Her Majesty the Queen''s Birthday'),
    ('2024-10-13'::date, 'Passing of King Bhumibol'),
    ('2024-10-23'::date, 'Chulalongkorn Day'),
    ('2024-12-05'::date, 'His Majesty the King''s Birthday'),
    ('2024-12-10'::date, 'Constitution Day'),
    ('2024-12-31'::date, 'New Year''s Eve')
) AS holidays(holiday_date, holiday_name)
WHERE NOT EXISTS (
    SELECT 1 FROM backoffice.public_holidays 
    WHERE EXTRACT(YEAR FROM holiday_date) = 2024
);

-- ============================================
-- 6. VERIFICATION SUMMARY
-- ============================================

SELECT 
    'SUMMARY' as section,
    'Staff with compensation' as item,
    COUNT(*) as count,
    '✅ Fixed' as status
FROM backoffice.staff s
INNER JOIN backoffice.staff_compensation sc ON s.id = sc.staff_id
WHERE s.is_active = true

UNION ALL

SELECT 
    'SUMMARY' as section,
    'Payroll settings' as item,
    COUNT(*) as count,
    '✅ Fixed' as status
FROM backoffice.payroll_settings

UNION ALL

SELECT 
    'SUMMARY' as section,
    'Public holidays 2024' as item,
    COUNT(*) as count,
    '✅ Fixed' as status
FROM backoffice.public_holidays
WHERE EXTRACT(YEAR FROM holiday_date) = 2024

ORDER BY section, item; 