'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CancelRentalModalProps {
  isOpen: boolean
  onClose: () => void
  rental: {
    id: string
    rental_code: string
    customer_name: string
    start_date: string
    end_date: string
    rental_club_sets: { name: string } | null
  } | null
  onSuccess: (rentalId: string, employeeName: string, reason: string) => void
}

const EMPLOYEES_LIST = [
  { value: 'Dolly', label: 'Dolly' },
  { value: 'Net', label: 'Net' },
  { value: 'May', label: 'May' },
  { value: 'Ashley', label: 'Ashley' },
  { value: 'David', label: 'David' },
]

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function CancelRentalModal({ isOpen, onClose, rental, onSuccess }: CancelRentalModalProps) {
  const [cancellationReason, setCancellationReason] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCancellationReason('')
      setEmployeeName('')
      setError(null)
    }
  }, [isOpen, rental])

  if (!rental) return null

  const handleSubmit = async () => {
    if (!employeeName.trim()) {
      setError('Employee name is required.')
      return
    }
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/club-rentals/${rental.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancelled_by: employeeName.trim(),
          cancellation_reason: cancellationReason.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel rental')
      }

      onSuccess(rental.id, employeeName.trim(), cancellationReason.trim())
      onClose()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'An unexpected error occurred.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancel Club Rental</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this rental? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right col-span-1">Code</Label>
            <Input value={rental.rental_code} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right col-span-1">Customer</Label>
            <Input value={rental.customer_name} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right col-span-1">Dates</Label>
            <Input value={`${formatDate(rental.start_date)} - ${formatDate(rental.end_date)}`} readOnly className="col-span-3" />
          </div>
          {rental.rental_club_sets && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right col-span-1">Club Set</Label>
              <Input value={rental.rental_club_sets.name} readOnly className="col-span-3" />
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right col-span-1">Reason</Label>
            <Textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="col-span-3"
              placeholder="Reason for cancellation (optional)"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right col-span-1">Employee</Label>
            <div className="col-span-3">
              <Select value={employeeName} onValueChange={setEmployeeName}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your name (mandatory)" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEES_LIST.map((employee) => (
                    <SelectItem key={employee.value} value={employee.value}>
                      {employee.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-red-500 col-span-4 text-center">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Back</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !employeeName.trim()}
          >
            {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
