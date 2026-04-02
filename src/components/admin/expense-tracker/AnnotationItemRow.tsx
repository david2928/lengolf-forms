'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentUploadButton } from './DocumentUploadButton';
import { ReceiptPickerPopover } from './ReceiptPickerPopover';
import type { ReceiptPickerSelection } from './ReceiptPickerPopover';
import { recalcAll } from './TaxCalculator';
import debounce from 'lodash/debounce';
import type { AnnotationItem, VatType, WhtType, InvoiceExtraction } from '@/types/expense-tracker';

interface AnnotationItemRowProps {
  item: AnnotationItem;
  /** Bank transaction amount (for tax recalculation context) */
  bankAmount: number;
  paymentDate?: string;
  vendorName?: string;
  vendorId?: string | null;
  onItemSaved: (item: AnnotationItem, parentAnnotation?: Record<string, unknown>) => void;
  onItemDeleted: (itemId: number, parentAnnotation?: Record<string, unknown>) => void;
}

function formatNum(n: number | null | undefined): string {
  if (n == null) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseNum(s: string): number | null {
  const raw = s.replace(/,/g, '');
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

const VAT_LABELS: Record<VatType, string> = { none: '-', pp30: 'PP30', pp36: 'PP36' };
const WHT_LABELS: Record<WhtType, string> = { none: '-', pnd3: 'PND3', pnd53: 'PND53' };

export function AnnotationItemRow({ item, bankAmount, paymentDate, vendorName, vendorId, onItemSaved, onItemDeleted }: AnnotationItemRowProps) {
  const [invoiceRef, setInvoiceRef] = useState(item.invoice_ref || '');
  const [totalAmount, setTotalAmount] = useState<number | null>(item.total_amount ?? null);
  const [vatType, setVatType] = useState<VatType>(item.vat_type || 'none');
  const [vatAmount, setVatAmount] = useState<number | null>(item.vat_amount ?? null);
  const [whtType, setWhtType] = useState<WhtType>(item.wht_type || 'none');
  const [whtRate, setWhtRate] = useState(item.wht_rate ?? 3);
  const [whtAmount, setWhtAmount] = useState<number | null>(item.wht_amount ?? null);
  const [taxBase, setTaxBase] = useState<number | null>(item.tax_base ?? null);
  const [notes, setNotes] = useState(item.notes || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveRef = useRef<ReturnType<typeof debounce>>();

  const doSave = useCallback(
    async (data: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch('/api/admin/expense-tracker/annotation-items', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, ...data }),
        });
        if (res.ok) {
          const { item: savedItem, annotation: parentAnn } = await res.json();
          onItemSaved(savedItem, parentAnn);
        }
      } catch { /* ignore */ } finally {
        setSaving(false);
      }
    },
    [item.id, onItemSaved]
  );

  const debouncedSave = useMemo(
    () => debounce((data: Record<string, unknown>) => { doSave(data); }, 500),
    [doSave]
  );

  useEffect(() => {
    saveRef.current = debouncedSave;
    return () => { debouncedSave.flush(); };
  }, [debouncedSave]);

  const buildPayload = useCallback(
    (overrides?: Record<string, unknown>) => ({
      invoice_ref: invoiceRef || null,
      total_amount: totalAmount,
      vat_type: vatType,
      vat_amount: vatAmount,
      wht_type: whtType,
      wht_rate: whtRate,
      wht_amount: whtAmount,
      tax_base: taxBase,
      notes: notes || null,
      ...overrides,
    }),
    [invoiceRef, totalAmount, vatType, vatAmount, whtType, whtRate, whtAmount, taxBase, notes]
  );

  const handleFieldBlur = useCallback(
    (field: string, value: string) => {
      const overrides: Record<string, unknown> = {};
      switch (field) {
        case 'invoiceRef': overrides.invoice_ref = value || null; break;
        case 'totalAmount': {
          const amt = parseNum(value);
          setTotalAmount(amt);
          overrides.total_amount = amt;
          // Recalc VAT/WHT based on total_amount
          if (amt != null) {
            const result = recalcAll({
              amount: amt,
              vatType,
              vatAmountOverride: false,
              currentVatAmount: vatAmount,
              whtType,
              whtRate,
              whtAmountOverride: false,
              currentWhtAmount: whtAmount,
              taxBaseOverride: false,
              currentTaxBase: taxBase,
            });
            setVatAmount(result.vat_amount);
            setWhtAmount(result.wht_amount);
            setTaxBase(result.tax_base);
            overrides.vat_amount = result.vat_amount;
            overrides.wht_amount = result.wht_amount;
            overrides.tax_base = result.tax_base;
          }
          break;
        }
        case 'vatAmount': overrides.vat_amount = parseNum(value); break;
        case 'whtAmount': overrides.wht_amount = parseNum(value); break;
        case 'taxBase': overrides.tax_base = parseNum(value); break;
        case 'notes': overrides.notes = value || null; break;
      }
      saveRef.current?.(buildPayload(overrides));
    },
    [buildPayload, vatType, vatAmount, whtType, whtRate, whtAmount, taxBase]
  );

  const handleVatTypeChange = useCallback(
    (vt: VatType) => {
      setVatType(vt);
      const amt = totalAmount ?? bankAmount;
      const result = recalcAll({
        amount: amt,
        vatType: vt,
        vatAmountOverride: false,
        currentVatAmount: null,
        whtType,
        whtRate,
        whtAmountOverride: false,
        currentWhtAmount: null,
        taxBaseOverride: false,
        currentTaxBase: null,
      });
      setVatAmount(result.vat_amount);
      setWhtAmount(result.wht_amount);
      setTaxBase(result.tax_base);
      saveRef.current?.(buildPayload({
        vat_type: vt,
        vat_amount: result.vat_amount,
        wht_amount: result.wht_amount,
        tax_base: result.tax_base,
      }));
    },
    [totalAmount, bankAmount, whtType, whtRate, buildPayload]
  );

  const handleWhtTypeChange = useCallback(
    (wt: WhtType) => {
      setWhtType(wt);
      const amt = totalAmount ?? bankAmount;
      const result = recalcAll({
        amount: amt,
        vatType,
        vatAmountOverride: false,
        currentVatAmount: vatAmount,
        whtType: wt,
        whtRate,
        whtAmountOverride: false,
        currentWhtAmount: null,
        taxBaseOverride: false,
        currentTaxBase: null,
      });
      setWhtAmount(result.wht_amount);
      setTaxBase(result.tax_base);
      saveRef.current?.(buildPayload({
        wht_type: wt,
        wht_amount: result.wht_amount,
        tax_base: result.tax_base,
      }));
    },
    [totalAmount, bankAmount, vatType, vatAmount, whtRate, buildPayload]
  );

  const handleInvoiceExtracted = useCallback(
    (extraction: InvoiceExtraction, docUrl: string | null) => {
      const overrides: Record<string, unknown> = {};
      if (extraction.invoice_number) {
        setInvoiceRef(extraction.invoice_number);
        overrides.invoice_ref = extraction.invoice_number;
      }
      if (extraction.vat_type && extraction.vat_type !== 'none') {
        setVatType(extraction.vat_type);
        overrides.vat_type = extraction.vat_type;
      }
      if (extraction.vat_amount != null) {
        setVatAmount(extraction.vat_amount);
        overrides.vat_amount = extraction.vat_amount;
      }
      if (extraction.tax_base != null) {
        setTaxBase(extraction.tax_base);
        overrides.tax_base = extraction.tax_base;
      }
      if (extraction.total_amount != null) {
        setTotalAmount(extraction.total_amount);
        overrides.total_amount = extraction.total_amount;
      }
      if (extraction.notes) {
        setNotes(extraction.notes);
        overrides.notes = extraction.notes;
      }
      if (docUrl) {
        overrides.document_url = docUrl;
      }
      // Save immediately (no debounce for extraction)
      doSave(buildPayload(overrides));
    },
    [buildPayload, doSave]
  );

  const handleReceiptSelected = useCallback(
    (selection: ReceiptPickerSelection) => {
      const overrides: Record<string, unknown> = {};
      if (selection.invoice_ref) {
        setInvoiceRef(selection.invoice_ref);
        overrides.invoice_ref = selection.invoice_ref;
      }
      if (selection.total_amount != null) {
        setTotalAmount(selection.total_amount);
        overrides.total_amount = selection.total_amount;
      }
      if (selection.vat_type && selection.vat_type !== 'none') {
        setVatType(selection.vat_type);
        overrides.vat_type = selection.vat_type;
      }
      if (selection.vat_amount != null) {
        setVatAmount(selection.vat_amount);
        overrides.vat_amount = selection.vat_amount;
      }
      if (selection.tax_base != null) {
        setTaxBase(selection.tax_base);
        overrides.tax_base = selection.tax_base;
      }
      if (selection.document_url) {
        overrides.document_url = selection.document_url;
      }
      if (selection.notes) {
        setNotes(selection.notes);
        overrides.notes = selection.notes;
      }
      doSave(buildPayload(overrides));
    },
    [buildPayload, doSave]
  );

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/expense-tracker/annotation-items?id=${item.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const { annotation: parentAnn } = await res.json();
        onItemDeleted(item.id, parentAnn);
      }
    } catch { /* ignore */ } finally {
      setDeleting(false);
    }
  }, [item.id, onItemDeleted]);

  const cellBase = 'px-2 py-1.5 text-xs';
  const inputBase = 'h-6 w-full text-xs px-1.5 border rounded bg-white focus:ring-1 focus:ring-ring';

  return (
    <tr className="border-b border-dashed bg-blue-50/30 hover:bg-blue-50/50">
      {/* Indented spacer for Date column */}
      <td className={cn(cellBase, 'sticky left-0 bg-blue-50/30 z-10 w-[60px]')}>
        <div className="flex items-center pl-3">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        </div>
      </td>

      {/* Invoice Ref */}
      <td className={cn(cellBase, 'sticky left-[60px] bg-blue-50/30 z-10 w-[170px]')} colSpan={1}>
        <input
          type="text"
          value={invoiceRef}
          onChange={(e) => setInvoiceRef(e.target.value)}
          onBlur={(e) => handleFieldBlur('invoiceRef', e.target.value)}
          placeholder="Invoice #"
          className={cn(inputBase, 'w-full')}
        />
      </td>

      {/* Notes / description */}
      <td className={cn(cellBase, 'w-[170px]')}>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={(e) => handleFieldBlur('notes', e.target.value)}
          placeholder="Notes"
          className={cn(inputBase)}
        />
      </td>

      {/* VAT / WHT type badges */}
      <td className={cn(cellBase, 'w-[60px] text-center')}>
        <div className="flex flex-col items-center gap-0.5">
          <select
            value={vatType}
            onChange={(e) => handleVatTypeChange(e.target.value as VatType)}
            className="h-5 text-[10px] px-0.5 border rounded bg-white w-[50px]"
          >
            <option value="none">No VAT</option>
            <option value="pp30">PP30</option>
            <option value="pp36">PP36</option>
          </select>
          <select
            value={whtType}
            onChange={(e) => handleWhtTypeChange(e.target.value as WhtType)}
            className="h-5 text-[10px] px-0.5 border rounded bg-white w-[50px]"
          >
            <option value="none">No WHT</option>
            <option value="pnd3">PND3</option>
            <option value="pnd53">PND53</option>
          </select>
        </div>
      </td>

      {/* Empty month column */}
      <td className={cn(cellBase, 'w-[115px]')} />

      {/* Total Amount */}
      <td className={cn(cellBase, 'text-right w-[90px]')}>
        <input
          type="text"
          value={formatNum(totalAmount)}
          onChange={(e) => setTotalAmount(parseNum(e.target.value))}
          onBlur={(e) => handleFieldBlur('totalAmount', e.target.value)}
          placeholder="Amount"
          className={cn(inputBase, 'text-right')}
        />
      </td>

      {/* Tax Base */}
      <td className={cn(cellBase, 'text-right w-[80px]')}>
        <input
          type="text"
          value={formatNum(taxBase)}
          onChange={(e) => setTaxBase(parseNum(e.target.value))}
          onBlur={(e) => handleFieldBlur('taxBase', e.target.value)}
          className={cn(inputBase, 'text-right')}
        />
      </td>

      {/* WHT Amount */}
      <td className={cn(cellBase, 'text-right w-[70px]')}>
        {whtType !== 'none' ? (
          <input
            type="text"
            value={formatNum(whtAmount)}
            onChange={(e) => setWhtAmount(parseNum(e.target.value))}
            onBlur={(e) => handleFieldBlur('whtAmount', e.target.value)}
            className={cn(inputBase, 'text-right')}
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>

      {/* VAT Amount */}
      <td className={cn(cellBase, 'text-right w-[70px]')}>
        {vatType !== 'none' ? (
          <input
            type="text"
            value={formatNum(vatAmount)}
            onChange={(e) => setVatAmount(parseNum(e.target.value))}
            onBlur={(e) => handleFieldBlur('vatAmount', e.target.value)}
            className={cn(inputBase, 'text-right')}
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>

      {/* Balance - empty */}
      <td className={cn(cellBase, 'w-[95px]')} />

      {/* Actions: search receipts + upload + doc link + delete */}
      <td className={cn(cellBase, 'w-[40px] text-center')}>
        <div className="flex items-center justify-center gap-0.5">
          {paymentDate && (
            <ReceiptPickerPopover
              paymentDate={paymentDate}
              vendorId={vendorId}
              onSelect={handleReceiptSelected}
            />
          )}
          <DocumentUploadButton
            onExtracted={handleInvoiceExtracted}
            paymentDate={paymentDate}
            vendorName={vendorName}
          />
          {item.document_url && (
            <a
              href={item.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted/50 text-blue-500"
              title="View document"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"
            title="Remove item"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}
