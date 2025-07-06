-- Add New Staff Members and Test Data
-- This script adds Dolly, Net, May, and Winnie with compensation and time entries

-- ============================================
-- 1. ADD NEW STAFF MEMBERS
-- ============================================

-- Insert new staff members
INSERT INTO backoffice.staff (staff_name, staff_id, pin_hash, is_active, is_service_charge_eligible) VALUES
('Dolly', 'EMP005', '$2b$10$placeholder_hash_for_dolly', true, true),
('Net', 'EMP006', '$2b$10$placeholder_hash_for_net', true, true),
('May', 'EMP007', '$2b$10$placeholder_hash_for_may', true, true),
('Winnie', 'EMP008', '$2b$10$placeholder_hash_for_winnie', true, false)
ON CONFLICT (staff_id) DO NOTHING;

-- ============================================
-- 2. ADD STAFF COMPENSATION RECORDS
-- ============================================

-- Get the staff IDs for the new staff members
WITH new_staff AS (
  SELECT id, staff_name 
  FROM backoffice.staff 
  WHERE staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
)
INSERT INTO backoffice.staff_compensation (
  staff_id, 
  base_salary, 
  ot_rate_per_hour, 
  holiday_rate_per_hour, 
  is_service_charge_eligible, 
  effective_from
)
SELECT 
  ns.id as staff_id,
  CASE 
    WHEN ns.staff_name = 'Dolly' THEN 13500.00
    WHEN ns.staff_name = 'Net' THEN 13000.00
    WHEN ns.staff_name = 'May' THEN 12500.00
    WHEN ns.staff_name = 'Winnie' THEN 15000.00  -- Default salary
  END as base_salary,
  108.00 as ot_rate_per_hour,  -- Standard OT rate
  100.00 as holiday_rate_per_hour,  -- Standard holiday rate
  CASE 
    WHEN ns.staff_name IN ('Dolly', 'Net', 'May') THEN true
    WHEN ns.staff_name = 'Winnie' THEN false
  END as is_service_charge_eligible,
  '2025-06-01' as effective_from  -- Active for June 2025
FROM new_staff ns
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. ADD TEST TIME ENTRIES FOR JUNE 2025
-- ============================================

-- Add realistic time entries for each staff member in June 2025
WITH new_staff AS (
  SELECT id, staff_name 
  FROM backoffice.staff 
  WHERE staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
),
time_entries_data AS (
  SELECT 
    staff_id,
    staff_name,
    entry_date,
    clock_in_time,
    clock_out_time
  FROM (
    VALUES 
    -- Dolly's entries (good attendance)
    ((SELECT id FROM new_staff WHERE staff_name = 'Dolly'), 'Dolly', '2025-06-02', '09:00:00', '17:30:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Dolly'), 'Dolly', '2025-06-03', '08:45:00', '17:15:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Dolly'), 'Dolly', '2025-06-04', '09:15:00', '18:00:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Dolly'), 'Dolly', '2025-06-05', '08:30:00', '17:45:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Dolly'), 'Dolly', '2025-06-06', '09:00:00', '16:30:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Dolly'), 'Dolly', '2025-06-09', '08:45:00', '17:30:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Dolly'), 'Dolly', '2025-06-10', '09:00:00', '18:15:00'),
    
    -- Net's entries (with some overtime)
    ((SELECT id FROM new_staff WHERE staff_name = 'Net'), 'Net', '2025-06-02', '10:00:00', '19:00:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Net'), 'Net', '2025-06-03', '09:30:00', '18:30:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Net'), 'Net', '2025-06-04', '10:15:00', '19:15:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Net'), 'Net', '2025-06-05', '09:45:00', '20:00:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Net'), 'Net', '2025-06-09', '10:00:00', '19:30:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Net'), 'Net', '2025-06-10', '09:15:00', '18:45:00'),
    
    -- May's entries (part-time schedule)
    ((SELECT id FROM new_staff WHERE staff_name = 'May'), 'May', '2025-06-03', '14:00:00', '20:00:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'May'), 'May', '2025-06-04', '13:30:00', '19:30:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'May'), 'May', '2025-06-05', '14:15:00', '20:15:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'May'), 'May', '2025-06-06', '13:45:00', '19:45:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'May'), 'May', '2025-06-09', '14:00:00', '20:30:00'),
    
    -- Winnie's entries (irregular schedule, some short days)
    ((SELECT id FROM new_staff WHERE staff_name = 'Winnie'), 'Winnie', '2025-06-02', '11:00:00', '15:00:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Winnie'), 'Winnie', '2025-06-04', '12:00:00', '18:30:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Winnie'), 'Winnie', '2025-06-06', '10:30:00', '14:30:00'),
    ((SELECT id FROM new_staff WHERE staff_name = 'Winnie'), 'Winnie', '2025-06-10', '11:15:00', '17:45:00')
  ) AS entries(staff_id, staff_name, entry_date, clock_in_time, clock_out_time)
)
-- Insert clock-in entries
INSERT INTO backoffice.time_entries (staff_id, action, timestamp, photo_captured)
SELECT 
  staff_id,
  'clock_in' as action,
  (entry_date || ' ' || clock_in_time)::timestamp as timestamp,
  true as photo_captured
