-- Add Hourly Staff Support Migration Script
-- This script extends the payroll system to support hourly-only staff members

-- ============================================
-- 1. ADD HOURLY STAFF SUPPORT COLUMNS
-- ============================================

-- Add new columns to staff_compensation table
ALTER TABLE backoffice.staff_compensation 
ADD COLUMN IF NOT EXISTS compensation_type TEXT CHECK (compensation_type IN ('salary', 'hourly')) DEFAULT 'salary',
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_hours_for_allowance INTEGER DEFAULT 6;

-- ============================================
-- 2. UPDATE CONSTRAINTS FOR HOURLY STAFF
-- ============================================

-- Remove old constraint if it exists
ALTER TABLE backoffice.staff_compensation 
DROP CONSTRAINT IF EXISTS positive_salary;

-- Add new constraint that allows base_salary = 0 for hourly staff
ALTER TABLE backoffice.staff_compensation 
ADD CONSTRAINT valid_compensation CHECK (
  (compensation_type = 'salary' AND base_salary > 0) OR
  (compensation_type = 'hourly' AND hourly_rate > 0 AND base_salary = 0)
);

-- Ensure hourly_rate is positive when compensation_type is hourly
ALTER TABLE backoffice.staff_compensation 
ADD CONSTRAINT positive_hourly_rate CHECK (
  (compensation_type = 'salary') OR 
  (compensation_type = 'hourly' AND hourly_rate > 0)
);

-- ============================================
-- 3. UPDATE EXISTING DATA TO SALARY TYPE
-- ============================================

-- Mark all existing staff as salary-based (preserves existing data)
UPDATE backoffice.staff_compensation 
SET compensation_type = 'salary' 
WHERE compensation_type IS NULL;

-- ============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for compensation type queries
CREATE INDEX IF NOT EXISTS idx_staff_compensation_type ON backoffice.staff_compensation(compensation_type);

-- ============================================
-- 5. SAMPLE HOURLY STAFF DATA (for testing)
-- ============================================

-- Insert a sample hourly staff member for testing
-- This assumes staff with ID 13 exists, otherwise adjust the ID
INSERT INTO backoffice.staff_compensation (
    staff_id, 
    compensation_type,
    base_salary,
    hourly_rate,
    ot_rate_per_hour, 
    holiday_rate_per_hour, 
    is_service_charge_eligible, 
    effective_from
) VALUES (
    13, -- Adjust this ID to match an existing staff member
    'hourly',
    0.00, -- No base salary for hourly staff
    150.00, -- 150 THB per hour
    225.00, -- 1.5x hourly rate for overtime
    187.50, -- 1.25x hourly rate for holidays
    true, -- Eligible for service charge
    '2025-01-01'
) ON CONFLICT (staff_id) DO NOTHING;

-- ============================================
-- 6. VERIFICATION QUERY
-- ============================================

-- Verify the changes
SELECT 
    'Migration completed successfully' as status,
    COUNT(CASE WHEN compensation_type = 'salary' THEN 1 END) as salary_staff,
    COUNT(CASE WHEN compensation_type = 'hourly' THEN 1 END) as hourly_staff,
    COUNT(*) as total_staff
FROM backoffice.staff_compensation
WHERE effective_to IS NULL;

-- Show sample data structure
SELECT 
    sc.staff_id,
    s.staff_name,
    sc.compensation_type,
    sc.base_salary,
    sc.hourly_rate,
    sc.ot_rate_per_hour,
    sc.holiday_rate_per_hour,
    sc.is_service_charge_eligible,
    CASE 
        WHEN sc.compensation_type = 'salary' THEN '✅ Salary + Allowance eligible'
        WHEN sc.compensation_type = 'hourly' THEN '✅ Hourly only (no allowance)'
        ELSE '❌ Unknown type'
    END as compensation_summary
FROM backoffice.staff_compensation sc
JOIN backoffice.staff s ON sc.staff_id = s.id
WHERE sc.effective_to IS NULL
ORDER BY sc.compensation_type, s.staff_name; 