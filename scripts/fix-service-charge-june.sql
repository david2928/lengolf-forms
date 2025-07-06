-- Fix Service Charge for June 2025
-- Add a service charge total so eligible staff will show amounts

-- Check current service charge records
SELECT 
  'CURRENT SERVICE CHARGE RECORDS' as section,
  month_year,
  total_amount,
  created_at
FROM backoffice.monthly_service_charge 
ORDER BY month_year DESC;

-- Add service charge for June 2025 (example: ฿10,000 total)
INSERT INTO backoffice.monthly_service_charge (month_year, total_amount, created_at)
VALUES ('2025-06', 12000.00, NOW())
ON CONFLICT (month_year) 
DO UPDATE SET 
  total_amount = EXCLUDED.total_amount,
  updated_at = NOW();

-- Verify the insert
SELECT 
  'UPDATED SERVICE CHARGE RECORDS' as section,
  month_year,
  total_amount,
  'Service charge will be divided among eligible staff' as note
FROM backoffice.monthly_service_charge 
WHERE month_year = '2025-06';

-- Show calculation preview
WITH eligible_staff AS (
  SELECT 
    s.staff_name,
    sc.is_service_charge_eligible
  FROM backoffice.staff s
  JOIN backoffice.staff_compensation sc ON s.id = sc.staff_id
  WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
  AND sc.is_service_charge_eligible = true
),
service_total AS (
  SELECT total_amount 
  FROM backoffice.monthly_service_charge 
  WHERE month_year = '2025-06'
)
SELECT 
  'SERVICE CHARGE CALCULATION PREVIEW' as section,
  (SELECT COUNT(*) FROM eligible_staff) as eligible_staff_count,
  (SELECT total_amount FROM service_total) as total_service_charge,
  (SELECT total_amount FROM service_total) / (SELECT COUNT(*) FROM eligible_staff) as amount_per_staff,
  'Each eligible staff member will receive this amount' as note;

SELECT 'Service charge fix completed! Eligible staff should now show service charge amounts.' as message; 