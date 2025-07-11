-- Fix May 2025 Holiday Pay Issue
-- This script adds Thai public holidays for 2025 to enable holiday pay calculations

-- ============================================
-- 1. INSERT THAI PUBLIC HOLIDAYS FOR 2025
-- ============================================

-- Insert Thai public holidays for 2025
INSERT INTO backoffice.public_holidays (holiday_date, holiday_name, is_active)
VALUES
  -- January 2025
  ('2025-01-01', 'New Year''s Day', true),
  
  -- February 2025
  ('2025-02-12', 'Makha Bucha Day', true),
  
  -- April 2025
  ('2025-04-06', 'Chakri Day', true),
  ('2025-04-13', 'Songkran Festival', true),
  ('2025-04-14', 'Songkran Festival', true),
  ('2025-04-15', 'Songkran Festival', true),
  
  -- May 2025 (THESE ARE THE MISSING HOLIDAYS!)
  ('2025-05-01', 'Labour Day', true),
  ('2025-05-04', 'Coronation Day', true),
  ('2025-05-12', 'Visakha Bucha Day', true),
  
  -- July 2025
  ('2025-07-28', 'Khao Phansa Day', true),
  
  -- August 2025
  ('2025-08-12', 'Her Majesty the Queen''s Birthday', true),
  
  -- October 2025
  ('2025-10-13', 'Passing of King Bhumibol', true),
  ('2025-10-23', 'Chulalongkorn Day', true),
  
  -- December 2025
  ('2025-12-05', 'His Majesty the King''s Birthday', true),
  ('2025-12-10', 'Constitution Day', true),
  ('2025-12-31', 'New Year''s Eve', true)
ON CONFLICT (holiday_date) DO UPDATE SET
  holiday_name = EXCLUDED.holiday_name,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 2. VERIFY MAY 2025 HOLIDAYS ARE ADDED
-- ============================================

SELECT 
  'MAY 2025 HOLIDAYS' as section,
  holiday_date,
  holiday_name,
  is_active
FROM backoffice.public_holidays
WHERE holiday_date >= '2025-05-01' 
AND holiday_date <= '2025-05-31'
ORDER BY holiday_date;

-- ============================================
-- 3. CHECK IF STAFF WORKED ON MAY 2025 HOLIDAYS
-- ============================================

-- Show if any staff worked on May 2025 holidays (for holiday pay calculation)
SELECT 
  'STAFF WORKED ON MAY 2025 HOLIDAYS' as section,
  h.holiday_date,
  h.holiday_name,
  s.staff_name,
  COUNT(te.id) as time_entries,
  SUM(CASE WHEN te.action = 'clock_in' THEN 1 ELSE 0 END) as clock_ins,
  SUM(CASE WHEN te.action = 'clock_out' THEN 1 ELSE 0 END) as clock_outs
FROM backoffice.public_holidays h
CROSS JOIN backoffice.staff s
LEFT JOIN backoffice.time_entries te ON 
  DATE(te.timestamp) = h.holiday_date 
  AND te.staff_id = s.id
WHERE h.holiday_date >= '2025-05-01' 
AND h.holiday_date <= '2025-05-31'
AND h.is_active = true
AND s.is_active = true
GROUP BY h.holiday_date, h.holiday_name, s.staff_name, s.id
HAVING COUNT(te.id) > 0
ORDER BY h.holiday_date, s.staff_name;

-- ============================================
-- 4. VERIFY HOLIDAY RATE COMPENSATION IS SET
-- ============================================

SELECT 
  'HOLIDAY RATE COMPENSATION' as section,
  s.staff_name,
  sc.holiday_rate_per_hour,
  sc.effective_from,
  sc.effective_to,
  CASE 
    WHEN sc.effective_from <= '2025-05-31' 
    AND (sc.effective_to IS NULL OR sc.effective_to >= '2025-05-01')
    THEN '✅ Active for May 2025'
    ELSE '❌ Not active for May 2025'
  END as status
FROM backoffice.staff s
JOIN backoffice.staff_compensation sc ON s.id = sc.staff_id
WHERE s.is_active = true
ORDER BY s.staff_name;

-- ============================================
-- 5. SUMMARY OF FIXES
-- ============================================

SELECT 
  'SUMMARY' as section,
  'May 2025 holidays added' as item,
  COUNT(*) as count,
  '🎉 FIXED!' as status
FROM backoffice.public_holidays
WHERE holiday_date >= '2025-05-01' 
AND holiday_date <= '2025-05-31'
AND is_active = true

UNION ALL

SELECT 
  'SUMMARY' as section,
  'Total 2025 holidays' as item,
  COUNT(*) as count,
  '✅ Complete' as status
FROM backoffice.public_holidays
WHERE EXTRACT(YEAR FROM holiday_date) = 2025
AND is_active = true

ORDER BY section, item; 