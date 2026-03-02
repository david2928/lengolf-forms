'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { FileUp, FolderUp, Loader2, AlertCircle, Check, X, ExternalLink } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import type { InvoiceExtraction, VatType, WhtType, TransactionType } from '@/types/expense-tracker';

// ── Tax filing types (extensible — add new types here) ─────────────────────

type FilingType = 'pp30' | 'pp36' | 'pnd3' | 'pnd53' | 'sso';

const FILING_CONFIG: Record<FilingType, { label: string; color: string; needsDescription: boolean }> = {
  pp30:  { label: 'PP30 (VAT)',  color: 'bg-blue-100 text-blue-700',   needsDescription: true },
  pp36:  { label: 'PP36 (VAT)',  color: 'bg-violet-100 text-violet-700', needsDescription: true },
  pnd3:  { label: 'PND3 (WHT)',  color: 'bg-orange-100 text-orange-700', needsDescription: false },
  pnd53: { label: 'PND53 (WHT)', color: 'bg-amber-100 text-amber-700',  needsDescription: false },
  sso:   { label: 'SSO',         color: 'bg-teal-100 text-teal-700',    needsDescription: false },
};

function getAvailableFilingTypes(
  vatType: VatType,
  whtType: WhtType,
  transactionType: TransactionType | null
): FilingType[] {
  const types: FilingType[] = [];
  if (vatType === 'pp30') types.push('pp30');
  if (vatType === 'pp36') types.push('pp36');
  if (whtType === 'pnd3') types.push('pnd3');
  if (whtType === 'pnd53') types.push('pnd53');
  if (transactionType === 'sso') types.push('sso');
  return types;
}

// ── AI extraction config ───────────────────────────────────────────────────

const MODELS = [
  { id: 'gpt-5.2', label: 'GPT-5.2', description: 'Best for Thai PDFs - reads Thai script natively' },
  { id: 'gpt-4o', label: 'GPT-4o', description: 'Struggles with Thai text in PDFs' },
  { id: 'gpt-5-mini', label: 'GPT-5 Mini', description: 'Budget flagship' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Budget, good for images' },
] as const;

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-green-600',
  medium: 'text-amber-600',
  low: 'text-red-600',
};

const VAT_OPTIONS: { value: VatType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'pp30', label: 'PP30' },
  { value: 'pp36', label: 'PP36' },
];

const inputCls = 'h-6 text-xs px-1.5 border rounded bg-background w-full focus:outline-none focus:ring-1 focus:ring-ring';
const numInputCls = `${inputCls} text-right font-mono`;

// ── Component ──────────────────────────────────────────────────────────────

interface DocumentUploadButtonProps {
  onExtracted: (extraction: InvoiceExtraction, documentUrl: string | null) => void;
  paymentDate?: string;
  vendorName?: string;
  // Tax context — when present and relevant, switches to tax filing mode
  vatType?: VatType;
  whtType?: WhtType;
  transactionType?: TransactionType | null;
  reportingMonth?: string;
  onTaxDocUploaded?: (documentUrl: string) => void;
}

