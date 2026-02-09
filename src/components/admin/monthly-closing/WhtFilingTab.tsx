'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Hash,
  Banknote,
  Receipt,
  CircleCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';
import { generateWhtFile } from '@/lib/wht-file-generator';
import type { WhtEntry, WhtFilingData } from '@/types/tax-filing';

interface WhtFilingTabProps {
  period: string; // YYYY-MM
}

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string): string {
  if (!d) return '';
  const parts = d.split('-');
  return `${parts[2]}/${parts[1]}`;
}

export function WhtFilingTab({ period }: WhtFilingTabProps) {
  const [formType, setFormType] = useState<'pnd3' | 'pnd53'>('pnd3');
  const [data, setData] = useState<WhtFilingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingRows, setSavingRows] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async (p: string, ft: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tax-filing/wht-data?period=${p}&form_type=${ft}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const result: WhtFilingData = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load when period or form type changes
  useEffect(() => {
    fetchData(period, formType);
  }, [period, formType, fetchData]);

  // Save vendor tax info
  const saveVendorField = useCallback(async (
    entryId: number,
    vendorId: string,
    field: string,
    value: string | boolean
  ) => {
    setSavingRows((prev) => new Set(prev).add(entryId));
    try {
      const res = await fetch('/api/admin/tax-filing/update-vendor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, [field]: value }),
      });
      if (!res.ok) {
        console.error('Failed to save vendor field');
      }
    } catch {
      /* ignore */
    } finally {
      setSavingRows((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  }, []);

  // Debounced save
  const debouncedSave = useMemo(
    () =>
      debounce((entryId: number, vendorId: string, field: string, value: string | boolean) => {
        saveVendorField(entryId, vendorId, field, value);
      }, 500),
    [saveVendorField]
  );

  useEffect(() => {
    return () => {
      debouncedSave.flush();
    };
  }, [debouncedSave]);

  // Update a field locally and trigger debounced save.
  // vendor_id is passed directly from the row to avoid stale closure.
  const handleFieldChange = useCallback((
    entryId: number,
    field: keyof WhtEntry,
    value: string,
    vendorField?: string,
    vendorId?: string | null
  ) => {
    setData((prev) => {
      if (!prev) return prev;
      const entries = prev.entries.map((e) => {
        if (e.id !== entryId) return e;
        const updated = { ...e, [field]: value };

        // Revalidate completeness
        const missingFields: string[] = [];
        if (!updated.tax_id) missingFields.push('tax_id');
        if (!updated.first_name) missingFields.push('first_name');
        if (!updated.address) missingFields.push('address');
        if (!updated.is_company && !updated.last_name) missingFields.push('last_name');
        updated.missing_fields = missingFields;
        updated.is_complete = missingFields.length === 0;

        return updated;
      });

      // Recalculate summary
      const summary = {
        ...prev.summary,
        complete_entries: entries.filter((e) => e.is_complete).length,
        incomplete_entries: entries.filter((e) => !e.is_complete).length,
      };

      return { ...prev, entries, summary };
    });

    // Trigger debounced save to vendor if vendor field mapping provided
    if (vendorField && vendorId) {
      debouncedSave(entryId, vendorId, vendorField, value);
    }
  }, [debouncedSave]);

  // Handle condition change (ephemeral — only affects generated file, not persisted)
  const handleConditionChange = useCallback((entryId: number, value: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const entries = prev.entries.map((e) => {
        if (e.id !== entryId) return e;
        return { ...e, condition: Number(value) as 1 | 2 | 3 };
      });
      return { ...prev, entries };
    });
  }, []);

  // Generate and download file
  const handleGenerate = useCallback(() => {
    if (!data) return;
    const { content, filename } = generateWhtFile(data);

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const allComplete = data ? data.summary.incomplete_entries === 0 && data.entries.length > 0 : false;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={formType} onValueChange={(v) => setFormType(v as 'pnd3' | 'pnd53')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pnd3">PND3 (บุคคล)</SelectItem>
            <SelectItem value="pnd53">PND53 (นิติบุคคล)</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(period, formType)}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading WHT data...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Hash className="h-4 w-4" />
                  <span>Total Entries</span>
                </div>
                <p className="text-2xl font-bold">{data.summary.total_entries}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Banknote className="h-4 w-4" />
                  <span>Total Tax Base</span>
                </div>
                <p className="text-2xl font-bold">{formatNum(data.summary.total_tax_base)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Receipt className="h-4 w-4" />
                  <span>Total WHT</span>
                </div>
                <p className="text-2xl font-bold">{formatNum(data.summary.total_wht)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <CircleCheck className="h-4 w-4" />
                  <span>Completeness</span>
                </div>
                <p className="text-2xl font-bold">
                  <span className={allComplete ? 'text-green-600' : 'text-amber-600'}>
                    {data.summary.complete_entries}
                  </span>
                  <span className="text-gray-400 text-lg"> / {data.summary.total_entries}</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Empty state */}
          {data.entries.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No {formType.toUpperCase()} entries found</p>
              <p className="text-sm mt-1">
                No WHT transactions for this period and form type
              </p>
            </div>
          )}

          {/* Editable Table */}
          {data.entries.length > 0 && (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-8">#</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-8"></th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[120px]">Vendor</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[130px]">Tax ID</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[60px]">Prefix</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[100px]">First Name</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[100px]">Last Name</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[180px]">Address</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 w-[70px]">Date</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-500 w-[60px]">Rate%</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-500 min-w-[100px]">Tax Base</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-500 min-w-[90px]">WHT</th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500 w-[60px]">Cond</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry, idx) => (
                    <WhtEntryRow
                      key={entry.id}
                      entry={entry}
                      seq={idx + 1}
                      isSaving={savingRows.has(entry.id)}
                      onFieldChange={handleFieldChange}
                      onConditionChange={handleConditionChange}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t font-medium">
                    <td colSpan={9} className="px-2 py-2 text-right text-gray-500">
                      Totals ({data.entries.length} entries)
                    </td>
                    <td className="px-2 py-2 text-right"></td>
                    <td className="px-2 py-2 text-right">{formatNum(data.summary.total_tax_base)}</td>
                    <td className="px-2 py-2 text-right">{formatNum(data.summary.total_wht)}</td>
                    <td className="px-2 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Generate Bar */}
          {data.entries.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
              <div className="text-sm text-gray-600">
                {allComplete ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    All entries complete — ready to generate
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    {data.summary.incomplete_entries} entry(ies) missing required fields
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {data.form_type === 'pnd3' ? 'PND3' : 'PND53'}_{data.company_tax_id}_
                  {(() => {
                    const [y, m] = data.period.split('-');
                    return `${Number(y) + 543}${m}`;
                  })()}.txt
                </span>
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={!allComplete}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Generate .txt
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Individual Row Component ───────────────────────────────────────────────

interface WhtEntryRowProps {
  entry: WhtEntry;
  seq: number;
  isSaving: boolean;
  onFieldChange: (id: number, field: keyof WhtEntry, value: string, vendorField?: string, vendorId?: string | null) => void;
  onConditionChange: (id: number, value: string) => void;
}

function WhtEntryRow({ entry, seq, isSaving, onFieldChange, onConditionChange }: WhtEntryRowProps) {
  const [taxId, setTaxId] = useState(entry.tax_id);
  const [prefix, setPrefix] = useState(entry.prefix);
  const [firstName, setFirstName] = useState(entry.first_name);
  const [lastName, setLastName] = useState(entry.last_name);
  const [address, setAddress] = useState(entry.address);

  // Sync from parent when data reloads
  useEffect(() => {
    setTaxId(entry.tax_id);
    setPrefix(entry.prefix);
    setFirstName(entry.first_name);
    setLastName(entry.last_name);
    setAddress(entry.address);
  }, [entry.tax_id, entry.prefix, entry.first_name, entry.last_name, entry.address]);

  const hasError = !entry.is_complete;

  // Pass vendor_id directly from the entry to avoid stale closures in the parent
  const vid = entry.vendor_id;

  return (
    <tr className={cn(
      "border-b hover:bg-gray-50/50 transition-colors",
      hasError && "bg-red-50/50",
      isSaving && "opacity-70"
    )}>
      {/* Seq */}
      <td className="px-2 py-1.5 text-gray-400 text-xs">{seq}</td>

      {/* Status */}
      <td className="px-2 py-1.5">
        {entry.is_complete ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <span title={`Missing: ${entry.missing_fields.join(', ')}`}>
            <AlertCircle className="h-4 w-4 text-red-400" />
          </span>
        )}
      </td>

      {/* Vendor Name (read-only) */}
      <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">
        {entry.vendor_name}
      </td>

      {/* Tax ID */}
      <td className="px-2 py-1.5">
        <Input
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
          onBlur={() => onFieldChange(entry.id, 'tax_id', taxId, 'tax_id', vid)}
          className={cn("h-7 text-xs", !taxId && "border-red-300")}
          placeholder="13-digit ID"
        />
      </td>

      {/* Prefix */}
      <td className="px-2 py-1.5">
        <Input
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          onBlur={() => onFieldChange(entry.id, 'prefix', prefix, 'prefix', vid)}
          className="h-7 text-xs w-[60px]"
          placeholder="คุณ"
        />
      </td>

      {/* First Name */}
      <td className="px-2 py-1.5">
        <Input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          onBlur={() => onFieldChange(entry.id, 'first_name', firstName, 'tax_first_name', vid)}
          className={cn("h-7 text-xs", !firstName && "border-red-300")}
          placeholder="First name"
        />
      </td>

      {/* Last Name */}
      <td className="px-2 py-1.5">
        <Input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          onBlur={() => onFieldChange(entry.id, 'last_name', lastName, 'tax_last_name', vid)}
          className={cn("h-7 text-xs", !entry.is_company && !lastName && "border-red-300")}
          placeholder={entry.is_company ? '(company)' : 'Last name'}
          disabled={entry.is_company}
        />
      </td>

      {/* Address */}
      <td className="px-2 py-1.5">
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onBlur={() => onFieldChange(entry.id, 'address', address, 'address', vid)}
          className={cn("h-7 text-xs", !address && "border-red-300")}
          placeholder="Full address"
        />
      </td>

      {/* Date (read-only) */}
      <td className="px-2 py-1.5 text-xs text-gray-500 whitespace-nowrap">
        {formatDate(entry.transaction_date)}
      </td>

      {/* Rate (read-only) */}
      <td className="px-2 py-1.5 text-xs text-right text-gray-500">
        {entry.wht_rate.toFixed(2)}%
      </td>

      {/* Tax Base (read-only) */}
      <td className="px-2 py-1.5 text-xs text-right font-mono">
        {formatNum(entry.tax_base)}
      </td>

      {/* WHT (read-only) */}
      <td className="px-2 py-1.5 text-xs text-right font-mono">
        {formatNum(entry.wht_amount)}
      </td>

      {/* Condition */}
      <td className="px-2 py-1.5">
        <select
          value={String(entry.condition)}
          onChange={(e) => onConditionChange(entry.id, e.target.value)}
          className="h-7 text-xs border rounded px-1 bg-white w-[50px]"
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </td>
    </tr>
  );
}
