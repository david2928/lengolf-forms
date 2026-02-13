'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ExternalLink, Search, Trash2, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Pencil, Save, X, RotateCw, Loader2,
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import type { Vendor, VendorReceiptWithVendor } from '@/types/vendor-receipts'

type ReceiptRow = VendorReceiptWithVendor

function formatAmount(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return <Badge variant="outline" className="text-xs">Pending</Badge>
  const colors: Record<string, string> = {
    high: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-red-100 text-red-800 border-red-200',
  }
  return (
    <Badge variant="outline" className={`text-xs ${colors[confidence] || ''}`}>
      {confidence}
    </Badge>
  )
}

function VatBadge({ vatType }: { vatType: string | null }) {
  if (!vatType || vatType === 'none') return <span className="text-muted-foreground text-xs">None</span>
  const colors: Record<string, string> = {
    pp30: 'bg-blue-100 text-blue-800 border-blue-200',
    pp36: 'bg-purple-100 text-purple-800 border-purple-200',
  }
  return (
    <Badge variant="outline" className={`text-xs ${colors[vatType] || ''}`}>
      {vatType.toUpperCase()}
    </Badge>
  )
}

// ── Detail Panel (expanded row) ─────────────────────────────────────────────

interface DetailPanelProps {
  receipt: ReceiptRow
  onSaved: () => void
  onReExtract: (id: string) => void
  isReExtracting: boolean
  colCount: number
}