export function DocumentUploadButton({
  onExtracted,
  paymentDate,
  vendorName,
  vatType = 'none',
  whtType = 'none',
  transactionType = null,
  reportingMonth,
  onTaxDocUploaded,
}: DocumentUploadButtonProps) {
  // Determine mode
  const availableFilingTypes = getAvailableFilingTypes(vatType, whtType, transactionType);
  const isTaxMode = availableFilingTypes.length > 0;

  // ── Shared state ───────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'pdf' | 'image' | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // ── Extraction mode state ──────────────────────────────
  const [model, setModel] = useState<string>('gpt-5-mini');
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);
  const [pendingExtraction, setPendingExtraction] = useState<InvoiceExtraction | null>(null);
  const [pendingDocUrl, setPendingDocUrl] = useState<string | null>(null);

  // ── Tax filing mode state ──────────────────────────────
  const [selectedFiling, setSelectedFiling] = useState<FilingType | null>(null);
  const [taxDescription, setTaxDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [taxSuccess, setTaxSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveFiling = availableFilingTypes.length === 1 ? availableFilingTypes[0] : selectedFiling;
  const needsDescription = effectiveFiling ? FILING_CONFIG[effectiveFiling].needsDescription : false;
  const canUploadTax = effectiveFiling && selectedFile && (!needsDescription || taxDescription.trim());

  // ── Shared helpers ─────────────────────────────────────

  const cleanupPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewType(null);
  }, []);

  const resetAll = useCallback(() => {
    cleanupPreview();
    setError(null);
    // Extraction state
    setPendingExtraction(null);
    setPendingDocUrl(null);
    setLastModelUsed(null);
    // Tax filing state
    setSelectedFiling(null);
    setTaxDescription('');
    setSelectedFile(null);
    setTaxSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [cleanupPreview]);

  // ── Extraction mode handlers ───────────────────────────

  const updateField = useCallback((field: keyof InvoiceExtraction, value: unknown) => {
    setPendingExtraction(prev => prev ? { ...prev, [field]: value } : prev);
  }, []);

  const handleExtractionFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      setError(null);
      setLastModelUsed(null);
      setPendingExtraction(null);
      setPendingDocUrl(null);
      cleanupPreview();

      const localUrl = URL.createObjectURL(file);
      previewUrlRef.current = localUrl;
      setPreviewUrl(localUrl);
      setPreviewType(file.type === 'application/pdf' ? 'pdf' : 'image');

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', model);
        if (paymentDate) formData.append('payment_date', paymentDate);
        if (vendorName) formData.append('vendor_name', vendorName);

        const res = await fetch('/api/admin/expense-tracker/extract-invoice', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        setLastModelUsed(data.model_used || model);
        setPendingExtraction(data.extraction);
        setPendingDocUrl(data.document_url || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        cleanupPreview();
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    },
    [model, paymentDate, vendorName, cleanupPreview]
  );

  const handleApply = useCallback(() => {
    if (pendingExtraction) {
      onExtracted(pendingExtraction, pendingDocUrl);
      resetAll();
      setOpen(false);
    }
  }, [pendingExtraction, pendingDocUrl, onExtracted, resetAll]);

  const handleDiscard = useCallback(() => {
    setPendingExtraction(null);
    setPendingDocUrl(null);
    setLastModelUsed(null);
    cleanupPreview();
  }, [cleanupPreview]);

  // ── Tax filing mode handlers ───────────────────────────

  const handleTaxFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    setTaxSuccess(false);
  }, []);

  const handleTaxUpload = useCallback(async () => {
    if (!effectiveFiling || !selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File too large (max 10MB)');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('filing_type', effectiveFiling);
      formData.append('reporting_month', reportingMonth || '');
      if (taxDescription.trim()) {
        formData.append('description', taxDescription.trim());
      }

      const res = await fetch('/api/admin/expense-tracker/upload-tax-document', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setTaxSuccess(true);
      onTaxDocUploaded?.(data.fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [effectiveFiling, selectedFile, reportingMonth, taxDescription, onTaxDocUploaded]);

  // ── Render ─────────────────────────────────────────────

  const hasReview = pendingExtraction != null;

  return (
    <Popover open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) resetAll();
    }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          title={isTaxMode ? 'Upload to tax filing folder' : 'Upload document for auto-extraction'}
        >
          {isTaxMode ? <FolderUp className="h-3.5 w-3.5" /> : <FileUp className="h-3.5 w-3.5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={!isTaxMode && hasReview ? 'w-[420px]' : 'w-[280px]'}
        align="start"
      >
        {isTaxMode ? (
          /* ── Tax Filing Mode ───────────────────────────────── */
          <TaxFilingPanel
            availableTypes={availableFilingTypes}
            effectiveFiling={effectiveFiling}
            needsDescription={needsDescription}
            taxDescription={taxDescription}
            onDescriptionChange={setTaxDescription}
            selectedFile={selectedFile}
            onFileSelect={handleTaxFileSelect}
            onClearFile={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            fileInputRef={fileInputRef}
            onFilingSelect={setSelectedFiling}
            canUpload={!!canUploadTax}
            uploading={uploading}
            error={error}
            success={taxSuccess}
            onUpload={handleTaxUpload}
            reportingMonth={reportingMonth}
          />
        ) : hasReview ? (
          /* ── Extraction Review Panel ───────────────────────── */
          <ExtractionReviewPanel
            extraction={pendingExtraction}
            docUrl={pendingDocUrl}
            previewUrl={previewUrl}
            previewType={previewType}
            lastModelUsed={lastModelUsed}
            onUpdateField={updateField}
            onApply={handleApply}
            onDiscard={handleDiscard}
          />
        ) : (
          /* ── Extraction Upload Panel ───────────────────────── */
          <ExtractionUploadPanel
            model={model}
            onModelChange={setModel}
            uploading={uploading}
            error={error}
            previewUrl={previewUrl}
            previewType={previewType}
            onFileChange={handleExtractionFileChange}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ── Tax Filing Sub-panel ───────────────────────────────────────────────── */

function TaxFilingPanel({
  availableTypes,
  effectiveFiling,
  needsDescription,
  taxDescription,
  onDescriptionChange,
  selectedFile,
  onFileSelect,
  onClearFile,
  fileInputRef,
  onFilingSelect,
  canUpload,
  uploading,
  error,
  success,
  onUpload,
  reportingMonth,
}: {
  availableTypes: FilingType[];
  effectiveFiling: FilingType | null;
  needsDescription: boolean;
  taxDescription: string;
  onDescriptionChange: (v: string) => void;
  selectedFile: File | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  fileInputRef: React.Ref<HTMLInputElement>;
  onFilingSelect: (ft: FilingType) => void;
  canUpload: boolean;
  uploading: boolean;
  error: string | null;
  success: boolean;
  onUpload: () => void;
  reportingMonth?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">File to Tax Folder</div>

      {/* Filing type selector (only if multiple) */}
      {availableTypes.length > 1 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Filing Type</label>
          <div className="flex flex-wrap gap-1">
            {availableTypes.map((ft) => {
              const cfg = FILING_CONFIG[ft];
              return (
                <button
                  key={ft}
                  type="button"
                  onClick={() => onFilingSelect(ft)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    effectiveFiling === ft
                      ? cfg.color + ' ring-1 ring-current'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto-selected badge for single type */}
      {availableTypes.length === 1 && (
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${FILING_CONFIG[availableTypes[0]].color}`}>
            {FILING_CONFIG[availableTypes[0]].label}
          </span>
          {reportingMonth && (
            <span className="text-[10px] text-muted-foreground">{reportingMonth}</span>
          )}
        </div>
      )}

      {/* Description input (VAT types) */}
      {needsDescription && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={taxDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="e.g. KBank EDC fees"
            className="h-7 text-xs px-2 border rounded bg-background w-full focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {/* File selection */}
      {effectiveFiling && (
        <div className="space-y-1.5">
          {selectedFile ? (
            <div className="flex items-center gap-2 px-2 py-1.5 border rounded bg-muted/30 text-xs">
              <span className="truncate flex-1">{selectedFile.name}</span>
              <button
                type="button"
                onClick={onClearFile}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                &times;
              </button>
            </div>
          ) : (
            <div className="relative">
              <Button size="sm" variant="outline" className="w-full h-8 text-xs">
                <FolderUp className="mr-1 h-3 w-3" />
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={onFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <Check className="h-3 w-3 shrink-0" />
          Uploaded successfully
        </div>
      )}

      {selectedFile && !success && (
        <Button
          size="sm"
          className="w-full h-8 text-xs"
          disabled={!canUpload || uploading}
          onClick={onUpload}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <FolderUp className="mr-1 h-3 w-3" />
              Upload to {effectiveFiling?.toUpperCase()} Folder
            </>
          )}
        </Button>
      )}
    </div>
  );
}

/* ── Extraction Review Sub-panel ────────────────────────────────────────── */

function ExtractionReviewPanel({
  extraction,
  docUrl,
  previewUrl,
  previewType,
  lastModelUsed,
  onUpdateField,
  onApply,
  onDiscard,
}: {
  extraction: InvoiceExtraction;
  docUrl: string | null;
  previewUrl: string | null;
  previewType: 'pdf' | 'image' | null;
  lastModelUsed: string | null;
  onUpdateField: (field: keyof InvoiceExtraction, value: unknown) => void;
  onApply: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Review Extraction</div>
        <span className={`text-xs font-medium ${CONFIDENCE_COLORS[extraction.confidence]}`}>
          ● {extraction.confidence.charAt(0).toUpperCase() + extraction.confidence.slice(1)}
        </span>
      </div>

      {previewUrl && (
        <div className="border rounded-md overflow-hidden bg-muted/30">
          {previewType === 'pdf' ? (
            <iframe src={previewUrl} className="w-full h-[180px]" title="Document preview" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL, next/image incompatible
            <img src={previewUrl} alt="Document preview" className="w-full max-h-[180px] object-contain" />
          )}
        </div>
      )}
      {docUrl && (
        <a
          href={docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Open in Google Drive
        </a>
      )}

      <div className="border rounded-md divide-y text-xs">
        <Row label="Vendor">
          <input type="text" value={extraction.vendor_name || ''} onChange={e => onUpdateField('vendor_name', e.target.value || null)} className={inputCls} placeholder="Vendor name (original)" />
        </Row>
        <Row label="English">
          <input type="text" value={extraction.vendor_company_name_en || ''} onChange={e => onUpdateField('vendor_company_name_en', e.target.value || null)} className={inputCls} placeholder="English company name" />
        </Row>
        <Row label="Address">
          <input type="text" value={extraction.vendor_address || ''} onChange={e => onUpdateField('vendor_address', e.target.value || null)} className={inputCls} placeholder="Address" />
        </Row>
        <Row label="Tax ID">
          <input type="text" value={extraction.vendor_tax_id || ''} onChange={e => onUpdateField('vendor_tax_id', e.target.value || null)} className={`${inputCls} font-mono`} placeholder="Tax ID" />
        </Row>
        <Row label="Inv #">
          <input type="text" value={extraction.invoice_number || ''} onChange={e => onUpdateField('invoice_number', e.target.value || null)} className={inputCls} placeholder="Invoice number" />
        </Row>
        <Row label="Amount">
          <NumInput value={extraction.total_amount} onChange={v => onUpdateField('total_amount', v)} />
        </Row>
        <Row label="Tax Base">
          <NumInput value={extraction.tax_base} onChange={v => onUpdateField('tax_base', v)} />
        </Row>
        <Row label="VAT">
          <div className="flex gap-1">
            <NumInput value={extraction.vat_amount} onChange={v => onUpdateField('vat_amount', v)} />
            <select
              value={extraction.vat_type}
              onChange={e => onUpdateField('vat_type', e.target.value)}
              className="h-6 text-xs px-1 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {VAT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </Row>
        <Row label="WHT">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={extraction.wht_applicable} onChange={e => onUpdateField('wht_applicable', e.target.checked)} className="rounded" />
            <span>Applicable</span>
          </label>
        </Row>
        <Row label="Notes">
          <input type="text" value={extraction.notes || ''} onChange={e => onUpdateField('notes', e.target.value || null)} className={inputCls} placeholder="Notes" />
        </Row>
      </div>

      {lastModelUsed && (
        <div className="text-[10px] text-muted-foreground">
          Extracted with {lastModelUsed}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={onDiscard}>
          <X className="mr-1 h-3 w-3" />
          Discard
        </Button>
        <Button size="sm" className="h-7 text-xs flex-1" onClick={onApply}>
          <Check className="mr-1 h-3 w-3" />
          Apply
        </Button>
      </div>
    </div>
  );
}

/* ── Extraction Upload Sub-panel ────────────────────────────────────────── */

function ExtractionUploadPanel({
  model,
  onModelChange,
  uploading,
  error,
  previewUrl,
  previewType,
  onFileChange,
}: {
  model: string;
  onModelChange: (m: string) => void;
  uploading: boolean;
  error: string | null;
  previewUrl: string | null;
  previewType: 'pdf' | 'image' | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Extract from Document</div>
      <p className="text-xs text-muted-foreground">
        Upload a PDF or image. AI will extract vendor, amounts, and tax details.
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Model</label>
        <div className="grid grid-cols-2 gap-1">
          {MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onModelChange(m.id)}
              className={`text-left px-2 py-1.5 rounded border text-xs transition-colors ${
                model === m.id
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-transparent bg-muted/50 hover:bg-muted text-muted-foreground'
              }`}
            >
              <div className="font-medium flex items-center gap-1">
                {model === m.id && <Check className="h-3 w-3" />}
                {m.label}
              </div>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {MODELS.find((m) => m.id === model)?.description}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}

      {uploading && previewUrl && (
        <div className="border rounded-md overflow-hidden bg-muted/30">
          {previewType === 'pdf' ? (
            <iframe src={previewUrl} className="w-full h-[120px]" title="Document preview" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL
            <img src={previewUrl} alt="Document preview" className="w-full max-h-[120px] object-contain" />
          )}
        </div>
      )}

      <div className="relative">
        <Button size="sm" variant="outline" className="w-full h-8 text-xs" disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Extracting with {model}...
            </>
          ) : (
            <>
              <FileUp className="mr-1 h-3 w-3" />
              Choose File
            </>
          )}
        </Button>
        {!uploading && (
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={onFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        )}
      </div>
    </div>
  );
}

/* ── Helper components ───────────────────────────────── */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5">
      <span className="text-muted-foreground w-[60px] shrink-0 text-xs">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function NumInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(value != null ? String(value) : '');

  useEffect(() => {
    setText(value != null ? String(value) : '');
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);
    if (raw === '') {
      onChange(null);
    } else {
      const n = parseFloat(raw);
      if (!isNaN(n)) onChange(Math.round(n * 100) / 100);
    }
  }, [onChange]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      className={numInputCls}
      placeholder="—"
    />
  );
}
