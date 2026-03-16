'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface StaffConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  action: 'checked_out' | 'returned'
  rental: {
    id: string
    rental_code: string
    customer_name: string
  } | null
  onConfirm: (rentalId: string, staffName: string) => void
}

const EMPLOYEES_LIST = [
  { value: 'Dolly', label: 'Dolly' },
  { value: 'Net', label: 'Net' },
  { value: 'May', label: 'May' },
  { value: 'Ashley', label: 'Ashley' },
  { value: 'David', label: 'David' },
]

const ACTION_CONFIG = {
  checked_out: {
    title: 'Check Out Club Set',
    description: 'Confirm who is handing out the club set to the customer.',
    buttonLabel: 'Confirm Check Out',
    buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white',
  },
  returned: {
    title: 'Return Club Set',
    description: 'Confirm who is receiving the club set back from the customer.',
    buttonLabel: 'Confirm Return',
    buttonClass: 'bg-green-600 hover:bg-green-700 text-white',
  },
}

export function StaffConfirmModal({ isOpen, onClose, action, rental, onConfirm }: StaffConfirmModalProps) {
  const [staffName, setStaffName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStaffName('')
    }
  }, [isOpen])

  if (!rental) return null

  const config = ACTION_CONFIG[action]

  const handleSubmit = async () => {
    if (!staffName) return
    setIsSubmitting(true)
    try {
      await onConfirm(rental.id, staffName)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{rental.rental_code}</span> &mdash; {rental.customer_name}
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right col-span-1">Staff</Label>
            <div className="col-span-3">
              <Select value={staffName} onValueChange={setStaffName}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your name" />
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
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button
            className={config.buttonClass}
            onClick={handleSubmit}
            disabled={isSubmitting || !staffName}
          >
            {isSubmitting ? 'Processing...' : config.buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
