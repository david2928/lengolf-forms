-- Create audit logs table for staff scheduling system
-- This table tracks all modifications to schedules for compliance and security

CREATE TABLE IF NOT EXISTS backoffice.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON backoffice.audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON backoffice.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON backoffice.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON backoffice.audit_logs(action);

-- Add RLS policy for audit logs (admins only)
ALTER TABLE backoffice.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY audit_logs_admin_only ON backoffice.audit_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM backoffice.allowed_users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_admin = true
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON backoffice.audit_logs TO service_role;
GRANT SELECT ON backoffice.audit_logs TO authenticated;

-- Add comment
COMMENT ON TABLE backoffice.audit_logs IS 'Audit trail for all staff scheduling system modifications';
COMMENT ON COLUMN backoffice.audit_logs.action IS 'Action performed: CREATE, UPDATE, DELETE, VIEW';
COMMENT ON COLUMN backoffice.audit_logs.resource_type IS 'Type of resource: staff_schedule, staff_weekly_schedule';
COMMENT ON COLUMN backoffice.audit_logs.details IS 'JSON details of the action including before/after values';