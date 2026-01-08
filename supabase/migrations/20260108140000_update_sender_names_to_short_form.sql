-- Migration: Update sender names to use short display names from allowed_users
-- This updates historical messages to use short names (e.g., "Eak" instead of "Akarat Loeksirinukul")
-- Created: 2026-01-08

-- Update LINE messages
UPDATE line_messages lm
SET sender_name = au.display_name
FROM backoffice.allowed_users au
WHERE lm.staff_email = au.email
  AND lm.sender_type = 'admin'
  AND au.display_name IS NOT NULL
  AND au.display_name != ''
  AND lm.sender_name != au.display_name;

-- Update Website chat messages
UPDATE web_chat_messages wcm
SET sender_name = au.display_name
FROM backoffice.allowed_users au
WHERE wcm.staff_email = au.email
  AND wcm.sender_type = 'staff'
  AND au.display_name IS NOT NULL
  AND au.display_name != ''
  AND wcm.sender_name != au.display_name;

-- Update Meta platform messages (Facebook, Instagram, WhatsApp)
UPDATE meta_messages mm
SET sender_name = au.display_name
FROM backoffice.allowed_users au
WHERE mm.staff_email = au.email
  AND mm.sender_type = 'business'
  AND au.display_name IS NOT NULL
  AND au.display_name != ''
  AND mm.sender_name != au.display_name;

-- Log the changes made
DO $$
DECLARE
  line_count INTEGER;
  web_count INTEGER;
  meta_count INTEGER;
BEGIN
  -- Count updated rows (approximate - this is just for logging)
  SELECT COUNT(*) INTO line_count
  FROM line_messages lm
  JOIN backoffice.allowed_users au ON lm.staff_email = au.email
  WHERE lm.sender_type = 'admin'
    AND au.display_name IS NOT NULL
    AND lm.sender_name = au.display_name;

  SELECT COUNT(*) INTO web_count
  FROM web_chat_messages wcm
  JOIN backoffice.allowed_users au ON wcm.staff_email = au.email
  WHERE wcm.sender_type = 'staff'
    AND au.display_name IS NOT NULL
    AND wcm.sender_name = au.display_name;

  SELECT COUNT(*) INTO meta_count
  FROM meta_messages mm
  JOIN backoffice.allowed_users au ON mm.staff_email = au.email
  WHERE mm.sender_type = 'business'
    AND au.display_name IS NOT NULL
    AND mm.sender_name = au.display_name;

  RAISE NOTICE 'Updated sender names: LINE=%, Website=%, Meta=%', line_count, web_count, meta_count;
END $$;
