-- Payroll Feature Database Schema Migration
-- Story #1: Database Schema Setup
-- Creates all necessary tables for payroll functionality in backoffice schema

-- ============================================
-- 1. PUBLIC HOLIDAYS TABLE
-- ============================================
CREATE TABLE backoffice.public_holidays (
  id SERIAL PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  holiday_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. STAFF COMPENSATION TABLE
-- ============================================
CREATE TABLE backoffice.staff_compensation (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES backoffice.staff(id) ON DELETE CASCADE,
  base_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  ot_rate_per_hour DECIMAL(8,2) NOT NULL DEFAULT 0,
  holiday_rate_per_hour DECIMAL(8,2) NOT NULL DEFAULT 0,
  is_service_charge_eligible BOOLEAN DEFAULT false,
  effective_from DATE NOT NULL,
  effective_to DATE, -- NULL means currently active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_salary CHECK (base_salary >= 0),
  CONSTRAINT positive_ot_rate CHECK (ot_rate_per_hour >= 0),
  CONSTRAINT positive_holiday_rate CHECK (holiday_rate_per_hour >= 0),
  CONSTRAINT valid_date_range CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- ============================================
-- 3. PAYROLL SETTINGS TABLE
-- ============================================
CREATE TABLE backoffice.payroll_settings (
  id SERIAL PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. MONTHLY SERVICE CHARGE TABLE
-- ============================================
CREATE TABLE backoffice.monthly_service_charge (
  id SERIAL PRIMARY KEY,
  month_year TEXT NOT NULL UNIQUE, -- Format: "2024-06"
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_service_charge CHECK (total_amount >= 0),
  CONSTRAINT valid_month_format CHECK (month_year ~ '^\d{4}-\d{2}$')
);

-- ============================================
-- 5. ADD COLUMN TO EXISTING STAFF TABLE
-- ============================================
ALTER TABLE backoffice.staff 
ADD COLUMN is_service_charge_eligible BOOLEAN DEFAULT false;

-- ============================================
-- 6. PERFORMANCE INDEXES
-- ============================================

-- Index for basic time entry queries (timestamp and staff_id)
CREATE INDEX idx_time_entries_timestamp_staff ON backoffice.time_entries(timestamp, staff_id);

-- Index for staff-based time entry queries
CREATE INDEX idx_time_entries_staff_timestamp ON backoffice.time_entries(staff_id, timestamp);

-- Index for public holidays lookups
CREATE INDEX idx_public_holidays_date ON backoffice.public_holidays(holiday_date);
CREATE INDEX idx_public_holidays_active ON backoffice.public_holidays(is_active, holiday_date);

-- Index for staff compensation effective date queries
CREATE INDEX idx_staff_compensation_staff_effective ON backoffice.staff_compensation(
  staff_id, effective_from, effective_to
);

-- Index for active staff compensation
CREATE INDEX idx_staff_compensation_active ON backoffice.staff_compensation(
  staff_id, effective_from
) WHERE effective_to IS NULL;

-- Index for service charge eligibility
CREATE INDEX idx_staff_service_charge_eligible ON backoffice.staff(is_service_charge_eligible) 
WHERE is_service_charge_eligible = true;

-- ============================================
-- 7. INSERT DEFAULT SETTINGS
-- ============================================

-- Insert default daily allowance setting
INSERT INTO backoffice.payroll_settings (setting_key, setting_value, description) 
VALUES ('daily_allowance_thb', '100', 'Daily allowance in THB for working days (>=6 hours)');

-- ============================================
-- 8. SAMPLE DATA FOR TESTING
-- ============================================

-- Insert some common Thai public holidays for 2024
INSERT INTO backoffice.public_holidays (holiday_date, holiday_name) VALUES
('2024-01-01', 'New Year''s Day'),
('2024-02-12', 'Makha Bucha Day'),
('2024-04-06', 'Chakri Day'),
('2024-04-13', 'Songkran Festival'),
('2024-04-14', 'Songkran Festival'),
('2024-04-15', 'Songkran Festival'),
('2024-05-01', 'Labour Day'),
('2024-05-04', 'Coronation Day'),
('2024-05-22', 'Visakha Bucha Day'),
('2024-07-22', 'Khao Phansa Day'),
('2024-08-12', 'Her Majesty the Queen''s Birthday'),
('2024-10-13', 'Passing of King Bhumibol'),
('2024-10-23', 'Chulalongkorn Day'),
('2024-12-05', 'His Majesty the King''s Birthday'),
('2024-12-10', 'Constitution Day'),
('2024-12-31', 'New Year''s Eve');

-- Sample compensation settings for existing staff (if any exist)
-- This will be populated based on actual staff data
INSERT INTO backoffice.staff_compensation (staff_id, base_salary, ot_rate_per_hour, holiday_rate_per_hour, is_service_charge_eligible, effective_from)
SELECT 
  id as staff_id,
  15000.00 as base_salary,  -- Default 15,000 THB base salary
  108.00 as ot_rate_per_hour,  -- Default 108 THB/hour OT
  100.00 as holiday_rate_per_hour,  -- Default 100 THB/hour holiday premium
  true as is_service_charge_eligible,  -- Default eligible for service charge
  CURRENT_DATE as effective_from
FROM backoffice.staff
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- Update staff table to mark all active staff as service charge eligible by default
UPDATE backoffice.staff 
SET is_service_charge_eligible = true 
WHERE is_active = true;

-- ============================================
-- 9. VERIFICATION QUERIES
-- ============================================

-- Verify table creation
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'backoffice' 
AND tablename IN ('public_holidays', 'staff_compensation', 'payroll_settings', 'monthly_service_charge')
ORDER BY tablename;

-- Verify indexes creation
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'backoffice' 
AND (indexname LIKE 'idx_%payroll%' OR indexname LIKE 'idx_%time_entries%' OR indexname LIKE 'idx_%public_holidays%' OR indexname LIKE 'idx_%staff_compensation%' OR indexname LIKE 'idx_%service_charge%')
ORDER BY tablename, indexname;

-- Verify sample data
SELECT 'Public Holidays' as table_name, COUNT(*) as record_count FROM backoffice.public_holidays
UNION ALL
SELECT 'Staff Compensation' as table_name, COUNT(*) as record_count FROM backoffice.staff_compensation  
UNION ALL
SELECT 'Payroll Settings' as table_name, COUNT(*) as record_count FROM backoffice.payroll_settings
UNION ALL
SELECT 'Monthly Service Charge' as table_name, COUNT(*) as record_count FROM backoffice.monthly_service_charge
ORDER BY table_name;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMENT ON TABLE backoffice.public_holidays IS 'Thai public holidays for payroll holiday pay calculations';
COMMENT ON TABLE backoffice.staff_compensation IS 'Staff salary and rate settings with effective date versioning';
COMMENT ON TABLE backoffice.payroll_settings IS 'Global payroll system settings (daily allowance, etc.)';
COMMENT ON TABLE backoffice.monthly_service_charge IS 'Monthly service charge amounts for distribution';
COMMENT ON COLUMN backoffice.staff.is_service_charge_eligible IS 'Whether staff member is eligible for service charge distribution'; 