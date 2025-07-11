-- LENGOLF Time Entries Upload Script
-- Run this in Supabase SQL Editor

-- Step 1: Check existing staff IDs (run this first)
SELECT id, staff_name FROM backoffice.staff 
WHERE staff_name ILIKE ANY(ARRAY['%may%', '%net%', '%dolly%', '%winnie%']) 
AND is_active = true
ORDER BY staff_name;

-- Step 2: Replace the staff_id numbers below with actual IDs from Step 1
-- Then run the INSERT statement

-- IMPORTANT: Update these staff_id mappings based on Step 1 results:
-- May = staff_id: [REPLACE_WITH_ACTUAL_ID]
-- Net = staff_id: [REPLACE_WITH_ACTUAL_ID]  
-- Dolly = staff_id: [REPLACE_WITH_ACTUAL_ID]
-- Winnie = staff_id: [REPLACE_WITH_ACTUAL_ID]

INSERT INTO backoffice.time_entries (staff_id, action, timestamp, photo_captured, device_info)
VALUES 
-- May 01/05/2025 entries
(1, 'clock_in', '2025-05-01 09:26:00+07:00', false, '{"source": "manual_upload"}'),
(1, 'clock_out', '2025-05-01 15:21:00+07:00', false, '{"source": "manual_upload"}'),
(1, 'clock_in', '2025-05-01 16:03:00+07:00', false, '{"source": "manual_upload"}'),
(1, 'clock_out', '2025-05-01 18:01:00+07:00', false, '{"source": "manual_upload"}'),

-- Net 01/05/2025 entries
(2, 'clock_in', '2025-05-01 14:56:00+07:00', false, '{"source": "manual_upload"}'),
(2, 'clock_out', '2025-05-01 20:01:00+07:00', false, '{"source": "manual_upload"}'),
(2, 'clock_in', '2025-05-01 20:41:00+07:00', false, '{"source": "manual_upload"}'),
(2, 'clock_out', '2025-05-01 23:30:00+07:00', false, '{"source": "manual_upload"}'),

-- Dolly 01/05/2025 entries
(3, 'clock_in', '2025-05-01 15:57:00+07:00', false, '{"source": "manual_upload"}'),
(3, 'clock_out', '2025-05-01 19:34:00+07:00', false, '{"source": "manual_upload"}'),
(3, 'clock_in', '2025-05-01 20:01:00+07:00', false, '{"source": "manual_upload"}'),
(3, 'clock_out', '2025-05-01 23:30:00+07:00', false, '{"source": "manual_upload"}'),

-- May 02/05/2025 entries
(1, 'clock_in', '2025-05-02 09:38:00+07:00', false, '{"source": "manual_upload"}'),
(1, 'clock_out', '2025-05-02 15:12:00+07:00', false, '{"source": "manual_upload"}'),
(1, 'clock_in', '2025-05-02 15:54:00+07:00', false, '{"source": "manual_upload"}'),
(1, 'clock_out', '2025-05-02 18:02:00+07:00', false, '{"source": "manual_upload"}'),

-- Dolly 02/05/2025 entries
(3, 'clock_in', '2025-05-02 14:38:00+07:00', false, '{"source": "manual_upload"}'),
(3, 'clock_out', '2025-05-02 20:43:00+07:00', false, '{"source": "manual_upload"}'),
(3, 'clock_in', '2025-05-02 21:19:00+07:00', false, '{"source": "manual_upload"}'),
(3, 'clock_out', '2025-05-02 23:03:00+07:00', false, '{"source": "manual_upload"}'),

-- Net 02/05/2025 entries
(2, 'clock_in', '2025-05-02 15:55:00+07:00', false, '{"source": "manual_upload"}'),
(2, 'clock_out', '2025-05-02 19:05:00+07:00', false, '{"source": "manual_upload"}'),
(2, 'clock_in', '2025-05-02 19:57:00+07:00', false, '{"source": "manual_upload"}'),
(2, 'clock_out', '2025-05-02 23:00:00+07:00', false, '{"source": "manual_upload"}'),

-- Dolly 03/05/2025 entries
(3, 'clock_in', '2025-05-03 09:33:00+07:00', false, '{"source": "manual_upload"}'),
(3, 'clock_out', '2025-05-03 15:21:00+07:00', false, '{"source": "manual_upload"}'),
(3, 'clock_in', '2025-05-03 16:07:00+07:00', false, '{"source": "manual_upload"}'),
(3, 'clock_out', '2025-05-03 18:13:00+07:00', false, '{"source": "manual_upload"}'),

-- Winnie 03/05/2025 entries
(4, 'clock_in', '2025-05-03 13:55:00+07:00', false, '{"source": "manual_upload"}'),
(4, 'clock_out', '2025-05-03 19:01:00+07:00', false, '{"source": "manual_upload"}'),

-- Net 03/05/2025 entries
(2, 'clock_in', '2025-05-03 14:50:00+07:00', false, '{"source": "manual_upload"}'),
(2, 'clock_out', '2025-05-03 18:06:00+07:00', false, '{"source": "manual_upload"}'),
(2, 'clock_in', '2025-05-03 18:42:00+07:00', false, '{"source": "manual_upload"}'),
(2, 'clock_out', '2025-05-03 23:09:00+07:00', false, '{"source": "manual_upload"}'); 