-- Multi-invoice support for transaction annotations
-- Allows multiple invoices/receipts to be linked to a single bank transaction annotation

-- 1. Create child items table
CREATE TABLE IF NOT EXISTS finance.transaction_annotation_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  annotation_id bigint NOT NULL REFERENCES finance.transaction_annotations(id) ON DELETE CASCADE,
  item_index smallint NOT NULL DEFAULT 0,
  invoice_ref text,
  invoice_date date,
  total_amount numeric(12,2),
  vat_type text NOT NULL DEFAULT 'none',
  vat_amount numeric(12,2),
  wht_type text NOT NULL DEFAULT 'none',
  wht_rate numeric(5,2) DEFAULT 3,
  wht_amount numeric(12,2),
  tax_base numeric(12,2),
  document_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(annotation_id, item_index)
);

CREATE INDEX idx_annotation_items_ann ON finance.transaction_annotation_items(annotation_id);

-- 2. Add has_items flag to parent annotations for fast filtering
ALTER TABLE finance.transaction_annotations
  ADD COLUMN IF NOT EXISTS has_items boolean NOT NULL DEFAULT false;

-- 3. Auto-update updated_at on item changes (reuse existing function)
CREATE TRIGGER set_annotation_item_updated_at
  BEFORE UPDATE ON finance.transaction_annotation_items
  FOR EACH ROW
  EXECUTE FUNCTION finance.update_annotation_timestamp();
