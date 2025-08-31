'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Package, Users, Clock, Calendar, Dumbbell, Sparkles } from "lucide-react"

interface EnhancedBookingTypeSelectorProps {
  value: string | null
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  autoSelected?: boolean // When auto-detected from package
  packageName?: string // For display when auto-selected
  hasSelectedPackage?: boolean // Whether there's actually a package selected
}

export function EnhancedBookingTypeSelector({
  value,
  onChange,
  error,
  disabled = false,
  autoSelected = false,
  packageName,
  hasSelectedPackage = false
}: EnhancedBookingTypeSelectorProps) {

  const primaryBookingTypes = [
    { 
      value: 'Package', 
      label: 'Package', 
      icon: Package, 
      gradient: 'from-blue-500 to-blue-600', 
      bgColor: 'bg-blue-50', 
      borderColor: 'border-blue-200' 
    },
    { 
      value: 'Coaching', 
      label: 'Coaching', 
      icon: Users, 
      gradient: 'from-orange-500 to-orange-600', 
      bgColor: 'bg-orange-50', 
      borderColor: 'border-orange-200' 
    },
    { 
      value: 'Normal Bay Rate', 
      label: 'Normal Bay Rate', 
      icon: Clock, 
      gradient: 'from-green-500 to-green-600', 
      bgColor: 'bg-green-50', 
      borderColor: 'border-green-200' 
    },
  ]

  const secondaryBookingTypes = [
    { 
      value: 'ClassPass', 
      label: 'ClassPass', 
      icon: Dumbbell, 
      gradient: 'from-gray-500 to-gray-600', 
      bgColor: 'bg-gray-50', 
      borderColor: 'border-gray-200' 
    },
    { 
      value: 'Others (e.g. Events)', 
      label: 'Events & Others', 
      icon: Calendar, 
      gradient: 'from-gray-500 to-gray-600', 
      bgColor: 'bg-gray-50', 
      borderColor: 'border-gray-200' 
    },
  ]

  const allBookingTypes = [...primaryBookingTypes, ...secondaryBookingTypes]

  const handleTypeSelect = (typeValue: string) => {
    if (disabled && !autoSelected) return
    // Add undo functionality - if clicking on selected type, deselect it
    if (value === typeValue) {
      onChange('')  // Clear selection
    } else {
      onChange(typeValue)
    }
  }


  // If auto-selected AND there's actually a package selected, show the auto-selected card
  if (autoSelected && value && hasSelectedPackage) {
    const selectedType = allBookingTypes.find(type => type.value === value) || {
      value,
      label: value,
      icon: Sparkles,
      gradient: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    }

    return (
      <div className="space-y-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-2 border-indigo-400 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-xl">{selectedType.label}</span>
                  <Badge variant="secondary" className="bg-white bg-opacity-20 text-white border-white border-opacity-30">
                    Auto-selected
                  </Badge>
                </div>
                <p className="text-white text-opacity-90 text-sm mt-1">
                  {packageName ? `Auto-selected from package: ${packageName}` : 'Auto-selected from package'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      
      {/* Primary booking types - large cards */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {primaryBookingTypes.map((type) => {
            const Icon = type.icon
            const isSelected = value === type.value
            const isUnselected = value && value !== type.value
            
            return (
              <Card
                key={type.value}
                className={cn(
                  "cursor-pointer transition-all duration-200 border-2 transform h-24",
                  disabled && !isSelected ? "opacity-30 cursor-not-allowed" : "",
                  isSelected 
                    ? `bg-gradient-to-br ${type.gradient} text-white scale-102 shadow-lg ring-2 ring-white ring-opacity-60` 
                    : isUnselected
                      ? "opacity-50 grayscale-20 scale-95"
                      : `${type.bgColor} ${type.borderColor} hover:scale-101 hover:shadow-md`,
                  disabled && !isSelected ? "" : "hover:cursor-pointer"
                )}
                onClick={() => handleTypeSelect(type.value)}
              >
                <CardContent className="p-4 h-full">
                  <div className="flex items-center space-x-4 h-full">
                    <div className={cn(
                      "p-3 rounded-full transition-all duration-200 flex-shrink-0",
                      isSelected 
                        ? "bg-white bg-opacity-20 shadow-lg" 
                        : isUnselected || (disabled && !isSelected)
                          ? "bg-gray-200"
                          : "bg-white shadow-sm"
                    )}>
                      <Icon className={cn(
                        "h-6 w-6 transition-colors duration-200",
                        isSelected 
                          ? "text-white" 
                          : isUnselected || (disabled && !isSelected)
                            ? "text-gray-400"
                            : "text-gray-600"
                      )} />
                    </div>
                    <div className="flex-1">
                      <span className={cn(
                        "font-semibold text-lg transition-colors duration-200",
                        isSelected 
                          ? "text-white" 
                          : isUnselected || (disabled && !isSelected)
                            ? "text-gray-400"
                            : "text-gray-800"
                      )}>
                        {type.label}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
      
      {/* Secondary booking types - badge style */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {secondaryBookingTypes.map((type) => {
            const Icon = type.icon
            const isSelected = value === type.value
            const isUnselected = value && value !== type.value && !primaryBookingTypes.some(p => p.value === value)
            
            return (
              <Badge
                key={type.value}
                variant={isSelected ? "default" : "secondary"}
                className={cn(
                  "cursor-pointer transition-all duration-200 px-4 py-3 text-sm font-medium transform",
                  disabled && !isSelected ? "opacity-30 cursor-not-allowed" : "",
                  isSelected 
                    ? "bg-gray-800 text-white scale-105 shadow-md" 
                    : isUnselected || (disabled && !isSelected)
                      ? "opacity-50 grayscale-20 scale-95 bg-gray-100 text-gray-400"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102",
                  disabled && !isSelected ? "" : "hover:cursor-pointer"
                )}
                onClick={() => !disabled && handleTypeSelect(type.value)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {type.label}
              </Badge>
            )
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  )
}