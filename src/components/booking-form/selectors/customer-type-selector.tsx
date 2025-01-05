'use client'

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { UserPlus, Users } from "lucide-react"

interface CustomerTypeSelectorProps {
  value: boolean
  onChange: (value: boolean) => void
  error?: string
}

export function CustomerTypeSelector({
  value,
  onChange,
  error
}: CustomerTypeSelectorProps) {
  const customerTypes = [
    { value: true, label: 'New Customer', icon: UserPlus },
    { value: false, label: 'Existing Customer', icon: Users },
  ]

  return (
    <div className="space-y-3">
      <Label className="text-base">Customer Type</Label>
      <RadioGroup 
        value={value.toString()} 
        onValueChange={(val) => onChange(val === 'true')}
      >
        <div className="grid gap-3">
          {customerTypes.map((type) => {
            const Icon = type.icon
            return (
              <label
                key={type.label}
                className="cursor-pointer"
                htmlFor={`customer-type-${type.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center rounded-lg border p-3 hover:bg-accent">
                  <RadioGroupItem
                    value={type.value.toString()}
                    id={`customer-type-${type.label.toLowerCase().replace(/\s+/g, '-')}`}
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
        </div>
      </RadioGroup>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}