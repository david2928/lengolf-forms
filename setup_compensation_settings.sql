-- Setup Compensation Settings for Staff Members
-- This creates the compensation settings needed for payroll calculations

-- ============================================
-- 1. VERIFY PAYROLL TABLES EXIST
-- ============================================

-- Check if staff_compensation table exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'backoffice' 
        AND table_name = 'staff_compensation'
    ) THEN
        RAISE EXCEPTION 'staff_compensation table does not exist! Please run the payroll schema creation script first.';
    END IF;
END $$;

-- ============================================
-- 2. ADD SERVICE CHARGE ELIGIBILITY COLUMN (if missing)
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
    END IF;
END $$;

-- ============================================
-- 3. UPDATE STAFF SERVICE CHARGE ELIGIBILITY
-- ============================================

-- Update the 4 staff members to be service charge eligible
UPDATE backoffice.staff 
SET is_service_charge_eligible = true 
WHERE id IN (9, 10, 11, 12); -- Dolly=9, Net=10, May=11, Winnie=12

-- ============================================
-- 4. INSERT COMPENSATION SETTINGS
-- ============================================

-- Insert compensation settings for the 4 staff members
INSERT INTO backoffice.staff_compensation (
    staff_id, 
    base_salary, 
    ot_rate_per_hour, 
    holiday_rate_per_hour, 
    is_service_charge_eligible, 
    effective_from
) VALUES
-- Dolly (ID: 9)
(9, 15000.00, 108.00, 100.00, true, '2025-05-01'),
-- Net (ID: 10) 
(10, 15000.00, 108.00, 100.00, true, '2025-05-01'),
-- May (ID: 11)
(11, 15000.00, 108.00, 100.00, true, '2025-05-01'),
-- Winnie (ID: 12)
(12, 15000.00, 108.00, 100.00, true, '2025-05-01')
ON CONFLICT (staff_id) 
DO UPDATE SET
    base_salary = EXCLUDED.base_salary,
    ot_rate_per_hour = EXCLUDED.ot_rate_per_hour,
    holiday_rate_per_hour = EXCLUDED.holiday_rate_per_hour,
    is_service_charge_eligible = EXCLUDED.is_service_charge_eligible,
    effective_from = EXCLUDED.effective_from,
    updated_at = NOW();

-- ============================================
-- 5. INSERT PAYROLL SETTINGS (if missing)
-- ============================================

-- Insert daily allowance setting if it doesn't exist
INSERT INTO backoffice.payroll_settings (setting_key, setting_value, description) 
VALUES ('daily_allowance_thb', '100', 'Daily allowance in THB for working days (>=6 hours)')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- 6. INSERT SERVICE CHARGE FOR MAY 2025
-- ============================================

-- Insert service charge amount for May 2025 (example amount)
INSERT INTO backoffice.monthly_service_charge (month_year, total_amount, updated_at)
VALUES ('2025-05', 50000.00, NOW())
ON CONFLICT (month_year) 
DO UPDATE SET 
    total_amount = EXCLUDED.total_amount,
    updated_at = EXCLUDED.updated_at;

-- ============================================
-- 7. VERIFICATION QUERY
-- ============================================

-- Verify the compensation settings were created
SELECT 
    s.id,
    s.staff_name,
    sc.base_salary,
    sc.ot_rate_per_hour,
    sc.holiday_rate_per_hour,
    sc.is_service_charge_eligible,
    sc.effective_from,
    '✅ Ready for payroll' as status
FROM backoffice.staff s
JOIN backoffice.staff_compensation sc ON s.id = sc.staff_id
WHERE s.id IN (9, 10, 11, 12)
ORDER BY s.staff_name;

-- Show summary
SELECT 
    'Compensation settings created for ' || COUNT(*) || ' staff members' as summary
FROM backoffice.staff_compensation 
WHERE staff_id IN (9, 10, 11, 12); 