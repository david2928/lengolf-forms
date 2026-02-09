-- Add flow_completed tracking to transaction_annotations
ALTER TABLE finance.transaction_annotations
  ADD COLUMN IF NOT EXISTS flow_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flow_completed_at timestamptz;

-- Separate table for non-annotation checklist items (KBank EDC)
CREATE TABLE IF NOT EXISTS finance.expense_checklist_extras (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  period text NOT NULL,              -- YYYY-MM
  item_key text NOT NULL,            -- 'kbank_card', 'kbank_ewallet'
  flow_completed boolean NOT NULL DEFAULT false,
  flow_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(period, item_key)
);
