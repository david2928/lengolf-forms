'use client'

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { PenSquare } from "lucide-react"

interface EmployeeSelectorProps {
  value: string | null
  onChange: (value: string) => void
  error?: string
}

export function EmployeeSelector({ 
  value, 
  onChange,
  error 
}: EmployeeSelectorProps) {
  const [otherName, setOtherName] = useState('')

  const employees = [
    { value: 'Eak', label: 'Eak' },
    { value: 'Dolly', label: 'Dolly' },
    { value: 'Net', label: 'Net' },
    { value: 'May', label: 'May' },
    { value: 'Winnie', label: 'Winnie' }
  ]

  return (
    <div className="space-y-3">
      <Label className="text-base">You Are?</Label>
      <RadioGroup value={value || ''} onValueChange={onChange}>
        <div className="grid gap-3">
          {employees.map((employee) => (
            <label
              key={employee.value}
              className="cursor-pointer"
              htmlFor={`employee-${employee.value.toLowerCase()}`}
            >
              <div className="flex items-center rounded-lg border p-3 hover:bg-accent">
                <RadioGroupItem
                  value={employee.value}
                  id={`employee-${employee.value.toLowerCase()}`}
                  className="mr-3"
                />
                <span className="block">
                  {employee.label}
                </span>
              </div>
            </label>
          ))}
          
          {/* Other Option */}
          <div className="flex items-center rounded-lg border p-3">
            <RadioGroupItem 
              value="other" 
              id="employee-other"
              className="mr-3"
              checked={value === otherName}
            />
            <PenSquare className="h-5 w-5 text-muted-foreground mr-3" />
            <Input
              placeholder="Other..."
              value={otherName}
              onChange={(e) => {
                setOtherName(e.target.value)
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