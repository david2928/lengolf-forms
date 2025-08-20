'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface SimpleBookingTypeSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function SimpleBookingTypeSelector({
  value,
  onChange,
  disabled = false
}: SimpleBookingTypeSelectorProps) {
  const bookingTypes = [
    'Package',
    'Coaching (Boss)',
    'Coaching (Boss - Ratchavin)',
    'Coaching (Noon)',
    'Normal Bay Rate',
    'ClassPass',
    'Others (e.g. Events)'
  ]

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select booking type" />
        </SelectTrigger>
        <SelectContent>
          {bookingTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}