-- Fix Allowed Users Table
-- This script provides the correct INSERT syntax for the allowed_users table

-- The correct table structure (for reference):
-- CREATE TABLE backoffice.allowed_users (
--   id SERIAL PRIMARY KEY,
--   email TEXT UNIQUE NOT NULL,
--   is_admin BOOLEAN DEFAULT false,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- CORRECT INSERT SYNTAX (there is NO 'allowed' column):
-- For regular staff users:
INSERT INTO backoffice.allowed_users (email, is_admin) VALUES
('staff1@lengolf.com', false),
('staff2@lengolf.com', false)
ON CONFLICT (email) DO NOTHING;

-- For admin users:
INSERT INTO backoffice.allowed_users (email, is_admin) VALUES
('admin@lengolf.com', true),
('manager@lengolf.com', true)
ON CONFLICT (email) DO NOTHING;

-- To update existing users to admin:
UPDATE backoffice.allowed_users 
SET is_admin = true 
WHERE email IN ('your-admin-email@gmail.com');

-- Check current users:
SELECT id, email, is_admin, created_at 
FROM backoffice.allowed_users 
ORDER BY created_at DESC;

-- Common error patterns to AVOID:
-- ❌ WRONG: INSERT INTO backoffice.allowed_users (email, is_admin, allowed) 
-- ❌ WRONG: INSERT INTO backoffice.allowed_users (email, allowed)
-- ✅ CORRECT: INSERT INTO backoffice.allowed_users (email, is_admin) 