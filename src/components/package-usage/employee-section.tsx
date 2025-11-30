'use client'

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface EmployeeSectionProps {
  value: string | null
  onChange: (value: string) => void
}

export function EmployeeSection({ value, onChange }: EmployeeSectionProps) {
  return (
    <div className="space-y-2">
      <Label>Employee Name</Label>
      <RadioGroup
        value={value || undefined}
        onValueChange={onChange}
        className="grid grid-cols-2 gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="Dolly" id="dolly" />
          <Label htmlFor="dolly">Dolly</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="May" id="may" />
          <Label htmlFor="may">May</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="Net" id="net" />
          <Label htmlFor="net">Net</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="Ashley" id="ashley" />
          <Label htmlFor="ashley">Ashley</Label>
        </div>
      </RadioGroup>
    </div>
  )
}