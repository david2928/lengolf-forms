-- Setup Coaching System Database Schema
-- Based on COACHING_SYSTEM_TECHNICAL.md specifications

-- 1. Extend allowed_users table for coach functionality
ALTER TABLE backoffice.allowed_users ADD COLUMN IF NOT EXISTS coach_name TEXT;
ALTER TABLE backoffice.allowed_users ADD COLUMN IF NOT EXISTS coach_code TEXT UNIQUE;
ALTER TABLE backoffice.allowed_users ADD COLUMN IF NOT EXISTS is_coach BOOLEAN DEFAULT false;
ALTER TABLE backoffice.allowed_users ADD COLUMN IF NOT EXISTS coach_display_name TEXT;
ALTER TABLE backoffice.allowed_users ADD COLUMN IF NOT EXISTS coach_experience_years INTEGER DEFAULT 0;
ALTER TABLE backoffice.allowed_users ADD COLUMN IF NOT EXISTS coach_specialties TEXT[];
ALTER TABLE backoffice.allowed_users ADD COLUMN IF NOT EXISTS is_active_coach BOOLEAN DEFAULT true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_allowed_users_coach_code ON backoffice.allowed_users(coach_code);
CREATE INDEX IF NOT EXISTS idx_allowed_users_is_coach ON backoffice.allowed_users(is_coach);

-- 2. Create coaching_rates configuration table
CREATE TABLE IF NOT EXISTS backoffice.coaching_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type TEXT NOT NULL UNIQUE,
  rate_amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_rate_type CHECK (rate_type IN (
    'individual_1pax',
    'individual_2pax', 
    'starter_package_1pax',
    'starter_package_2pax',
    '5h_package_1pax',
    '10h_package_1pax',
    '5h_package_2pax',
    '10h_package_2pax'
  ))
);

-- Rate change audit table
CREATE TABLE IF NOT EXISTS backoffice.coaching_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type TEXT NOT NULL,
  old_amount DECIMAL(10,2),
  new_amount DECIMAL(10,2) NOT NULL,
  changed_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create coach_availability table
CREATE TABLE IF NOT EXISTS backoffice.coach_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_email TEXT NOT NULL REFERENCES backoffice.allowed_users(email),
  
  -- Recurring availability (weekly pattern)
  day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc.
  start_time TIME,
  end_time TIME,
  
  -- Date-specific availability (blocks or overrides)
  specific_date DATE,
  specific_time_start TIME,
  specific_time_end TIME,
  is_available BOOLEAN DEFAULT true, -- false = blocked time
  
  -- Metadata
  availability_type TEXT NOT NULL CHECK (availability_type IN ('recurring', 'date_specific', 'recurring_block', 'slot_override')),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure data consistency
  CONSTRAINT check_recurring_has_day CHECK (
    (availability_type = 'recurring' AND day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (availability_type IN ('date_specific', 'recurring_block', 'slot_override') AND specific_date IS NOT NULL)
  )
);

-- Indexes for availability queries
CREATE INDEX IF NOT EXISTS idx_coach_availability_coach_email ON backoffice.coach_availability(coach_email);
CREATE INDEX IF NOT EXISTS idx_coach_availability_type ON backoffice.coach_availability(availability_type);
CREATE INDEX IF NOT EXISTS idx_coach_availability_date ON backoffice.coach_availability(specific_date);
CREATE INDEX IF NOT EXISTS idx_coach_availability_day ON backoffice.coach_availability(day_of_week);

