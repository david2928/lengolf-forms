'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Copy, Tags, ExternalLink, Link2, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VendorCombobox } from './VendorCombobox';
import { VendorDetailPopover } from './VendorDetailPopover';
import { InvoiceUploadButton } from './InvoiceUploadButton';
import { ReceiptMatchPopover } from './ReceiptMatchPopover';
import { recalcAll, calcVat, calcWht } from './TaxCalculator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import debounce from 'lodash/debounce';
import type {
  AnnotatedTransaction,
  Vendor,
  VatType,
  WhtType,
  TransactionType,
  AnnotationUpsert,
  InvoiceExtraction,
} from '@/types/expense-tracker';
import type { MatchResult } from '@/lib/receipt-matching-engine';

interface ExpenseTrackerRowProps {
  row: AnnotatedTransaction;
  onAnnotationSaved: (bankTxId: number, annotation: AnnotationUpsert) => void;
  onVendorUpdated: (vendor: Vendor) => void;
  receiptMatches?: MatchResult[];
  onReceiptLinked?: (bankTxId: number, receiptId: string, source?: 'receipt' | 'invoice') => Promise<void>;
  onReceiptUnlinked?: (bankTxId: number) => Promise<void>;
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

function formatDate(d: string): string {
  const parts = d.split('-');
  return `${parts[2]}/${parts[1]}`;
}

export function ExpenseTrackerRow({ row, onAnnotationSaved, onVendorUpdated, receiptMatches, onReceiptLinked, onReceiptUnlinked }: ExpenseTrackerRowProps) {
  const { transaction: tx, annotation: ann, vendor: initialVendor } = row;
  const amount = Number(tx.withdrawal) || Number(tx.deposit) || 0;
  const isWithdrawal = Number(tx.withdrawal) > 0;

  const [vendor, setVendor] = useState<Vendor | null>(initialVendor);
  const [vendorNameOverride, setVendorNameOverride] = useState(ann?.vendor_name_override || null);
  const [vatType, setVatType] = useState<VatType>(ann?.vat_type || 'none');
  const [vatAmount, setVatAmount] = useState<number | null>(ann?.vat_amount ?? null);
  const [reportingMonth, setReportingMonth] = useState(ann?.vat_reporting_month || ann?.wht_reporting_month || '');
  const [whtType, setWhtType] = useState<WhtType>(ann?.wht_type || 'none');
  const [whtRate, setWhtRate] = useState(ann?.wht_rate ?? 3);
  const [whtAmount, setWhtAmount] = useState<number | null>(ann?.wht_amount ?? null);
  const [taxBase, setTaxBase] = useState<number | null>(ann?.tax_base ?? null);
  const [vatOverride, setVatOverride] = useState(ann?.vat_amount_override || false);
  const [whtOverride, setWhtOverride] = useState(ann?.wht_amount_override || false);
  const [taxBaseOverride, setTaxBaseOverride] = useState(ann?.tax_base_override || false);
  const [invoiceRef, setInvoiceRef] = useState(ann?.invoice_ref || '');
  const [documentUrl, setDocumentUrl] = useState(ann?.document_url || null);
  const [transactionType, setTransactionType] = useState<TransactionType | null>(ann?.transaction_type || null);
  const [notes, setNotes] = useState(ann?.notes || '');
  const [saving, setSaving] = useState(false);
  const [taxPopoverOpen, setTaxPopoverOpen] = useState(false);

  const isAnnotated = !!(ann || vendor || vendorNameOverride || vatType !== 'none' || whtType !== 'none' || transactionType || invoiceRef || notes);
  const hasTax = vatType !== 'none' || whtType !== 'none';
  const hasType = hasTax || !!transactionType;

  // Debounced save
  const saveRef = useRef<ReturnType<typeof debounce>>();

  const doSave = useCallback(
    async (data: AnnotationUpsert) => {
      setSaving(true);
      try {
        const res = await fetch('/api/admin/expense-tracker/annotations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          onAnnotationSaved(tx.id, data);
        }
      } catch { /* ignore */ } finally {
        setSaving(false);
      }
    },
    [tx.id, onAnnotationSaved]
  );

  const debouncedSave = useMemo(
    () =>
      debounce((data: AnnotationUpsert) => {
        doSave(data);
      }, 500),
    [doSave]
  );

  useEffect(() => {
    saveRef.current = debouncedSave;
    return () => {
      debouncedSave.flush();
    };
  }, [debouncedSave]);

  const buildAnnotation = useCallback(
    (overrides?: Partial<{
      vendor_id: string | null;
      vendor_name_override: string | null;
      vat_type: VatType;
      vat_amount: number | null;
      vat_reporting_month: string | null;
      wht_type: WhtType;
      wht_rate: number;
      wht_amount: number | null;
      wht_reporting_month: string | null;
      tax_base: number | null;
      vat_amount_override: boolean;
      wht_amount_override: boolean;
      tax_base_override: boolean;
      invoice_ref: string | null;
      transaction_type: TransactionType | null;
      notes: string | null;
    }>): AnnotationUpsert => ({
      bank_transaction_id: tx.id,
      vendor_id: vendor?.id ?? null,
      vendor_name_override: vendorNameOverride,
      vat_type: vatType,
      vat_amount: vatAmount,
      vat_reporting_month: reportingMonth || null,
      wht_type: whtType,
      wht_rate: whtRate,
      wht_amount: whtAmount,
      wht_reporting_month: reportingMonth || null,
      tax_base: taxBase,
      vat_amount_override: vatOverride,
      wht_amount_override: whtOverride,
      tax_base_override: taxBaseOverride,
      invoice_ref: invoiceRef || null,
      transaction_type: transactionType,
      notes: notes || null,
      ...overrides,
    }),
    [tx.id, vendor, vendorNameOverride, vatType, vatAmount, reportingMonth, whtType, whtRate, whtAmount, taxBase, vatOverride, whtOverride, taxBaseOverride, invoiceRef, transactionType, notes]
  );

  const recalcAndSave = useCallback(
    (newVatType?: VatType, newWhtType?: WhtType, newWhtRate?: number) => {
      const vt = newVatType ?? vatType;
      const wt = newWhtType ?? whtType;
      const wr = newWhtRate ?? whtRate;

      const result = recalcAll({
        amount,
        vatType: vt,
        vatAmountOverride: vatOverride,
        currentVatAmount: vatAmount,
        whtType: wt,
        whtRate: wr,
        whtAmountOverride: whtOverride,
        currentWhtAmount: whtAmount,
        taxBaseOverride: taxBaseOverride,
        currentTaxBase: taxBase,
      });

      setVatAmount(result.vat_amount);
      setWhtAmount(result.wht_amount);
      setTaxBase(result.tax_base);

      const data = buildAnnotation({
        vat_type: vt,
        wht_type: wt,
        wht_rate: wr,
        vat_amount: result.vat_amount,
        wht_amount: result.wht_amount,
        tax_base: result.tax_base,
      });
      saveRef.current?.(data);
    },
    [amount, vatType, vatAmount, vatOverride, whtType, whtRate, whtAmount, whtOverride, taxBase, taxBaseOverride, buildAnnotation]
  );

  const handleVendorChange = useCallback(
    (v: Vendor | null, nameOverride: string | null) => {
      setVendor(v);
      setVendorNameOverride(nameOverride);
      const data = buildAnnotation({
        vendor_id: v?.id ?? null,
        vendor_name_override: nameOverride,
      });
      saveRef.current?.(data);
    },
    [buildAnnotation]
  );

  const toggleVatType = useCallback(
    (target: VatType) => {
      const newVat = vatType === target ? 'none' : target;
      setVatType(newVat);
      setVatOverride(false);
      if (newVat === 'none') {
        setVatAmount(null);
      }
      if (newVat !== 'none' && !reportingMonth) {
        const month = tx.transaction_date.substring(0, 7);
        setReportingMonth(month);
      }
      recalcAndSave(newVat, undefined, undefined);
    },
    [vatType, reportingMonth, tx.transaction_date, recalcAndSave]
  );

  const toggleWhtType = useCallback(
    (target: WhtType) => {
      const newWht = whtType === target ? 'none' : target;
      setWhtType(newWht);
      setWhtOverride(false);
      if (newWht !== 'none' && !reportingMonth) {
        const month = tx.transaction_date.substring(0, 7);
        setReportingMonth(month);
      }
      recalcAndSave(undefined, newWht, undefined);
    },
    [whtType, reportingMonth, tx.transaction_date, recalcAndSave]
  );

  const handleFieldBlur = useCallback(
    (field: string, value: string) => {
      const overrides: Record<string, unknown> = {};
      switch (field) {
        case 'vatAmount': {
          const v = parseNum(value);
          if (v != null) {
            setVatAmount(v);
            setVatOverride(true);
            overrides.vat_amount = v;
            overrides.vat_amount_override = true;
          }
          break;
        }
        case 'whtRate': {
          const r = parseFloat(value);
          if (!isNaN(r) && r >= 0) {
            setWhtRate(r);
            recalcAndSave(undefined, undefined, r);
            return;
          }
          break;
        }
        case 'whtAmount': {
          const w = parseNum(value);
          if (w != null) {
            setWhtAmount(w);
            setWhtOverride(true);
            overrides.wht_amount = w;
            overrides.wht_amount_override = true;
          }
          break;
        }
        case 'taxBase': {
          const t = parseNum(value);
          if (t != null) {
            setTaxBase(t);
            setTaxBaseOverride(true);
            overrides.tax_base = t;
            overrides.tax_base_override = true;
          }
          break;
        }
        case 'month':
          setReportingMonth(value);
          overrides.vat_reporting_month = value || null;
          overrides.wht_reporting_month = value || null;
          break;
        case 'invoiceRef':
          setInvoiceRef(value);
          overrides.invoice_ref = value || null;
          break;
        case 'notes':
          setNotes(value);
          overrides.notes = value || null;
          break;
      }
      const data = buildAnnotation(overrides);
      saveRef.current?.(data);
    },
    [buildAnnotation, recalcAndSave]
  );

  const handleInvoiceExtracted = useCallback(
    async (extraction: InvoiceExtraction, docUrl: string | null) => {
      if (docUrl) setDocumentUrl(docUrl);
      if (extraction.vat_type && extraction.vat_type !== 'none') {
        setVatType(extraction.vat_type);
        if (extraction.vat_amount != null) {
          setVatAmount(extraction.vat_amount);
          setVatOverride(true);
        }
      }
      if (extraction.invoice_number) setInvoiceRef(extraction.invoice_number);
      if (extraction.tax_base != null) {
        setTaxBase(extraction.tax_base);
        setTaxBaseOverride(true);
      }
      if (extraction.notes) setNotes(extraction.notes);
      if (extraction.wht_applicable && whtType === 'none') {
        setWhtType(vendor?.is_company ? 'pnd53' : 'pnd3');
      }

      const month = extraction.invoice_date?.substring(0, 7) || tx.transaction_date.substring(0, 7);
      if (!reportingMonth) setReportingMonth(month);

      let finalVendor = vendor;
      const companyNameEn = extraction.vendor_company_name_en || extraction.vendor_name;
      if (extraction.vendor_name && !vendor) {
        try {
          const res = await fetch('/api/admin/expense-tracker/vendors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: extraction.vendor_name,
              company_name: companyNameEn,
              address: extraction.vendor_address || null,
              tax_id: extraction.vendor_tax_id || null,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            finalVendor = data.vendor;
            setVendor(data.vendor);
            setVendorNameOverride(null);
          }
        } catch { /* ignore */ }
      } else if (vendor && (extraction.vendor_company_name_en || extraction.vendor_address || extraction.vendor_tax_id)) {
        const updates: Record<string, unknown> = { id: vendor.id };
        if (extraction.vendor_company_name_en) updates.company_name = extraction.vendor_company_name_en;
        if (extraction.vendor_address) updates.address = extraction.vendor_address;
        if (extraction.vendor_tax_id) updates.tax_id = extraction.vendor_tax_id;
        try {
          const res = await fetch('/api/admin/expense-tracker/vendors', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
          if (res.ok) {
            const data = await res.json();
            finalVendor = data.vendor;
            setVendor(data.vendor);
            onVendorUpdated(data.vendor);
          }
        } catch { /* ignore */ }
      }

      const result = recalcAll({
        amount,
        vatType: extraction.vat_type || vatType,
        vatAmountOverride: extraction.vat_amount != null,
        currentVatAmount: extraction.vat_amount,
        whtType: extraction.wht_applicable && whtType === 'none'
          ? (finalVendor?.is_company ? 'pnd53' : 'pnd3')
          : whtType,
        whtRate,
        whtAmountOverride: whtOverride,
        currentWhtAmount: whtAmount,
        taxBaseOverride: extraction.tax_base != null,
        currentTaxBase: extraction.tax_base,
      });

      setVatAmount(result.vat_amount);
      setWhtAmount(result.wht_amount);
      setTaxBase(result.tax_base);

      doSave({
        bank_transaction_id: tx.id,
        vendor_id: finalVendor?.id ?? null,
        vendor_name_override: null,
        vat_type: extraction.vat_type || vatType,
        vat_amount: extraction.vat_amount ?? result.vat_amount,
        vat_amount_override: extraction.vat_amount != null,
        vat_reporting_month: month || null,
        wht_type: extraction.wht_applicable && whtType === 'none'
          ? (finalVendor?.is_company ? 'pnd53' : 'pnd3')
          : whtType,
        wht_rate: whtRate,
        wht_amount: result.wht_amount,
        wht_amount_override: whtOverride,
        wht_reporting_month: month || null,
        tax_base: extraction.tax_base ?? result.tax_base,
        tax_base_override: extraction.tax_base != null,
        invoice_ref: extraction.invoice_number || invoiceRef || null,
        document_url: docUrl || documentUrl || null,
        notes: extraction.notes || notes || null,
      });
    },
    [tx.id, tx.transaction_date, amount, vendor, vatType, whtType, whtRate, whtAmount, whtOverride, reportingMonth, invoiceRef, documentUrl, notes, doSave, onVendorUpdated]
  );

  // Mismatch detection: compare stored override values against formula-calculated values
  const vatMismatch = useMemo(() => {
    if (vatType === 'none' || vatAmount == null) return null;
    const expected = calcVat(amount, vatType);
    const diff = Math.round((vatAmount - expected) * 100) / 100;
    if (Math.abs(diff) <= 0.01) return null;
    return { expected, diff };
  }, [vatType, vatAmount, amount]);

  const whtMismatch = useMemo(() => {
    if (whtType === 'none' || whtAmount == null) return null;
    const expected = calcWht(amount, whtType, whtRate);
    const diff = Math.round((whtAmount - expected) * 100) / 100;
    if (Math.abs(diff) <= 0.01) return null;
    return { expected, diff };
  }, [whtType, whtAmount, whtRate, amount]);

  const cellBase = 'px-2 py-1.5 text-xs whitespace-nowrap';
  const inputBase = 'h-6 text-xs px-1.5 border-0 bg-transparent hover:bg-muted/50 focus:bg-white focus:ring-1 focus:ring-ring rounded w-full';

  const toggleTransactionType = useCallback(
    (target: TransactionType) => {
      const newType = transactionType === target ? null : target;
      setTransactionType(newType);
      const data = buildAnnotation({ transaction_type: newType });
      saveRef.current?.(data);
    },
    [transactionType, buildAnnotation]
  );

  // Type badge rendering (inline summary)
  const typeBadges = () => {
    const badges: JSX.Element[] = [];
    if (vatType === 'pp30') badges.push(<span key="v" className="px-1 py-px rounded bg-blue-100 text-blue-700 text-[10px] font-medium leading-none">PP30</span>);
    if (vatType === 'pp36') badges.push(<span key="v" className="px-1 py-px rounded bg-violet-100 text-violet-700 text-[10px] font-medium leading-none">PP36</span>);
    if (whtType === 'pnd3') badges.push(<span key="w" className="px-1 py-px rounded bg-orange-100 text-orange-700 text-[10px] font-medium leading-none">PND3</span>);
    if (whtType === 'pnd53') badges.push(<span key="w" className="px-1 py-px rounded bg-amber-100 text-amber-700 text-[10px] font-medium leading-none">PND53</span>);
    if (transactionType === 'salary') badges.push(<span key="sal" className="px-1 py-px rounded bg-green-100 text-green-700 text-[10px] font-medium leading-none">SAL</span>);
    if (transactionType === 'sso') badges.push(<span key="sso" className="px-1 py-px rounded bg-teal-100 text-teal-700 text-[10px] font-medium leading-none">SSO</span>);
    if (transactionType === 'internal_transfer') badges.push(<span key="it" className="px-1 py-px rounded bg-gray-200 text-gray-600 text-[10px] font-medium leading-none">XFER</span>);
    if (transactionType === 'tax_payment') badges.push(<span key="tp" className="px-1 py-px rounded bg-red-100 text-red-700 text-[10px] font-medium leading-none">TAX</span>);
    if (transactionType === 'cash_deposit') badges.push(<span key="cd" className="px-1 py-px rounded bg-emerald-100 text-emerald-700 text-[10px] font-medium leading-none">CASH</span>);
    if (transactionType === 'sale') badges.push(<span key="sale" className="px-1 py-px rounded bg-cyan-100 text-cyan-700 text-[10px] font-medium leading-none">SALE</span>);
    if (transactionType === 'credit_card') badges.push(<span key="cc" className="px-1 py-px rounded bg-indigo-100 text-indigo-700 text-[10px] font-medium leading-none">CARD</span>);
    if (transactionType === 'ewallet') badges.push(<span key="ew" className="px-1 py-px rounded bg-pink-100 text-pink-700 text-[10px] font-medium leading-none">eWAL</span>);
    if (transactionType === 'qr_payment') badges.push(<span key="qr" className="px-1 py-px rounded bg-lime-100 text-lime-700 text-[10px] font-medium leading-none">QR</span>);
    if (transactionType === 'platform_settlement') badges.push(<span key="ps" className="px-1 py-px rounded bg-purple-100 text-purple-700 text-[10px] font-medium leading-none">PLAT</span>);
    return badges;
  };

  const COLOR_CLASSES: Record<string, string> = {
    gray: 'bg-gray-200 text-gray-700 ring-1 ring-gray-300',
    blue: 'bg-blue-100 text-blue-700 ring-1 ring-blue-300',
    violet: 'bg-violet-100 text-violet-700 ring-1 ring-violet-300',
    orange: 'bg-orange-100 text-orange-700 ring-1 ring-orange-300',
    amber: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300',
    green: 'bg-green-100 text-green-700 ring-1 ring-green-300',
    teal: 'bg-teal-100 text-teal-700 ring-1 ring-teal-300',
    red: 'bg-red-100 text-red-700 ring-1 ring-red-300',
    emerald: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300',
    cyan: 'bg-cyan-100 text-cyan-700 ring-1 ring-cyan-300',
    indigo: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300',
    pink: 'bg-pink-100 text-pink-700 ring-1 ring-pink-300',
    lime: 'bg-lime-100 text-lime-700 ring-1 ring-lime-300',
  };

  const badgeBtn = (active: boolean, color: string, label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2 py-1 rounded text-[11px] font-medium transition-colors',
        active
          ? COLOR_CLASSES[color] || 'bg-gray-200 text-gray-700 ring-1 ring-gray-300'
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
      )}
    >
      {label}
    </button>
  );

