'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { UserPlus, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedCustomerTypeSelectorProps {
  value: boolean | null
  onChange: (value: boolean) => void
  error?: string
}

export function EnhancedCustomerTypeSelector({
  value,
  onChange,
  error
}: EnhancedCustomerTypeSelectorProps) {
  const customerTypes = [
    { 
      value: true, 
      label: 'New Customer', 
      icon: UserPlus,
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    { 
      value: false, 
      label: 'Existing Customer', 
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {customerTypes.map((type) => {
          const Icon = type.icon
          const isSelected = value === type.value
          const isUnselected = value !== null && value !== type.value
          
          return (
            <Card
              key={type.label}
              className={cn(
                "cursor-pointer transition-all duration-200 border-2 transform min-h-[140px]",
                isSelected 
                  ? `bg-gradient-to-br ${type.gradient} text-white scale-102 shadow-lg ring-2 ring-white ring-opacity-60` 
                  : isUnselected
                    ? "opacity-40 grayscale-20 scale-95"
                    : `${type.bgColor} ${type.borderColor} hover:scale-101 hover:shadow-md`,
                "hover:cursor-pointer"
              )}
              onClick={() => onChange(type.value)}
            >
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={cn(
                    "p-4 rounded-full transition-all duration-200",
                    isSelected 
                      ? "bg-white bg-opacity-20 shadow-lg" 
                      : isUnselected
                        ? "bg-gray-200"
                        : "bg-white shadow-sm"
                  )}>
                    <Icon className={cn(
                      "h-10 w-10 transition-colors duration-200",
                      isSelected 
                        ? "text-white" 
                        : isUnselected
                          ? "text-gray-400"
                          : type.value ? "text-green-600" : "text-blue-600"
                    )} />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className={cn(
                      "font-semibold text-xl transition-colors duration-200",
                      isSelected 
                        ? "text-white" 
                        : isUnselected
                          ? "text-gray-400"
                          : "text-gray-800"
                    )}>
                      {type.label}
                    </h3>
                  </div>
                  
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  )
}