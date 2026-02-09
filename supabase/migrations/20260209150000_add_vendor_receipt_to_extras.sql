-- Add vendor_receipt_id to expense_checklist_extras for platform fee items (GoWabi, etc.)
-- Links to backoffice.vendor_receipts to pull extracted amounts/VAT
ALTER TABLE finance.expense_checklist_extras
  ADD COLUMN IF NOT EXISTS vendor_receipt_id uuid;
