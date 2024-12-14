'use client'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const EMPLOYEES = ['Dolly', 'May', 'Net', 'Winnie']

interface EmployeeSectionProps {
  value: string | null
  onChange: (value: string) => void
}

export function EmployeeSection({ value, onChange }: EmployeeSectionProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        Employee Name
      </Label>
      <RadioGroup
        onValueChange={onChange}
        className="grid grid-cols-2 gap-4"
        value={value || undefined}
      >
        {EMPLOYEES.map((employee) => (
          <div key={employee} className="flex items-center space-x-2">
            <RadioGroupItem value={employee} id={employee} />
            <Label htmlFor={employee} className="font-normal">
              {employee}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}