-- 4. Create coach earnings view based on POS reconciliation data
CREATE OR REPLACE VIEW backoffice.coach_earnings_real AS
SELECT 
  ri.id as reconciliation_item_id,
  ri.session_id,
  ri.created_at as lesson_date,
  
  -- Extract coach information
  CASE 
    WHEN ri.pos_data->>'productName' ILIKE '%Boss%' THEN 'BOSS'
    WHEN ri.pos_data->>'productName' ILIKE '%Ratchavin%' THEN 'RATCHAVIN' 
    WHEN ri.pos_data->>'productName' ILIKE '%Noon%' THEN 'NOON'
    ELSE 'UNKNOWN'
  END as coach_code,
  
  -- Get coach ID from allowed_users
  au.id as coach_id,
  au.coach_name,
  au.coach_display_name,
  
  -- Lesson details
  ri.pos_data->>'customerName' as customer_name,
  ri.pos_data->>'customerPhoneNumber' as customer_phone_number,
  ri.pos_data->>'productName' as product_name,
  ri.pos_data->>'productCategory' as category,
  (ri.pos_data->>'totalAmount')::numeric as pos_amount,
  
  -- Package information
  CASE 
    WHEN ri.pos_data->>'totalAmount' = '0' THEN 'Package Usage'
    ELSE 'Individual Payment'
  END as booking_classification,
  
  -- Extract package name for package usage
  CASE 
    WHEN ri.pos_data->>'totalAmount' = '0' THEN 
      CASE 
        WHEN ri.pos_data->>'productName' ILIKE '%Starter%' THEN 'Starter Package'
        WHEN ri.pos_data->>'productName' ILIKE '%5H%' THEN '5H Package'
        WHEN ri.pos_data->>'productName' ILIKE '%10H%' THEN '10H Package'
        ELSE 'Unknown Package'
      END
    ELSE NULL
  END as package_name,
  
  -- Check if package was active at lesson time
  CASE 
    WHEN ri.pos_data->>'totalAmount' = '0' THEN true
    ELSE false
  END as package_active_at_lesson_time,
  
  -- Extract PAX count
  CASE 
    WHEN ri.pos_data->>'productName' ILIKE '%2 PAX%' OR ri.pos_data->>'productName' ILIKE '%2-PAX%' THEN 2
    ELSE 1
  END as pax_count,
  
  -- Determine rate type through intelligent parsing
  CASE 
    WHEN ri.pos_data->>'totalAmount' = '0' THEN
      CASE 
        WHEN ri.pos_data->>'productName' ILIKE '%Starter%' AND ri.pos_data->>'productName' ILIKE '%2 PAX%' THEN 'starter_package_2pax'
        WHEN ri.pos_data->>'productName' ILIKE '%Starter%' THEN 'starter_package_1pax'
        WHEN ri.pos_data->>'productName' ILIKE '%5H%' AND ri.pos_data->>'productName' ILIKE '%2 PAX%' THEN '5h_package_2pax'
        WHEN ri.pos_data->>'productName' ILIKE '%5H%' THEN '5h_package_1pax'
        WHEN ri.pos_data->>'productName' ILIKE '%10H%' AND ri.pos_data->>'productName' ILIKE '%2 PAX%' THEN '10h_package_2pax'
        WHEN ri.pos_data->>'productName' ILIKE '%10H%' THEN '10h_package_1pax'
        ELSE '5h_package_1pax' -- Default fallback
      END
    WHEN ri.pos_data->>'productName' ILIKE '%2 PAX%' OR ri.pos_data->>'productName' ILIKE '%2-PAX%' THEN 'individual_2pax'
    ELSE 'individual_1pax'
  END as rate_type,
  
  -- Apply configurable rates
  COALESCE(cr.rate_amount, 1500.00) as coach_revenue,
  
  -- POS sale tracking
  ri.pos_data->>'saleId' as pos_sale_id
  
FROM backoffice.reconciliation_items ri
LEFT JOIN backoffice.allowed_users au ON (
  au.coach_code = CASE 
    WHEN ri.pos_data->>'productName' ILIKE '%Boss%' THEN 'BOSS'
    WHEN ri.pos_data->>'productName' ILIKE '%Ratchavin%' THEN 'RATCHAVIN' 
    WHEN ri.pos_data->>'productName' ILIKE '%Noon%' THEN 'NOON'
  END
  AND au.is_coach = true
)
LEFT JOIN backoffice.coaching_rates cr ON (
  cr.rate_type = CASE 
    WHEN ri.pos_data->>'totalAmount' = '0' THEN
      CASE 
        WHEN ri.pos_data->>'productName' ILIKE '%Starter%' AND ri.pos_data->>'productName' ILIKE '%2 PAX%' THEN 'starter_package_2pax'
        WHEN ri.pos_data->>'productName' ILIKE '%Starter%' THEN 'starter_package_1pax'
        WHEN ri.pos_data->>'productName' ILIKE '%5H%' AND ri.pos_data->>'productName' ILIKE '%2 PAX%' THEN '5h_package_2pax'
        WHEN ri.pos_data->>'productName' ILIKE '%5H%' THEN '5h_package_1pax'
        WHEN ri.pos_data->>'productName' ILIKE '%10H%' AND ri.pos_data->>'productName' ILIKE '%2 PAX%' THEN '10h_package_2pax'
        WHEN ri.pos_data->>'productName' ILIKE '%10H%' THEN '10h_package_1pax'
        ELSE '5h_package_1pax'
      END
    WHEN ri.pos_data->>'productName' ILIKE '%2 PAX%' OR ri.pos_data->>'productName' ILIKE '%2-PAX%' THEN 'individual_2pax'
    ELSE 'individual_1pax'
  END
  AND cr.is_active = true
)
WHERE ri.pos_data->>'productCategory' = 'Coaching'
  AND ri.pos_data->>'productName' ILIKE '%lesson used%'
  AND au.id IS NOT NULL;

