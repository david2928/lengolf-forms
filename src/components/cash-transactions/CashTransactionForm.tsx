'use client'

import { useState, useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react'
import { SpendingTypeCombobox } from './SpendingTypeCombobox'
import { ReceiptFileUpload } from '@/components/vendor-receipts/ReceiptFileUpload'
import { CASH_STAFF_OPTIONS } from '@/types/cash-transactions'

export function CashTransactionForm() {
  const [staffName, setStaffName] = useState('')
  const [spendingType, setSpendingType] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const resetForm = useCallback(() => {
    setStaffName('')
    setSpendingType('')
    setAmount('')
    setTransactionDate(new Date().toISOString().split('T')[0])
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
    if (!spendingType) {
      setErrorMessage('Please select a spending type')
      setSubmitStatus('error')
      return
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setErrorMessage('Please enter a valid amount')
      setSubmitStatus('error')
      return
    }
    if (!file) {
      setErrorMessage('Please upload a receipt photo')
      setSubmitStatus('error')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('staff_name', staffName)
      formData.append('spending_type', spendingType)
      formData.append('amount', amount)
      if (transactionDate) formData.append('transaction_date', transactionDate)
      if (notes.trim()) formData.append('notes', notes.trim())

      const response = await fetch('/api/cash-transactions', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setSubmitStatus('success')

      setTimeout(() => {
        resetForm()
      }, 8000)
    } catch (error) {
      console.error('Upload error:', error)
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to submit transaction'
      )
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Cash Transaction Tracker</h1>

      <div className="space-y-2">
        <Label>Staff Name *</Label>
        <Select value={staffName} onValueChange={setStaffName}>
          <SelectTrigger>
            <SelectValue placeholder="Select your name" />
          </SelectTrigger>
          <SelectContent>
            {CASH_STAFF_OPTIONS.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Spending Type *</Label>
        <SpendingTypeCombobox value={spendingType} onChange={setSpendingType} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (THB) *</Label>
        <Input
          id="amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          placeholder="e.g. 200"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transaction-date">Transaction Date</Label>
        <Input
          id="transaction-date"
          type="date"
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Receipt Photo *</Label>
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
          placeholder="e.g. 4 bags of ice"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {submitStatus === 'success' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Transaction recorded successfully!
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
        disabled={isSubmitting || submitStatus === 'success' || !staffName || !spendingType || !amount || !file}
        onClick={handleSubmit}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Submit Transaction
          </>
        )}
      </Button>
    </div>
  )
}
