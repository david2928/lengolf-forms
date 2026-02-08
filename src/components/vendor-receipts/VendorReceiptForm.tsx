'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react'
import { VendorCombobox } from './VendorCombobox'
import { ReceiptFileUpload } from './ReceiptFileUpload'
import type { VendorReceiptWithVendor } from '@/types/vendor-receipts'
import { STAFF_OPTIONS } from '@/types/inventory'

interface VendorReceiptFormProps {
  onSubmitted?: (receipt: VendorReceiptWithVendor) => void
}

export function VendorReceiptForm({ onSubmitted }: VendorReceiptFormProps) {
  const [staffName, setStaffName] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [receiptDate, setReceiptDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleVendorChange = useCallback((id: string, name: string) => {
    setVendorId(id)
    setVendorName(name)
  }, [])

  const resetForm = useCallback(() => {
    setStaffName('')
    setVendorId('')
    setVendorName('')
    setReceiptDate(new Date().toISOString().split('T')[0])
    setFile(null)
    setFileError('')
    setNotes('')
    setSubmitStatus('idle')
    setErrorMessage('')
  }, [])

  const handleSubmit = async () => {
    if (!staffName) {
      setErrorMessage('Please select your name')
      setSubmitStatus('error')
      return
    }
    if (!vendorId) {
      setErrorMessage('Please select a vendor')
      setSubmitStatus('error')
      return
    }
    if (!file) {
      setErrorMessage('Please upload a receipt file')
      setSubmitStatus('error')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      // Fast upload: Google Drive + DB insert only (~2-3s)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('vendor_id', vendorId)
      if (receiptDate) formData.append('receipt_date', receiptDate)
      if (notes.trim()) formData.append('notes', notes.trim())

      const response = await fetch('/api/vendor-receipts', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Success - show immediately
      setSubmitStatus('success')
      onSubmitted?.({
        ...data,
        vendor_name: vendorName,
        vendor_category: null,
      })

      // Fire-and-forget: trigger background LLM extraction
      fetch(`/api/vendor-receipts/${data.id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_name: staffName }),
      }).catch((err) => {
        // Background extraction failure is non-critical
        console.warn('[VendorReceiptForm] Background extraction failed:', err)
      })

      // Reset form after showing success
      setTimeout(() => {
        resetForm()
      }, 8000)
    } catch (error) {
      console.error('Upload error:', error)
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to upload receipt'
      )
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Vendor Receipt</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Staff Name *</Label>
            <Select value={staffName} onValueChange={setStaffName}>
              <SelectTrigger>
                <SelectValue placeholder="Select your name" />
              </SelectTrigger>
              <SelectContent>
                {STAFF_OPTIONS.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vendor *</Label>
            <VendorCombobox value={vendorId} onChange={handleVendorChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-date">Receipt Date</Label>
            <Input
              id="receipt-date"
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Receipt File *</Label>
            <ReceiptFileUpload
              file={file}
              onFileChange={setFile}
              error={fileError}
              onError={setFileError}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="e.g. Monthly grocery supply"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {submitStatus === 'success' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Receipt uploaded successfully!
              </AlertDescription>
            </Alert>
          )}

          {submitStatus === 'error' && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            className="w-full"
            disabled={isSubmitting || !staffName || !vendorId || !file}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Receipt
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