-- 5. Create coach earnings summary view
CREATE OR REPLACE VIEW backoffice.coach_earnings_summary AS
SELECT 
  coach_id,
  coach_name,
  coach_display_name,
  
  -- Current month earnings
  COALESCE(SUM(CASE WHEN DATE_TRUNC('month', lesson_date) = DATE_TRUNC('month', CURRENT_DATE) THEN coach_revenue ELSE 0 END), 0) as current_month_earnings,
  
  -- Previous month earnings
  COALESCE(SUM(CASE WHEN DATE_TRUNC('month', lesson_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN coach_revenue ELSE 0 END), 0) as previous_month_earnings,
  
  -- Total earnings
  COALESCE(SUM(coach_revenue), 0) as total_earnings,
  
  -- Current month sessions
  COUNT(CASE WHEN DATE_TRUNC('month', lesson_date) = DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as current_month_sessions,
  
  -- Total sessions
  COUNT(*) as total_sessions,
  
  -- Average session rate
  CASE 
    WHEN COUNT(*) > 0 THEN COALESCE(AVG(coach_revenue), 0)
    ELSE 0
  END as average_session_rate,
  
  -- Last session date
  MAX(lesson_date) as last_session_date
  
FROM backoffice.coach_earnings_real
WHERE coach_id IS NOT NULL
GROUP BY coach_id, coach_name, coach_display_name;

-- 6. Insert sample coach data
INSERT INTO backoffice.allowed_users (
  email, 
  coach_name, 
  coach_display_name, 
  coach_code, 
  is_coach, 
  coach_experience_years, 
  coach_specialties, 
  is_active_coach
) VALUES 
  ('boss@lengolf.com', 'Boss', 'Coach Boss', 'BOSS', true, 10, ARRAY['Driving', 'Putting', 'Course Management'], true),
  ('ratchavin@lengolf.com', 'Ratchavin', 'Coach Ratchavin', 'RATCHAVIN', true, 5, ARRAY['Swing Technique', 'Short Game'], true),
  ('noon@lengolf.com', 'Noon', 'Coach Noon', 'NOON', true, 8, ARRAY['Driving', 'Course Strategy'], true)
ON CONFLICT (email) DO UPDATE SET
  coach_name = EXCLUDED.coach_name,
  coach_display_name = EXCLUDED.coach_display_name,
  coach_code = EXCLUDED.coach_code,
  is_coach = EXCLUDED.is_coach,
  coach_experience_years = EXCLUDED.coach_experience_years,
  coach_specialties = EXCLUDED.coach_specialties,
  is_active_coach = EXCLUDED.is_active_coach;

-- 7. Insert default coaching rates
INSERT INTO backoffice.coaching_rates (rate_type, rate_amount, description) VALUES
  ('individual_1pax', 2000.00, 'Individual lesson (1 person)'),
  ('individual_2pax', 2500.00, 'Individual lesson (2 people)'),
  ('starter_package_1pax', 1400.00, 'Starter package lesson (1 person)'),
  ('starter_package_2pax', 1750.00, 'Starter package lesson (2 people)'),
  ('5h_package_1pax', 1500.00, '5-hour package lesson (1 person)'),
  ('10h_package_1pax', 1500.00, '10-hour package lesson (1 person)'),
  ('5h_package_2pax', 1875.00, '5-hour package lesson (2 people)'),
  ('10h_package_2pax', 1875.00, '10-hour package lesson (2 people)')
ON CONFLICT (rate_type) DO UPDATE SET
  rate_amount = EXCLUDED.rate_amount,
  description = EXCLUDED.description;

-- 8. Set up default availability for coaches (Monday-Friday 9:00-17:00)
INSERT INTO backoffice.coach_availability (
  coach_email, 
  availability_type, 
  day_of_week, 
  start_time, 
  end_time, 
  notes
)
SELECT 
  au.email,
  'recurring',
  generate_series(1, 5), -- Monday to Friday
  '09:00'::TIME,
  '17:00'::TIME,
  'Default working hours'
FROM backoffice.allowed_users au
WHERE au.is_coach = true
ON CONFLICT DO NOTHING;

-- 9. Add recurring break times (lunch 12:00-13:00)
INSERT INTO backoffice.coach_availability (
  coach_email,
  availability_type,
  day_of_week,
  start_time,
  end_time,
  is_available,
  notes
)
SELECT 
  au.email,
  'recurring_block',
  generate_series(1, 5), -- Monday to Friday
  '12:00'::TIME,
  '13:00'::TIME,
  false,
  'Lunch break'
FROM backoffice.allowed_users au
WHERE au.is_coach = true
ON CONFLICT DO NOTHING;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_coaching ON backoffice.reconciliation_items 
  USING GIN ((pos_data->>'productCategory')) 
  WHERE pos_data->>'productCategory' = 'Coaching';

CREATE INDEX IF NOT EXISTS idx_reconciliation_items_lesson_used ON backoffice.reconciliation_items 
  USING GIN ((pos_data->>'productName')) 
  WHERE pos_data->>'productName' ILIKE '%lesson used%';

COMMIT; 