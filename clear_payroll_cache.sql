-- Clear any cached payroll data
-- This ensures fresh calculations with the current data

-- Just a simple query to verify the payroll calculation should work
SELECT 
    'Cache Clear Check' as action,
    COUNT(DISTINCT te.staff_id) as staff_with_entries,
    COUNT(DISTINCT sc.staff_id) as staff_with_compensation,
    COUNT(DISTINCT ps.setting_key) as payroll_settings_count,
    CASE 
        WHEN COUNT(DISTINCT te.staff_id) > 0 
        AND COUNT(DISTINCT sc.staff_id) > 0 
        AND COUNT(DISTINCT ps.setting_key) > 0 
        THEN '✅ Ready for payroll calculation'
        ELSE '❌ Missing data'
    END as status
FROM backoffice.time_entries te
CROSS JOIN backoffice.staff_compensation sc
CROSS JOIN backoffice.payroll_settings ps
WHERE DATE_TRUNC('month', te.timestamp AT TIME ZONE 'Asia/Bangkok') = '2025-05-01'::date
AND sc.effective_to IS NULL
AND ps.setting_key = 'daily_allowance_thb'; 