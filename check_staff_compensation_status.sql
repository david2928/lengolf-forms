-- Check Staff Compensation Status
-- This identifies which staff members are missing compensation settings

-- ============================================
-- 1. CHECK ALL ACTIVE STAFF AND THEIR COMPENSATION STATUS
-- ============================================

SELECT 
    s.id,
    s.staff_name,
    s.is_active,
    s.is_service_charge_eligible,
    CASE 
        WHEN sc.staff_id IS NOT NULL THEN '✅ Has compensation'
        ELSE '❌ MISSING compensation settings'
    END as compensation_status,
    sc.base_salary,
    sc.ot_rate_per_hour,
    sc.holiday_rate_per_hour,
    sc.effective_from,
    sc.effective_to
FROM backoffice.staff s
LEFT JOIN backoffice.staff_compensation sc ON s.id = sc.staff_id 
    AND (sc.effective_to IS NULL OR sc.effective_to >= CURRENT_DATE)
WHERE s.is_active = true
ORDER BY 
    CASE WHEN sc.staff_id IS NULL THEN 0 ELSE 1 END, -- Missing compensation first
    s.staff_name;

-- ============================================
-- 2. SUMMARY OF THE PROBLEM
-- ============================================

SELECT 
    COUNT(*) as total_active_staff,
    COUNT(sc.staff_id) as staff_with_compensation,
    COUNT(*) - COUNT(sc.staff_id) as staff_missing_compensation,
    CASE 
        WHEN COUNT(*) - COUNT(sc.staff_id) > 0 
        THEN '❌ THIS IS THE PROBLEM - Some staff missing compensation!'
        ELSE '✅ All staff have compensation settings'
    END as diagnosis
FROM backoffice.staff s
LEFT JOIN backoffice.staff_compensation sc ON s.id = sc.staff_id 
    AND (sc.effective_to IS NULL OR sc.effective_to >= CURRENT_DATE)
WHERE s.is_active = true;

-- ============================================
-- 3. LIST ONLY THE PROBLEMATIC STAFF
-- ============================================

SELECT 
    s.id,
    s.staff_name,
    'Missing compensation settings - ADD THESE!' as issue
FROM backoffice.staff s
LEFT JOIN backoffice.staff_compensation sc ON s.id = sc.staff_id 
    AND (sc.effective_to IS NULL OR sc.effective_to >= CURRENT_DATE)
WHERE s.is_active = true 
    AND sc.staff_id IS NULL
ORDER BY s.staff_name; 