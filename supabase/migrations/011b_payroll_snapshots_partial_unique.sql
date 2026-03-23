-- Migration: 011b_payroll_snapshots_partial_unique
-- Replace the blanket UNIQUE(period_code, staff_id) constraint with a partial
-- unique index that only applies to non-superseded rows. This allows multiple
-- superseded rows per (period_code, staff_id) while still preventing duplicate
-- pending/imported snapshots.

ALTER TABLE backoffice.payroll_snapshots
  DROP CONSTRAINT IF EXISTS payroll_snapshots_period_code_staff_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_snapshots_unique_active
  ON backoffice.payroll_snapshots (period_code, staff_id)
  WHERE status != 'superseded';