  return (
    <tr
      className={cn(
        'border-b hover:bg-muted/30 transition-colors',
        isAnnotated && 'bg-green-50/50',
        saving && 'opacity-70'
      )}
    >
      {/* Date */}
      <td className={cn(cellBase, 'sticky left-0 bg-inherit z-10 w-[70px]')}>
        <div>{formatDate(tx.transaction_date)}</div>
        <div className="text-[10px] text-muted-foreground">{tx.transaction_time?.substring(0, 5)}</div>
      </td>

      {/* Description */}
      <td
        className={cn(cellBase, 'sticky left-[70px] bg-inherit z-10 w-[200px]')}
        title={[tx.description, tx.details, tx.category].filter(Boolean).join(' | ')}
      >
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={(e) => handleFieldBlur('notes', e.target.value)}
          placeholder="Add description..."
          className="h-5 text-xs font-medium px-0 border-0 bg-transparent hover:bg-muted/50 focus:bg-white focus:ring-1 focus:ring-ring rounded w-full placeholder:text-muted-foreground/40 placeholder:font-normal"
        />
        {tx.details && (
          <div className="text-[10px] text-muted-foreground truncate">{tx.details}</div>
        )}
      </td>

      {/* Vendor */}
      <td className={cn(cellBase, 'w-[200px]')}>
        <div className="flex items-center gap-0.5">
          <VendorCombobox
            value={vendor}
            vendorNameOverride={vendorNameOverride}
            onChange={handleVendorChange}
            compact
          />
          {vendor && <VendorDetailPopover vendor={vendor} onUpdate={onVendorUpdated} />}
          <InvoiceUploadButton
            onExtracted={handleInvoiceExtracted}
            paymentDate={tx.transaction_date}
            vendorName={vendor?.company_name || vendor?.name || vendorNameOverride || undefined}
          />
          {receiptMatches && receiptMatches.length > 0 && onReceiptLinked && (
            <ReceiptMatchPopover
              matches={receiptMatches}
              onLink={(receiptId, source) => onReceiptLinked(tx.id, receiptId, source)}
            />
          )}
        </div>
      </td>

      {/* Type - popover with badge toggles */}
      <td className={cn(cellBase, 'w-[75px] text-center')}>
        <Popover open={taxPopoverOpen} onOpenChange={setTaxPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 hover:bg-muted/50 transition-colors"
            >
              {hasType ? (
                <span className="flex items-center gap-0.5 flex-wrap">{typeBadges()}</span>
              ) : (
                <Tags className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-2" align="start">
            <div className="space-y-2">
              <div>
                <div className="text-[10px] font-medium text-muted-foreground mb-1">VAT</div>
                <div className="flex gap-1">
                  {badgeBtn(vatType === 'none', 'gray', 'None', () => { if (vatType !== 'none') toggleVatType(vatType); })}
                  {badgeBtn(vatType === 'pp30', 'blue', 'PP30', () => toggleVatType('pp30'))}
                  {badgeBtn(vatType === 'pp36', 'violet', 'PP36', () => toggleVatType('pp36'))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-medium text-muted-foreground mb-1">WHT</div>
                <div className="flex gap-1">
                  {badgeBtn(whtType === 'pnd3', 'orange', 'PND3', () => toggleWhtType('pnd3'))}
                  {badgeBtn(whtType === 'pnd53', 'amber', 'PND53', () => toggleWhtType('pnd53'))}
                </div>
              </div>
              {whtType !== 'none' && (
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">WHT Rate</div>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={String(whtRate)}
                      onChange={(e) => setWhtRate(parseFloat(e.target.value) || 0)}
                      onBlur={(e) => handleFieldBlur('whtRate', e.target.value)}
                      className="h-6 w-[50px] text-xs px-1.5 border rounded bg-white focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              )}
              <div>
                <div className="text-[10px] font-medium text-muted-foreground mb-1">Income</div>
                <div className="grid grid-cols-3 gap-1">
                  {badgeBtn(transactionType === 'credit_card', 'indigo', 'Card', () => toggleTransactionType('credit_card'))}
                  {badgeBtn(transactionType === 'ewallet', 'pink', 'eWallet', () => toggleTransactionType('ewallet'))}
                  {badgeBtn(transactionType === 'qr_payment', 'lime', 'QR', () => toggleTransactionType('qr_payment'))}
                  {badgeBtn(transactionType === 'sale', 'cyan', 'Sale', () => toggleTransactionType('sale'))}
                  {badgeBtn(transactionType === 'platform_settlement', 'purple', 'Platform', () => toggleTransactionType('platform_settlement'))}
                  {badgeBtn(transactionType === 'cash_deposit', 'emerald', 'Cash', () => toggleTransactionType('cash_deposit'))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-medium text-muted-foreground mb-1">Expense</div>
                <div className="grid grid-cols-3 gap-1">
                  {badgeBtn(transactionType === 'salary', 'green', 'Salary', () => toggleTransactionType('salary'))}
                  {badgeBtn(transactionType === 'sso', 'teal', 'SSO', () => toggleTransactionType('sso'))}
                  {badgeBtn(transactionType === 'tax_payment', 'red', 'Tax Pmt', () => toggleTransactionType('tax_payment'))}
                  {badgeBtn(transactionType === 'internal_transfer', 'gray', 'Transfer', () => toggleTransactionType('internal_transfer'))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </td>

      {/* Reporting Month */}
      <td className={cn(cellBase, 'w-[145px]')}>
        {hasTax ? (
          <input
            type="month"
            value={reportingMonth}
            onChange={(e) => {
              setReportingMonth(e.target.value);
              handleFieldBlur('month', e.target.value);
            }}
            className={cn(inputBase, 'w-[140px]')}
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>

      {/* Amount */}
      <td className={cn(cellBase, 'text-right w-[95px] tabular-nums', isWithdrawal ? 'text-red-600' : 'text-green-600')}>
        {isWithdrawal ? `-${formatNum(tx.withdrawal)}` : formatNum(tx.deposit)}
      </td>

      {/* Tax Base */}
      <td className={cn(cellBase, 'w-[85px] text-right')}>
        {hasTax ? (
          <input
            type="text"
            value={formatNum(taxBase)}
            onChange={(e) => setTaxBase(parseNum(e.target.value))}
            onBlur={(e) => handleFieldBlur('taxBase', e.target.value)}
            className={cn(inputBase, 'text-right')}
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>

      {/* WHT Amount */}
      <td className={cn(cellBase, 'w-[80px] text-right')}>
        {whtType !== 'none' ? (
          <input
            type="text"
            value={formatNum(whtAmount)}
            onChange={(e) => setWhtAmount(parseNum(e.target.value))}
            onBlur={(e) => handleFieldBlur('whtAmount', e.target.value)}
            className={cn(inputBase, 'text-right', whtMismatch && 'ring-1 ring-amber-400 bg-amber-50')}
            title={whtMismatch ? `Expected: ${formatNum(whtMismatch.expected)} (${whtMismatch.diff > 0 ? '+' : ''}${formatNum(whtMismatch.diff)})` : undefined}
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>

      {/* VAT Amount */}
      <td className={cn(cellBase, 'w-[80px] text-right')}>
        {vatType !== 'none' ? (
          <input
            type="text"
            value={formatNum(vatAmount)}
            onChange={(e) => setVatAmount(parseNum(e.target.value))}
            onBlur={(e) => handleFieldBlur('vatAmount', e.target.value)}
            className={cn(inputBase, 'text-right', vatMismatch && 'ring-1 ring-amber-400 bg-amber-50')}
            title={vatMismatch ? `Expected: ${formatNum(vatMismatch.expected)} (${vatMismatch.diff > 0 ? '+' : ''}${formatNum(vatMismatch.diff)})` : undefined}
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>

      {/* Running Balance */}
      <td className={cn(cellBase, 'text-right w-[110px] text-muted-foreground tabular-nums font-mono')}>
        {formatNum(tx.balance)}
      </td>

      {/* Document # / link */}
      <td className={cn(cellBase, 'w-[40px] text-center')}>
        <div className="flex items-center justify-center gap-0.5">
          {(ann?.vendor_receipt_id || (ann?.invoice_ref && !ann?.vendor_receipt_id)) && (
            onReceiptUnlinked ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Unlink this document from the transaction?')) {
                    onReceiptUnlinked(tx.id);
                  }
                }}
                className="group inline-flex items-center justify-center h-5 w-5 text-green-500 hover:text-red-500 rounded hover:bg-red-50"
                title={ann?.vendor_receipt_id ? 'Click to unlink receipt' : 'Click to unlink invoice'}
              >
                <Link2 className="h-3 w-3 group-hover:hidden" />
                <Unlink className="h-3 w-3 hidden group-hover:block" />
              </button>
            ) : (
              <span
                className="inline-flex items-center justify-center h-5 w-5 text-green-500"
                title={ann?.vendor_receipt_id ? 'Linked to vendor receipt' : 'Linked to invoice'}
              >
                <Link2 className="h-3 w-3" />
              </span>
            )
          )}
          {documentUrl && (
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted/50 text-blue-500 hover:text-blue-700"
              title="View document"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {invoiceRef && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(invoiceRef)}
              className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              title={`Copy: ${invoiceRef}`}
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
