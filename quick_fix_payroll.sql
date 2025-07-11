-- Quick Fix for Payroll System
-- This adds the most commonly missing data that causes payroll calculations to fail

-- ============================================
-- 1. ENSURE PAYROLL_SETTINGS TABLE HAS DATA
-- ============================================

-- Insert daily allowance setting if missing
INSERT INTO backoffice.payroll_settings (setting_key, setting_value, description)
VALUES ('daily_allowance_thb', '50.00', 'Daily allowance amount in THB')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================
-- 2. ENSURE PUBLIC_HOLIDAYS TABLE EXISTS AND HAS DATA
-- ============================================

-- Create public_holidays table if it doesn't exist
CREATE TABLE IF NOT EXISTS backoffice.public_holidays (
    id SERIAL PRIMARY KEY,
    holiday_date DATE NOT NULL UNIQUE,
    holiday_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add some common Thai holidays for 2025 (if not already present)
INSERT INTO backoffice.public_holidays (holiday_date, holiday_name, is_active)
VALUES 
    ('2025-01-01', 'New Year Day', true),
    ('2025-02-12', 'Chinese New Year', true),
    ('2025-02-13', 'Chinese New Year Holiday', true),
    ('2025-04-13', 'Songkran Festival', true),
    ('2025-04-14', 'Songkran Festival', true),
    ('2025-04-15', 'Songkran Festival', true),
    ('2025-05-01', 'Labour Day', true),
    ('2025-05-05', 'Coronation Day', true),
    ('2025-05-26', 'Visakha Bucha Day', true),
    ('2025-07-24', 'Asarnha Bucha Day', true),
    ('2025-07-25', 'Khao Phansa Day', true),
    ('2025-08-12', 'Mother\'s Day', true),
    ('2025-10-13', 'Passing of King Bhumibol', true),
    ('2025-10-23', 'Chulalongkorn Day', true),
    ('2025-12-05', 'Father\'s Day', true),
    ('2025-12-10', 'Constitution Day', true),
    ('2025-12-31', 'New Year\'s Eve', true)
ON CONFLICT (holiday_date) DO NOTHING;

-- ============================================
-- 3. ENSURE MONTHLY_SERVICE_CHARGE TABLE EXISTS
-- ============================================

-- Create monthly_service_charge table if it doesn't exist
CREATE TABLE IF NOT EXISTS backoffice.monthly_service_charge (
    id SERIAL PRIMARY KEY,
    charge_month DATE NOT NULL UNIQUE,
    service_charge_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add default service charge for May 2025 (if not already present)
INSERT INTO backoffice.monthly_service_charge (charge_month, service_charge_amount, notes)
VALUES ('2025-05-01', 0.00, 'Default service charge for May 2025')
ON CONFLICT (charge_month) DO NOTHING;

-- ============================================
-- 4. ENSURE STAFF HAS SERVICE CHARGE ELIGIBILITY COLUMN
-- ============================================

-- Add is_service_charge_eligible column to staff table if missing
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
        
        -- Set all active staff to be service charge eligible
        UPDATE backoffice.staff 
        SET is_service_charge_eligible = true 
        WHERE is_active = true;
        
        RAISE NOTICE 'Added is_service_charge_eligible column and set all active staff as eligible';
    END IF;
END $$;

-- ============================================
-- 5. VERIFICATION QUERY
-- ============================================

-- Verify the fix worked
SELECT 
    'Fix Status' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM backoffice.payroll_settings WHERE setting_key = 'daily_allowance_thb')
        AND EXISTS (SELECT 1 FROM backoffice.public_holidays WHERE is_active = true)
        AND EXISTS (SELECT 1 FROM backoffice.monthly_service_charge WHERE charge_month = '2025-05-01')
        THEN '✅ All required data is now present'
        ELSE '❌ Some data is still missing'
    END as status;

-- Show what was added
SELECT 'Daily Allowance' as setting_type, setting_value as value 
FROM backoffice.payroll_settings 
WHERE setting_key = 'daily_allowance_thb'

UNION ALL

SELECT 'Public Holidays' as setting_type, COUNT(*)::text as value
FROM backoffice.public_holidays 
WHERE is_active = true

UNION ALL

SELECT 'Service Charge May 2025' as setting_type, service_charge_amount::text as value
FROM backoffice.monthly_service_charge 
WHERE charge_month = '2025-05-01'; 