-- Migration: 011_payroll_snapshots
-- Creates backoffice.payroll_snapshots staging table used by the payroll
-- snapshot integration between lengolf-forms and the accounting app.

-- Ensure backoffice schema exists (required for Supabase preview branch environments)
CREATE SCHEMA IF NOT EXISTS backoffice;

CREATE TABLE IF NOT EXISTS backoffice.payroll_snapshots (
  id                  SERIAL        PRIMARY KEY,
  period_code         TEXT          NOT NULL,           -- e.g. '2026-02'
  staff_id            INTEGER       NOT NULL REFERENCES backoffice.staff(id),
  staff_name          TEXT          NOT NULL,            -- snapshot at calculation time
  compensation_type   TEXT          NOT NULL CHECK (compensation_type IN ('salary', 'hourly')),
  -- Hours
  working_days        NUMERIC(6,2)  NOT NULL DEFAULT 0,  -- days with >= 6 hrs
  total_hours         NUMERIC(8,2)  NOT NULL DEFAULT 0,
  overtime_hours      NUMERIC(8,2)  NOT NULL DEFAULT 0,  -- hours over 48/week (non-holiday)
  holiday_hours       NUMERIC(8,2)  NOT NULL DEFAULT 0,  -- hours worked on public holidays
  -- Pay components
  base_pay            NUMERIC(12,2) NOT NULL DEFAULT 0,  -- base_salary or hours × rate
  daily_allowance     NUMERIC(12,2) NOT NULL DEFAULT 0,  -- working_days × daily_allowance_thb
  overtime_pay        NUMERIC(12,2) NOT NULL DEFAULT 0,
  holiday_pay         NUMERIC(12,2) NOT NULL DEFAULT 0,  -- 2× rate per Thai LPA §62
  service_charge      NUMERIC(12,2) NOT NULL DEFAULT 0,  -- equal share of monthly pool
  total_payout        NUMERIC(12,2) NOT NULL DEFAULT 0,  -- sum of all above
  -- Metadata
  status              TEXT          NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'imported', 'superseded')),
  calculated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  calculated_by       TEXT          NOT NULL DEFAULT '',  -- email of who triggered it
  UNIQUE (period_code, staff_id)                          -- one snapshot per person per month
);

CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_period ON backoffice.payroll_snapshots(period_code);
CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_status ON backoffice.payroll_snapshots(status);

COMMENT ON TABLE backoffice.payroll_snapshots IS
  'Staging table written by lengolf-forms after payroll calculation; '
  'read by the accounting app when creating a payroll run.';
