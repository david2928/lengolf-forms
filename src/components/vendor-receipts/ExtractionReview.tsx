'use client'

import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { VendorCombobox } from './VendorCombobox'
import type { InvoiceExtraction } from '@/types/expense-tracker'

interface ExtractionReviewProps {
  extraction: InvoiceExtraction
  vendorId: string
  vendorName: string | null
  onVendorChange: (id: string, name: string) => void
}

function formatCurrency(n: number | null): string {
  if (n == null) return '-'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function confidenceColor(c: string): string {
  switch (c) {
    case 'high': return 'bg-green-100 text-green-700 border-green-300'
    case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    case 'low': return 'bg-red-100 text-red-700 border-red-300'
    default: return 'bg-gray-100 text-gray-700 border-gray-300'
  }
}

export function ExtractionReview({ extraction, vendorId, vendorName, onVendorChange }: ExtractionReviewProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Extracted Data</h3>
        <Badge variant="outline" className={confidenceColor(extraction.confidence)}>
          {extraction.confidence} confidence
        </Badge>
      </div>

      {/* Vendor */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          Vendor {extraction.vendor_name ? `(detected: ${extraction.vendor_name})` : ''}
        </Label>
        <VendorCombobox value={vendorId} onChange={onVendorChange} />
        {vendorName && vendorId && (
          <p className="text-xs text-muted-foreground">Selected: {vendorName}</p>
        )}
      </div>

      {/* Key fields in a grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {extraction.invoice_number && (
          <div>
            <span className="text-xs text-muted-foreground">Invoice #</span>
            <p className="font-medium">{extraction.invoice_number}</p>
          </div>
        )}
        {extraction.invoice_date && (
          <div>
            <span className="text-xs text-muted-foreground">Invoice Date</span>
            <p className="font-medium">{extraction.invoice_date}</p>
          </div>
        )}
        <div>
          <span className="text-xs text-muted-foreground">Total Amount</span>
          <p className="font-medium">{formatCurrency(extraction.total_amount)} THB</p>
        </div>
        {extraction.tax_base != null && (
          <div>
            <span className="text-xs text-muted-foreground">Tax Base</span>
            <p className="font-medium">{formatCurrency(extraction.tax_base)} THB</p>
          </div>
        )}
        {extraction.vat_amount != null && extraction.vat_type !== 'none' && (
          <div>
            <span className="text-xs text-muted-foreground">VAT ({extraction.vat_type.toUpperCase()})</span>
            <p className="font-medium">{formatCurrency(extraction.vat_amount)} THB</p>
          </div>
        )}
        {extraction.wht_applicable && (
          <div>
            <span className="text-xs text-muted-foreground">WHT</span>
            <p className="font-medium text-orange-600">Applicable</p>
          </div>
        )}
      </div>

      {extraction.notes && (
        <div className="text-xs text-muted-foreground">
          Category: <span className="font-medium text-foreground">{extraction.notes}</span>
        </div>
      )}
    </div>
  )
}