function DetailPanel({ receipt, onSaved, onReExtract, isReExtracting, colCount }: DetailPanelProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    invoice_number: receipt.invoice_number || '',
    invoice_date: receipt.invoice_date || '',
    total_amount: receipt.total_amount != null ? String(receipt.total_amount) : '',
    tax_base: receipt.tax_base != null ? String(receipt.tax_base) : '',
    vat_amount: receipt.vat_amount != null ? String(receipt.vat_amount) : '',
    vat_type: receipt.vat_type || 'none',
    wht_applicable: receipt.wht_applicable,
    extraction_notes: receipt.extraction_notes || '',
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Record<string, any> = {
        id: receipt.id,
        invoice_number: form.invoice_number || null,
        invoice_date: form.invoice_date || null,
        total_amount: form.total_amount ? parseFloat(form.total_amount) : null,
        tax_base: form.tax_base ? parseFloat(form.tax_base) : null,
        vat_amount: form.vat_amount ? parseFloat(form.vat_amount) : null,
        vat_type: form.vat_type,
        wht_applicable: form.wht_applicable,
        extraction_notes: form.extraction_notes || null,
      }
      const res = await fetch('/api/admin/vendor-receipts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'Saved', description: 'Receipt updated' })
      setEditing(false)
      onSaved()
    } catch {
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({
      invoice_number: receipt.invoice_number || '',
      invoice_date: receipt.invoice_date || '',
      total_amount: receipt.total_amount != null ? String(receipt.total_amount) : '',
      tax_base: receipt.tax_base != null ? String(receipt.tax_base) : '',
      vat_amount: receipt.vat_amount != null ? String(receipt.vat_amount) : '',
      vat_type: receipt.vat_type || 'none',
      wht_applicable: receipt.wht_applicable,
      extraction_notes: receipt.extraction_notes || '',
    })
    setEditing(false)
  }

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={colCount} className="p-0">
        <div className="px-6 py-4 space-y-4">
          {/* Action buttons */}
          <div className="flex items-center gap-2 justify-end">
            {!editing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReExtract(receipt.id)}
                  disabled={isReExtracting || !receipt.file_id}
                >
                  {isReExtracting ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RotateCw className="h-3 w-3 mr-1" />
                  )}
                  Re-extract
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                  Save
                </Button>
              </>
            )}
          </div>

          {/* Three-column layout: Preview | Invoice | Extracted */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_1fr] md:grid-cols-[240px_1fr] gap-6">
            {/* File Preview */}
            {receipt.file_id ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Preview</h4>
                <div className="border rounded-md overflow-hidden bg-white" style={{ height: 360 }}>
                  <iframe
                    src={`https://drive.google.com/file/d/${receipt.file_id}/preview`}
                    className="w-full h-full"
                    allow="autoplay"
                    title="Receipt preview"
                  />
                </div>
                <a
                  href={receipt.file_url || `https://drive.google.com/file/d/${receipt.file_id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in Google Drive
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Preview</h4>
                <div className="border rounded-md flex items-center justify-center text-muted-foreground text-sm bg-muted/20" style={{ height: 360 }}>
                  No file available
                </div>
              </div>
            )}

            {/* Invoice / Financial */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Invoice Details</h4>

              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Invoice #</Label>
                      <Input
                        value={form.invoice_number}
                        onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
                        placeholder="INV-001"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Invoice Date</Label>
                      <Input
                        type="date"
                        value={form.invoice_date}
                        onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Total Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.total_amount}
                        onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tax Base</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.tax_base}
                        onChange={(e) => setForm((f) => ({ ...f, tax_base: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">VAT Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.vat_amount}
                        onChange={(e) => setForm((f) => ({ ...f, vat_amount: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">VAT Type</Label>
                      <Select value={form.vat_type} onValueChange={(v) => setForm((f) => ({ ...f, vat_type: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="pp30">PP30</SelectItem>
                          <SelectItem value="pp36">PP36</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pb-1">
                      <Switch
                        checked={form.wht_applicable}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, wht_applicable: v }))}
                      />
                      <Label className="text-xs">WHT Applicable</Label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <Input
                      value={form.extraction_notes}
                      onChange={(e) => setForm((f) => ({ ...f, extraction_notes: e.target.value }))}
                      placeholder="Category / notes"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                    <span className="text-muted-foreground">Invoice #:</span>
                    <span className="font-medium">{receipt.invoice_number || '—'}</span>
                    <span className="text-muted-foreground">Invoice Date:</span>
                    <span>{formatDate(receipt.invoice_date)}</span>
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-medium">{formatAmount(receipt.total_amount)}</span>
                    <span className="text-muted-foreground">Tax Base:</span>
                    <span>{formatAmount(receipt.tax_base)}</span>
                    <span className="text-muted-foreground">VAT:</span>
                    <span className="flex items-center gap-1.5">
                      <VatBadge vatType={receipt.vat_type} />
                      {receipt.vat_amount != null && <span>{formatAmount(receipt.vat_amount)}</span>}
                    </span>
                    <span className="text-muted-foreground">WHT:</span>
                    <span>{receipt.wht_applicable ? 'Yes' : 'No'}</span>
                  </div>
                  {receipt.extraction_notes && (
                    <div className="pt-1">
                      <span className="text-muted-foreground">Notes: </span>
                      <span>{receipt.extraction_notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Extracted Vendor Info + Metadata */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Extracted Info</h4>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Vendor Name:</span>
                  <span>{receipt.extracted_vendor_name || '—'}</span>
                  <span className="text-muted-foreground">Company (EN):</span>
                  <span>{receipt.extracted_company_name_en || '—'}</span>
                  <span className="text-muted-foreground">Tax ID:</span>
                  <span className="font-mono text-xs">{receipt.extracted_tax_id || '—'}</span>
                  <span className="text-muted-foreground">Address:</span>
                  <span className="text-xs leading-relaxed">{receipt.extracted_address || '—'}</span>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Extraction</h4>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Confidence:</span>
                  <span className="flex items-center gap-1.5">
                    <span className="relative group/tip cursor-default">
                      <ConfidenceBadge confidence={receipt.extraction_confidence} />
                      {receipt.confidence_explanation && (
                        <span className="absolute bottom-full left-0 mb-1 hidden group-hover/tip:block z-10 w-64 rounded-md bg-popover border px-3 py-2 text-xs text-popover-foreground shadow-md">
                          {receipt.confidence_explanation}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="text-muted-foreground">Model:</span>
                  <span className="text-xs font-mono">{receipt.extraction_model || '—'}</span>
                  <span className="text-muted-foreground">Extracted At:</span>
                  <span className="text-xs">
                    {receipt.extracted_at
                      ? new Date(receipt.extracted_at).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

const COL_COUNT = 11

export function ReceiptsTab() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reExtractingId, setReExtractingId] = useState<string | null>(null)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [offset, setOffset] = useState(0)
  const pageSize = 25

  const fetchVendors = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/vendors')
      if (response.ok) {
        const data = await response.json()
        setVendors(data)
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }, [])

  const fetchReceipts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('start_date', startDate)
      if (endDate) params.set('end_date', endDate)
      if (vendorFilter) params.set('vendor_id', vendorFilter)
      if (searchText) params.set('search', searchText)
      params.set('limit', pageSize.toString())
      params.set('offset', offset.toString())

      const response = await fetch(`/api/admin/vendor-receipts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReceipts(data.data)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Error fetching receipts:', error)
      toast({ title: 'Error', description: 'Failed to load receipts', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate, vendorFilter, searchText, offset])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  useEffect(() => {
    fetchReceipts()
  }, [fetchReceipts])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this receipt record? The Google Drive file will be kept.')) return

    try {
      const response = await fetch(`/api/admin/vendor-receipts?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: 'Success', description: 'Receipt deleted' })
        setExpandedId(null)
        fetchReceipts()
      } else {
        toast({ title: 'Error', description: 'Failed to delete receipt', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error deleting receipt:', error)
      toast({ title: 'Error', description: 'Failed to delete receipt', variant: 'destructive' })
    }
  }

  const handleReExtract = async (id: string) => {
    setReExtractingId(id)
    try {
      const res = await fetch(`/api/vendor-receipts/${id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Extraction failed')
      toast({ title: 'Success', description: 'Re-extraction complete' })
      fetchReceipts()
    } catch {
      toast({ title: 'Error', description: 'Re-extraction failed', variant: 'destructive' })
    } finally {
      setReExtractingId(null)
    }
  }

  const handleFilterReset = () => {
    setStartDate('')
    setEndDate('')
    setVendorFilter('')
    setSearchText('')
    setOffset(0)
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const totalPages = Math.ceil(total / pageSize)
  const currentPage = Math.floor(offset / pageSize) + 1

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setOffset(0) }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setOffset(0) }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Vendor</Label>
          <Select
            value={vendorFilter}
            onValueChange={(v) => { setVendorFilter(v === 'all' ? '' : v); setOffset(0) }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vendors</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Search</Label>
          <div className="flex items-center gap-1">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="File, notes, staff..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setOffset(0) }}
            />
          </div>
        </div>
        <Button variant="outline" onClick={handleFilterReset} className="h-9">
          Reset
        </Button>
      </div>

      {/* Results */}
      <div className="text-sm text-muted-foreground">
        {total} receipt{total !== 1 ? 's' : ''} found
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 px-2" />
              <TableHead className="px-3">Date</TableHead>
              <TableHead className="px-3">Vendor</TableHead>
              <TableHead className="px-3">Invoice #</TableHead>
              <TableHead className="px-3 text-right">Amount</TableHead>
              <TableHead className="px-3 text-right">VAT</TableHead>
              <TableHead className="px-3">Type</TableHead>
              <TableHead className="px-3">Status</TableHead>
              <TableHead className="px-3">Uploaded</TableHead>
              <TableHead className="px-3 w-10 text-center">File</TableHead>
              <TableHead className="px-3 w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={COL_COUNT} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : receipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COL_COUNT} className="text-center py-8 text-muted-foreground">
                  No receipts found
                </TableCell>
              </TableRow>
            ) : (
              receipts.map((receipt) => {
                const isExpanded = expandedId === receipt.id
                return (
                  <Fragment key={receipt.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpand(receipt.id)}
                    >
                      <TableCell className="px-2 text-center">
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground inline" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground inline" />}
                      </TableCell>
                      <TableCell className="px-3 whitespace-nowrap text-sm">
                        {formatDate(receipt.receipt_date)}
                      </TableCell>
                      <TableCell className="px-3 font-medium text-sm">
                        {receipt.vendor_name}
                      </TableCell>
                      <TableCell className="px-3 text-sm font-mono text-xs">
                        {receipt.invoice_number || '—'}
                      </TableCell>
                      <TableCell className="px-3 text-sm text-right tabular-nums">
                        {formatAmount(receipt.total_amount)}
                      </TableCell>
                      <TableCell className="px-3 text-sm text-right tabular-nums">
                        {formatAmount(receipt.vat_amount)}
                      </TableCell>
                      <TableCell className="px-3">
                        <VatBadge vatType={receipt.vat_type} />
                      </TableCell>
                      <TableCell className="px-3">
                        <ConfidenceBadge confidence={receipt.extraction_confidence} />
                      </TableCell>
                      <TableCell className="px-3 whitespace-nowrap text-xs text-muted-foreground">
                        {receipt.created_at
                          ? new Date(receipt.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="px-3 text-center">
                        {receipt.file_url ? (
                          <a
                            href={receipt.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                            title={receipt.file_name || 'View file'}
                          >
                            <ExternalLink className="h-4 w-4 inline" />
                          </a>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="px-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDelete(receipt.id) }}
                          className="h-7 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <DetailPanel
                        receipt={receipt}
                        onSaved={fetchReceipts}
                        onReExtract={handleReExtract}
                        isReExtracting={reExtractingId === receipt.id}
                        colCount={COL_COUNT}
                      />
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
              disabled={offset === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + pageSize)}
              disabled={offset + pageSize >= total}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
