'use client';

import { useState, useCallback, useRef } from 'react';
import { FileUp, Loader2, AlertCircle, Check, X, ExternalLink } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import type { InvoiceExtraction, VatType } from '@/types/expense-tracker';

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

interface InvoiceUploadButtonProps {
  onExtracted: (extraction: InvoiceExtraction, documentUrl: string | null) => void;
  paymentDate?: string;
  vendorName?: string;
}

export function InvoiceUploadButton({ onExtracted, paymentDate, vendorName }: InvoiceUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<string>('gpt-5.2');
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);
  const [pendingExtraction, setPendingExtraction] = useState<InvoiceExtraction | null>(null);
  const [pendingDocUrl, setPendingDocUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'pdf' | 'image' | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const cleanupPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewType(null);
  }, []);

  const updateField = useCallback((field: keyof InvoiceExtraction, value: unknown) => {
    setPendingExtraction(prev => prev ? { ...prev, [field]: value } : prev);
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      setError(null);
      setLastModelUsed(null);
      setPendingExtraction(null);
      setPendingDocUrl(null);
      cleanupPreview();

      // Create local preview
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
      setPendingExtraction(null);
      setPendingDocUrl(null);
      cleanupPreview();
      setOpen(false);
    }
  }, [pendingExtraction, pendingDocUrl, onExtracted, cleanupPreview]);

  const handleDiscard = useCallback(() => {
    setPendingExtraction(null);
    setPendingDocUrl(null);
    setLastModelUsed(null);
    cleanupPreview();
  }, [cleanupPreview]);

  const hasReview = pendingExtraction != null;

  return (
    <Popover open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) cleanupPreview();
    }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          title="Upload document for auto-extraction"
        >
          <FileUp className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className={hasReview ? 'w-[420px]' : 'w-[280px]'} align="start">
        {hasReview ? (
          /* ── Review Panel ─────────────────────────────────── */
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Review Extraction</div>
              <span className={`text-xs font-medium ${CONFIDENCE_COLORS[pendingExtraction.confidence]}`}>
                ● {pendingExtraction.confidence.charAt(0).toUpperCase() + pendingExtraction.confidence.slice(1)}
              </span>
            </div>

            {/* Document preview */}
            {previewUrl && (
              <div className="border rounded-md overflow-hidden bg-muted/30">
                {previewType === 'pdf' ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[180px]"
                    title="Document preview"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- blob URL, next/image incompatible
                  <img
                    src={previewUrl}
                    alt="Document preview"
                    className="w-full max-h-[180px] object-contain"
                  />
                )}
              </div>
            )}
            {pendingDocUrl && (
              <a
                href={pendingDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Open in Google Drive
              </a>
            )}

            {/* Editable fields */}
            <div className="border rounded-md divide-y text-xs">
              <Row label="Vendor">
                <input
                  type="text"
                  value={pendingExtraction.vendor_name || ''}
                  onChange={e => updateField('vendor_name', e.target.value || null)}
                  className={inputCls}
                  placeholder="Vendor name (original)"
                />
              </Row>
              <Row label="English">
                <input
                  type="text"
                  value={pendingExtraction.vendor_company_name_en || ''}
                  onChange={e => updateField('vendor_company_name_en', e.target.value || null)}
                  className={inputCls}
                  placeholder="English company name"
                />
              </Row>
              <Row label="Address">
                <input
                  type="text"
                  value={pendingExtraction.vendor_address || ''}
                  onChange={e => updateField('vendor_address', e.target.value || null)}
                  className={inputCls}
                  placeholder="Address"
                />
              </Row>
              <Row label="Tax ID">
                <input
                  type="text"
                  value={pendingExtraction.vendor_tax_id || ''}
                  onChange={e => updateField('vendor_tax_id', e.target.value || null)}
                  className={`${inputCls} font-mono`}
                  placeholder="Tax ID"
                />
              </Row>
              <Row label="Inv #">
                <input
                  type="text"
                  value={pendingExtraction.invoice_number || ''}
                  onChange={e => updateField('invoice_number', e.target.value || null)}
                  className={inputCls}
                  placeholder="Invoice number"
                />
              </Row>
              <Row label="Amount">
                <NumInput
                  value={pendingExtraction.total_amount}
                  onChange={v => updateField('total_amount', v)}
                />
              </Row>
              <Row label="Tax Base">
                <NumInput
                  value={pendingExtraction.tax_base}
                  onChange={v => updateField('tax_base', v)}
                />
              </Row>
              <Row label="VAT">
                <div className="flex gap-1">
                  <NumInput
                    value={pendingExtraction.vat_amount}
                    onChange={v => updateField('vat_amount', v)}
                  />
                  <select
                    value={pendingExtraction.vat_type}
                    onChange={e => updateField('vat_type', e.target.value)}
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
                  <input
                    type="checkbox"
                    checked={pendingExtraction.wht_applicable}
                    onChange={e => updateField('wht_applicable', e.target.checked)}
                    className="rounded"
                  />
                  <span>Applicable</span>
                </label>
              </Row>
              <Row label="Notes">
                <input
                  type="text"
                  value={pendingExtraction.notes || ''}
                  onChange={e => updateField('notes', e.target.value || null)}
                  className={inputCls}
                  placeholder="Notes"
                />
              </Row>
            </div>

            {lastModelUsed && (
              <div className="text-[10px] text-muted-foreground">
                Extracted with {lastModelUsed}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs flex-1"
                onClick={handleDiscard}
              >
                <X className="mr-1 h-3 w-3" />
                Discard
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={handleApply}
              >
                <Check className="mr-1 h-3 w-3" />
                Apply
              </Button>
            </div>
          </div>
        ) : (
          /* ── Upload Panel ─────────────────────────────────── */
          <div className="space-y-3">
            <div className="text-sm font-medium">Extract from Document</div>
            <p className="text-xs text-muted-foreground">
              Upload a PDF or image. AI will extract vendor, amounts, and tax details.
            </p>

            {/* Model selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Model</label>
              <div className="grid grid-cols-2 gap-1">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModel(m.id)}
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

            {/* Show preview while uploading */}
            {uploading && previewUrl && (
              <div className="border rounded-md overflow-hidden bg-muted/30">
                {previewType === 'pdf' ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[120px]"
                    title="Document preview"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- blob URL
                  <img
                    src={previewUrl}
                    alt="Document preview"
                    className="w-full max-h-[120px] object-contain"
                  />
                )}
              </div>
            )}

            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs"
                disabled={uploading}
              >
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
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
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
