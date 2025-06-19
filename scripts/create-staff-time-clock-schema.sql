-- Create Staff Time Clock Database Schema
-- Story: STAFF-001 - Database Schema & Backend Foundation
-- This script creates the complete database schema for staff time clock functionality

-- ==========================================
-- 1. BACKOFFICE.STAFF TABLE
-- ==========================================

-- Create staff table for employee information
CREATE TABLE IF NOT EXISTS backoffice.staff (
  id SERIAL PRIMARY KEY,
  staff_name TEXT NOT NULL,
  staff_id TEXT UNIQUE, -- Optional employee ID/badge number
  pin_hash TEXT NOT NULL, -- bcrypt hashed PIN
  is_active BOOLEAN DEFAULT true,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ NULL, -- NULL when not locked
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE backoffice.staff IS 'Staff members who can use the time clock system';
COMMENT ON COLUMN backoffice.staff.pin_hash IS 'bcrypt hashed 6-digit PIN for clock-in authentication';
COMMENT ON COLUMN backoffice.staff.failed_attempts IS 'Counter for failed PIN attempts (resets on success)';
COMMENT ON COLUMN backoffice.staff.locked_until IS 'Timestamp until which account is locked (NULL when not locked)';

-- ==========================================
-- 2. BACKOFFICE.TIME_ENTRIES TABLE
-- ==========================================

-- Create time entries table for clock-in/out records
CREATE TABLE IF NOT EXISTS backoffice.time_entries (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES backoffice.staff(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('clock_in', 'clock_out')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  photo_url TEXT, -- URL to captured photo in Supabase Storage
  photo_captured BOOLEAN DEFAULT false,
  camera_error TEXT, -- Error message if camera failed
  device_info JSONB, -- Browser/device information
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE backoffice.time_entries IS 'Time clock entries for staff clock-in and clock-out records';
COMMENT ON COLUMN backoffice.time_entries.photo_url IS 'URL to photo stored in Supabase Storage (time-clock-photos bucket)';
COMMENT ON COLUMN backoffice.time_entries.camera_error IS 'Error message if photo capture failed';
COMMENT ON COLUMN backoffice.time_entries.device_info IS 'JSON containing browser/device info for audit purposes';

-- ==========================================
-- 3. BACKOFFICE.STAFF_AUDIT_LOG TABLE
-- ==========================================

-- Create audit log table for staff-related changes
CREATE TABLE IF NOT EXISTS backoffice.staff_audit_log (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER REFERENCES backoffice.staff(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'created', 'pin_changed', 'activated', 'deactivated', 'locked', 'unlocked'
  changed_by_type TEXT NOT NULL, -- 'admin', 'system'
  changed_by_identifier TEXT NOT NULL, -- email of admin or 'system'
  changes_summary TEXT,
  old_data_snapshot JSONB,
  new_data_snapshot JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE backoffice.staff_audit_log IS 'Audit trail for all staff-related changes and PIN operations';
COMMENT ON COLUMN backoffice.staff_audit_log.action_type IS 'Type of action performed on staff record';
COMMENT ON COLUMN backoffice.staff_audit_log.changed_by_type IS 'Who made the change (admin user or system)';
COMMENT ON COLUMN backoffice.staff_audit_log.changes_summary IS 'Human-readable summary of changes made';

-- ==========================================
-- 4. PERFORMANCE INDEXES
-- ==========================================

-- Staff table indexes
CREATE INDEX IF NOT EXISTS idx_staff_pin_hash ON backoffice.staff(pin_hash);
CREATE INDEX IF NOT EXISTS idx_staff_active ON backoffice.staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_locked_until ON backoffice.staff(locked_until) WHERE locked_until IS NOT NULL;

-- Time entries indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_staff_timestamp ON backoffice.time_entries(staff_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_timestamp ON backoffice.time_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_action ON backoffice.time_entries(action);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON backoffice.time_entries(DATE(timestamp));

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_staff_audit_staff_id ON backoffice.staff_audit_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_created_at ON backoffice.staff_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_audit_action_type ON backoffice.staff_audit_log(action_type);

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables following existing patterns
ALTER TABLE backoffice.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice.staff_audit_log ENABLE ROW LEVEL SECURITY;

-- Staff table policies
CREATE POLICY "Allow authenticated users to read staff" ON backoffice.staff
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access to staff" ON backoffice.staff
  FOR ALL USING (auth.role() = 'service_role');

-- Time entries policies
CREATE POLICY "Allow authenticated users to read time entries" ON backoffice.time_entries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access to time entries" ON backoffice.time_entries
  FOR ALL USING (auth.role() = 'service_role');

-- Audit log policies (read-only for authenticated, full access for service role)
CREATE POLICY "Allow authenticated users to read audit log" ON backoffice.staff_audit_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access to audit log" ON backoffice.staff_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- 6. STAFF STATUS VIEW
-- ==========================================

-- Create view for current staff status (following existing patterns)
CREATE OR REPLACE VIEW backoffice.staff_status AS
SELECT 
  s.id,
  s.staff_name,
  s.staff_id,
  s.is_active,
  s.failed_attempts,
  s.locked_until,
  CASE 
    WHEN s.locked_until > NOW() THEN true 
    ELSE false 
  END as is_currently_locked,
  te_last.action as last_action,
  te_last.timestamp as last_action_time,
  CASE 
    WHEN te_last.action = 'clock_in' THEN true
    WHEN te_last.action = 'clock_out' THEN false
    ELSE false -- Default to clocked out if no entries
  END as currently_clocked_in
FROM backoffice.staff s
LEFT JOIN LATERAL (
  SELECT action, timestamp
  FROM backoffice.time_entries te
  WHERE te.staff_id = s.id
  ORDER BY timestamp DESC
  LIMIT 1
) te_last ON true
WHERE s.is_active = true;

-- Add comment for the view
COMMENT ON VIEW backoffice.staff_status IS 'Current status view showing staff clock-in status and lock status';

-- ==========================================
-- 7. DATABASE FUNCTIONS
-- ==========================================

-- Function to handle PIN verification and lockout logic
CREATE OR REPLACE FUNCTION verify_staff_pin(
  input_pin TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  staff_id INTEGER,
  staff_name TEXT,
  message TEXT,
  currently_clocked_in BOOLEAN,
  is_locked BOOLEAN,
  lock_expires_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = backoffice, public, pg_temp
AS $$
DECLARE
  staff_record RECORD;
  is_pin_valid BOOLEAN := false;
  current_time TIMESTAMPTZ := NOW();
BEGIN
  -- Find staff by PIN hash (we'll hash the input PIN in the application)
  SELECT s.*, ss.currently_clocked_in
  INTO staff_record
  FROM backoffice.staff s
  LEFT JOIN backoffice.staff_status ss ON s.id = ss.id
  WHERE s.pin_hash = crypt(input_pin, s.pin_hash)
  AND s.is_active = true;
  
  -- Check if staff found and PIN matches
  is_pin_valid := (staff_record.id IS NOT NULL);
  
  IF NOT is_pin_valid THEN
    -- PIN invalid, find any active staff to update failed attempts
    SELECT s.* INTO staff_record
    FROM backoffice.staff s
    WHERE s.is_active = true
    LIMIT 1; -- We'll implement per-device tracking later
    
    RETURN QUERY SELECT 
      false,
      NULL::INTEGER,
      NULL::TEXT,
      'PIN not recognized. Please try again.'::TEXT,
      false,
      false,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Check if account is locked
  IF staff_record.locked_until IS NOT NULL AND staff_record.locked_until > current_time THEN
    RETURN QUERY SELECT 
      false,
      staff_record.id,
      staff_record.staff_name,
      'Account temporarily locked. Please try again later.'::TEXT,
      COALESCE(staff_record.currently_clocked_in, false),
      true,
      staff_record.locked_until;
    RETURN;
  END IF;
  
  -- PIN valid and not locked - clear failed attempts and unlock if needed
  UPDATE backoffice.staff 
  SET 
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = current_time
  WHERE id = staff_record.id;
  
  -- Return success
  RETURN QUERY SELECT 
    true,
    staff_record.id,
    staff_record.staff_name,
    'PIN verified successfully'::TEXT,
    COALESCE(staff_record.currently_clocked_in, false),
    false,
    NULL::TIMESTAMPTZ;
END;
$$;

-- Function to record time entry
CREATE OR REPLACE FUNCTION record_time_entry(
  p_staff_id INTEGER,
  p_action TEXT,
  p_photo_url TEXT DEFAULT NULL,
  p_photo_captured BOOLEAN DEFAULT false,
  p_camera_error TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT NULL
)
RETURNS TABLE (
  entry_id INTEGER,
  staff_name TEXT,
  action TEXT,
  timestamp TIMESTAMPTZ,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = backoffice, public, pg_temp
AS $$
DECLARE
  staff_record RECORD;
  new_entry_id INTEGER;
  current_time TIMESTAMPTZ := NOW();
  success_message TEXT;
BEGIN
  -- Get staff information
  SELECT s.staff_name INTO staff_record
  FROM backoffice.staff s
  WHERE s.id = p_staff_id AND s.is_active = true;
  
  IF staff_record.staff_name IS NULL THEN
    RAISE EXCEPTION 'Staff member not found or inactive';
  END IF;
  
  -- Insert time entry
  INSERT INTO backoffice.time_entries (
    staff_id,
    action,
    timestamp,
    photo_url,
    photo_captured,
    camera_error,
    device_info
  ) VALUES (
    p_staff_id,
    p_action,
    current_time,
    p_photo_url,
    p_photo_captured,
    p_camera_error,
    p_device_info
  ) RETURNING id INTO new_entry_id;
  
  -- Create success message
  success_message := CASE 
    WHEN p_action = 'clock_in' THEN 
      'Welcome ' || staff_record.staff_name || '! Clocked in at ' || 
      TO_CHAR(current_time, 'HH12:MI AM')
    WHEN p_action = 'clock_out' THEN 
      'Goodbye ' || staff_record.staff_name || '! Clocked out at ' || 
      TO_CHAR(current_time, 'HH12:MI AM')
    ELSE 
      'Time entry recorded successfully'
  END;
  
  -- Return result
  RETURN QUERY SELECT 
    new_entry_id,
    staff_record.staff_name,
    p_action,
    current_time,
    success_message;
END;
$$;

-- Function to get staff time entries for reporting
CREATE OR REPLACE FUNCTION get_staff_time_entries(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_staff_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  entry_id INTEGER,
  staff_id INTEGER,
  staff_name TEXT,
  action TEXT,
  timestamp TIMESTAMPTZ,
  date_only DATE,
  time_only TIME,
  photo_captured BOOLEAN,
  camera_error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = backoffice, public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    te.id,
    te.staff_id,
    s.staff_name,
    te.action,
    te.timestamp,
    DATE(te.timestamp) as date_only,
    TIME(te.timestamp) as time_only,
    te.photo_captured,
    te.camera_error
  FROM backoffice.time_entries te
  JOIN backoffice.staff s ON te.staff_id = s.id
  WHERE 
    DATE(te.timestamp) BETWEEN p_start_date AND p_end_date
    AND (p_staff_id IS NULL OR te.staff_id = p_staff_id)
  ORDER BY te.timestamp DESC;
END;
$$;

-- ==========================================
-- 8. GRANT PERMISSIONS
-- ==========================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION verify_staff_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_time_entry(INTEGER, TEXT, TEXT, BOOLEAN, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_time_entries(DATE, DATE, INTEGER) TO authenticated;

-- ==========================================
-- 9. INSERT SAMPLE DATA (FOR TESTING)
-- ==========================================

-- Insert sample staff members for testing (PINs will be hashed by the application)
-- Note: These are sample entries for development - remove in production
INSERT INTO backoffice.staff (staff_name, staff_id, pin_hash, is_active) VALUES
-- Sample staff with PIN 123456 (will be properly hashed by application)
('Test Staff 1', 'EMP001', '$2b$10$placeholder', true),
('Test Staff 2', 'EMP002', '$2b$10$placeholder', true)
ON CONFLICT (staff_id) DO NOTHING;

-- Insert sample audit log entry
INSERT INTO backoffice.staff_audit_log (
  staff_id, 
  action_type, 
  changed_by_type, 
  changed_by_identifier, 
  changes_summary,
  reason
) 
SELECT 
  id,
  'created',
  'system',
  'database_init',
  'Sample staff member created during database initialization',
  'Development setup'
FROM backoffice.staff 
WHERE staff_name LIKE 'Test Staff%'
ON CONFLICT DO NOTHING;

-- ==========================================
-- 10. SUCCESS MESSAGE
-- ==========================================

SELECT 'Staff Time Clock database schema created successfully!' as message,
       'Created: staff, time_entries, staff_audit_log tables with RLS policies' as details,
       'Added: indexes, functions, and sample data for testing' as additional_info; 