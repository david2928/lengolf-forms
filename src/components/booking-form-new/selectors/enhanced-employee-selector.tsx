'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { User, PenSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface EnhancedEmployeeSelectorProps {
  value: string | null
  onChange: (value: string) => void
  error?: string
}

export function EnhancedEmployeeSelector({
  value,
  onChange,
  error
}: EnhancedEmployeeSelectorProps) {
  const [otherName, setOtherName] = useState('')

  const employees = [
    { value: 'Eak', label: 'Eak', gradient: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    { value: 'Dolly', label: 'Dolly', gradient: 'from-pink-500 to-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' },
    { value: 'Net', label: 'Net', gradient: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { value: 'May', label: 'May', gradient: 'from-green-500 to-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' }
  ]

  const handleEmployeeSelect = (employeeValue: string) => {
    setOtherName('') // Clear other name when selecting predefined employee
    onChange(employeeValue)
  }

  const handleOtherNameChange = (newName: string) => {
    setOtherName(newName)
    if (newName.trim()) {
      onChange(newName.trim())
    } else {
      onChange('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {employees.map((employee) => {
          const isSelected = value === employee.value
          const isManualEntryActive = value && !employees.some(emp => emp.value === value)
          const isUnselected = isManualEntryActive

          return (
            <Card
              key={employee.value}
              className={cn(
                "cursor-pointer transition-all duration-200 border-2 transform",
                isSelected
                  ? `bg-gradient-to-br ${employee.gradient} text-white scale-102 shadow-lg ring-2 ring-white ring-opacity-60`
                  : isUnselected
                    ? "opacity-40 grayscale-20 scale-95"
                    : `${employee.bgColor} ${employee.borderColor} hover:scale-101 hover:shadow-md`,
                "hover:cursor-pointer"
              )}
              onClick={() => handleEmployeeSelect(employee.value)}
            >
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                  <div className={cn(
                    "p-2 sm:p-3 rounded-full transition-all duration-200",
                    isSelected
                      ? "bg-white bg-opacity-20 shadow-lg"
                      : isUnselected
                        ? "bg-gray-200"
                        : "bg-white shadow-sm"
                  )}>
                    <User className={cn(
                      "h-6 w-6 sm:h-8 sm:w-8 transition-colors duration-200",
                      isSelected
                        ? "text-white"
                        : isUnselected
                          ? "text-gray-400"
                          : "text-gray-600"
                    )} />
                  </div>
                  <div className="text-center">
                    <span className={cn(
                      "font-semibold text-base sm:text-lg transition-colors duration-200",
                      isSelected
                        ? "text-white"
                        : isUnselected
                          ? "text-gray-400"
                          : "text-gray-800"
                    )}>
                      {employee.label}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Other Option */}
      <Card
        className={cn(
          "border-2 transition-all duration-200 transform",
          (value && !employees.some(emp => emp.value === value))
            ? "bg-gradient-to-br from-gray-500 to-gray-600 text-white scale-102 shadow-lg ring-2 ring-gray-300"
            : (value && employees.some(emp => emp.value === value))
              ? "opacity-40 grayscale-20 scale-95"
              : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:scale-101 hover:shadow-md",
          "cursor-pointer"
        )}
        onClick={() => {
          // Focus the input when card is clicked
          const input = document.getElementById('other-employee-input') as HTMLInputElement
          if (input) input.focus()
        }}
      >
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className={cn(
              "p-2 sm:p-3 rounded-full flex-shrink-0 transition-all duration-200",
              (value && !employees.some(emp => emp.value === value))
                ? "bg-white bg-opacity-20 shadow-lg"
                : (value && employees.some(emp => emp.value === value))
                  ? "bg-gray-200"
                  : "bg-white shadow-sm"
            )}>
              <PenSquare className={cn(
                "h-6 w-6 sm:h-8 sm:w-8 transition-colors duration-200",
                (value && !employees.some(emp => emp.value === value))
                  ? "text-white"
                  : (value && employees.some(emp => emp.value === value))
                    ? "text-gray-400"
                    : "text-gray-600"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <Input
                id="other-employee-input"
                placeholder="Enter your name..."
                value={otherName}
                onChange={(e) => handleOtherNameChange(e.target.value)}
                className={cn(
                  "border-0 focus-visible:ring-0 bg-transparent p-0 text-base sm:text-lg font-semibold placeholder:text-opacity-70",
                  (value && !employees.some(emp => emp.value === value))
                    ? "text-white placeholder:text-white"
                    : (value && employees.some(emp => emp.value === value))
                      ? "text-gray-400 placeholder:text-gray-400"
                      : "text-gray-800 placeholder:text-gray-500"
                )}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  )
}