FROM time_entries_data

UNION ALL

-- Insert clock-out entries
SELECT 
  staff_id,
  'clock_out' as action,
  (entry_date || ' ' || clock_out_time)::timestamp as timestamp,
  true as photo_captured
FROM time_entries_data;

-- ============================================
-- 4. ADD SOME MULTI-SESSION DAYS (REALISTIC BREAKS)
-- ============================================

-- Add some entries with lunch breaks for more realistic data
INSERT INTO backoffice.time_entries (staff_id, action, timestamp, photo_captured)
SELECT staff_id, action, timestamp, photo_captured FROM (
  VALUES 
  -- Dolly takes lunch break on June 3rd
  ((SELECT id FROM backoffice.staff WHERE staff_name = 'Dolly'), 'clock_out', '2025-06-03 12:00:00'::timestamp, true),
  ((SELECT id FROM backoffice.staff WHERE staff_name = 'Dolly'), 'clock_in', '2025-06-03 13:00:00'::timestamp, true),
  
  -- Net takes break on June 4th
  ((SELECT id FROM backoffice.staff WHERE staff_name = 'Net'), 'clock_out', '2025-06-04 14:30:00'::timestamp, true),
  ((SELECT id FROM backoffice.staff WHERE staff_name = 'Net'), 'clock_in', '2025-06-04 15:15:00'::timestamp, true),
  
  -- May has split shift on June 5th
  ((SELECT id FROM backoffice.staff WHERE staff_name = 'May'), 'clock_out', '2025-06-05 16:00:00'::timestamp, true),
  ((SELECT id FROM backoffice.staff WHERE staff_name = 'May'), 'clock_in', '2025-06-05 18:00:00'::timestamp, true)
) AS additional_entries(staff_id, action, timestamp, photo_captured);

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Check new staff members
SELECT 
  s.id,
  s.staff_name,
  s.staff_id,
  s.is_active,
  s.is_service_charge_eligible,
  'New staff member added' as status
FROM backoffice.staff s
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
ORDER BY s.staff_name;

-- Check compensation records
SELECT 
  s.staff_name,
  sc.base_salary,
  sc.ot_rate_per_hour,
  sc.holiday_rate_per_hour,
  sc.is_service_charge_eligible,
  sc.effective_from,
  'Compensation record added' as status
FROM backoffice.staff_compensation sc
JOIN backoffice.staff s ON sc.staff_id = s.id
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
ORDER BY s.staff_name;

-- Check time entries summary
SELECT 
  s.staff_name,
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE te.action = 'clock_in') as clock_ins,
  COUNT(*) FILTER (WHERE te.action = 'clock_out') as clock_outs,
  MIN(DATE(te.timestamp)) as first_entry_date,
  MAX(DATE(te.timestamp)) as last_entry_date,
  'Time entries added' as status
FROM backoffice.time_entries te
JOIN backoffice.staff s ON te.staff_id = s.id
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
AND te.timestamp >= '2025-06-01'
AND te.timestamp <= '2025-06-30 23:59:59'
GROUP BY s.staff_name
ORDER BY s.staff_name;

-- Overall summary
SELECT 
  'SUMMARY' as section,
  'Staff Members Added' as item,
  COUNT(*) as count
FROM backoffice.staff 
WHERE staff_name IN ('Dolly', 'Net', 'May', 'Winnie')

UNION ALL

SELECT 
  'SUMMARY' as section,
  'Compensation Records Added' as item,
  COUNT(*) as count
FROM backoffice.staff_compensation sc
JOIN backoffice.staff s ON sc.staff_id = s.id
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')

UNION ALL

SELECT 
  'SUMMARY' as section,
  'Time Entries Added (June 2025)' as item,
  COUNT(*) as count
FROM backoffice.time_entries te
JOIN backoffice.staff s ON te.staff_id = s.id
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
AND te.timestamp >= '2025-06-01'
AND te.timestamp <= '2025-06-30 23:59:59';

-- ============================================
-- SCRIPT COMPLETE
-- ============================================
SELECT 'New staff setup complete! Ready for payroll processing.' as message; 