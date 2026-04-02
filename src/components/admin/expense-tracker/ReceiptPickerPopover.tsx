'use client';

import { useState, useCallback } from 'react';
import { Search, ExternalLink, FileText, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { VatType } from '@/types/expense-tracker';

interface ReceiptResult {
  id: string;
  vendor_id: string | null;
  vendor_name: string | null;
  receipt_date: string;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number | null;
  tax_base: number | null;
  vat_amount: number | null;
  vat_type: string | null;
  wht_applicable: boolean | null;
  file_url: string | null;
  notes: string | null;
  extraction_notes: string | null;
}

export interface ReceiptPickerSelection {
  invoice_ref: string | null;
  invoice_date: string | null;
  total_amount: number | null;
  tax_base: number | null;
  vat_amount: number | null;
  vat_type: VatType;
  document_url: string | null;
  notes: string | null;
}

interface ReceiptPickerPopoverProps {
  paymentDate: string; // YYYY-MM-DD
  vendorId?: string | null;
  onSelect: (selection: ReceiptPickerSelection) => void;
}

function formatAmount(n: number | null): string {
  if (n == null) return '-';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string): string {
  const parts = d.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function ReceiptPickerPopover({ paymentDate, vendorId, onSelect }: ReceiptPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ date: paymentDate, days: '7' });
      if (vendorId) params.set('vendor_id', vendorId);
      const res = await fetch(`/api/admin/expense-tracker/search-receipts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReceipts(data.receipts || []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [paymentDate, vendorId]);

  const handleOpen = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !searched) {
      doSearch();
    }
  }, [searched, doSearch]);

  const handleSelect = useCallback((receipt: ReceiptResult) => {
    onSelect({
      invoice_ref: receipt.invoice_number,
      invoice_date: receipt.invoice_date || receipt.receipt_date,
      total_amount: receipt.total_amount,
      tax_base: receipt.tax_base,
      vat_amount: receipt.vat_amount,
      vat_type: (receipt.vat_type as VatType) || 'none',
      document_url: receipt.file_url,
      notes: receipt.extraction_notes || receipt.notes,
    });
    setOpen(false);
  }, [onSelect]);

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors"
          title="Search uploaded receipts"
        >
          <Search className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-3" align="end">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Receipts near {formatDate(paymentDate)}
            </h4>
            <button
              type="button"
              onClick={doSearch}
              disabled={loading}
              className="text-[10px] text-blue-600 hover:text-blue-800"
            >
              {loading ? 'Searching...' : 'Refresh'}
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-xs">Searching...</span>
            </div>
          )}

          {!loading && receipts.length === 0 && searched && (
            <div className="text-xs text-muted-foreground text-center py-4">
              No receipts found within 7 days
            </div>
          )}

          {!loading && receipts.length > 0 && (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {receipts.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="w-full text-left rounded-lg border p-2 hover:bg-blue-50 hover:border-blue-200 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium truncate">
                        {r.vendor_name || 'Unknown vendor'}
                      </span>
                    </div>
                    {r.file_url && (
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 shrink-0"
                        title="View receipt"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{formatDate(r.receipt_date)}</span>
                    <span className="font-medium tabular-nums">
                      {r.total_amount != null ? `${formatAmount(r.total_amount)} THB` : '-'}
                    </span>
                  </div>

                  {r.invoice_number && (
                    <div className="text-[10px] text-muted-foreground">
                      Inv# {r.invoice_number}
                    </div>
                  )}

                  <div className="flex gap-1">
                    {r.vat_type && r.vat_type !== 'none' && (
                      <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-px rounded">
                        {r.vat_type.toUpperCase()}
                      </span>
                    )}
                    {r.vat_amount != null && (
                      <span className="text-[9px] bg-muted px-1 py-px rounded">
                        VAT {formatAmount(r.vat_amount)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
