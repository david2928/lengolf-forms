'use client'

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Package, Users, Gamepad2, Calendar, PenSquare } from "lucide-react"

interface BookingTypeSelectorProps {
  value: string | null
  onChange: (value: string) => void
  error?: string
}

export function BookingTypeSelector({
  value,
  onChange,
  error
}: BookingTypeSelectorProps) {
  const [otherType, setOtherType] = useState('')

  const bookingTypes = [
    { value: 'Package', label: 'Package', icon: Package },
    { value: 'Coaching (Boss)', label: 'Coaching (Boss)', icon: Users },
    { value: 'Coaching (Boss - Ratchavin)', label: 'Coaching (Boss - Ratchavin)', icon: Users },
    { value: 'Normal Bay Rate', label: 'Normal Bay Rate', icon: Calendar },
    { value: 'ClassPass', label: 'ClassPass', icon: Calendar },
    { value: 'VR', label: 'VR', icon: Gamepad2 },
    { value: 'Others (e.g. Events)', label: 'Others (e.g. Events)', icon: PenSquare },
  ]

  return (
    <div className="space-y-3">
      <Label className="text-base">Type of Booking</Label>
      <RadioGroup value={value || ''} onValueChange={onChange}>
        <div className="grid gap-3">
          {bookingTypes.map((type) => {
            const Icon = type.icon
            return (
              <label
                key={type.value}
                className="cursor-pointer"
                htmlFor={`booking-${type.value.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center rounded-lg border p-3 hover:bg-accent">
                  <RadioGroupItem
                    value={type.value}
                    id={`booking-${type.value.toLowerCase().replace(/\s+/g, '-')}`}
                    className="mr-3"
                  />
                  <div className="flex items-center flex-grow gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span className="block">
                      {type.label}
                    </span>
                  </div>
                </div>
              </label>
            )
          })}
          
          {/* Other Option */}
          <div className="flex items-center rounded-lg border p-3">
            <RadioGroupItem 
              value="other" 
              id="booking-other"
              className="mr-3"
              checked={value === otherType}
            />
            <PenSquare className="h-5 w-5 text-muted-foreground mr-3" />
            <Input
              placeholder="Other booking type..."
              value={otherType}
              onChange={(e) => {
                setOtherType(e.target.value)
                if (e.target.value) {
                  onChange(e.target.value)
                }
              }}
              className="flex-grow border-0 focus-visible:ring-0 p-0"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </RadioGroup>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}