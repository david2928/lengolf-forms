'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { User, Star, Sun, Users } from "lucide-react"

interface EnhancedCoachSelectorProps {
  value: string | null
  onChange: (value: string) => void
  error?: string
  availableCoaches?: string[] // If limited by package
  autoSelected?: boolean
  packageName?: string
}

export function EnhancedCoachSelector({
  value,
  onChange,
  error,
  availableCoaches,
  autoSelected = false,
  packageName
}: EnhancedCoachSelectorProps) {
  const allCoaches = [
    {
      value: 'Boss',
      label: 'Boss',
      initials: 'B',
      gradient: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      value: 'Boss - Ratchavin',
      label: 'Ratchavin',
      initials: 'R',
      gradient: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200'
    },
    {
      value: 'Noon',
      label: 'Noon',
      initials: 'N',
      gradient: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      value: 'Min',
      label: 'Min',
      initials: 'M',
      gradient: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200'
    },
  ]

  // Filter coaches based on availability
  const coaches = availableCoaches 
    ? allCoaches.filter(coach => availableCoaches.includes(coach.value) || availableCoaches.includes(coach.label))
    : allCoaches

  // If auto-selected, show the selected coach with special styling
  if (autoSelected && value) {
    const selectedCoach = coaches.find(coach => coach.value === value || coach.label === value) || coaches[0]
    
    return (
      <div className="space-y-4">
        <Label className="text-lg font-semibold">Coach Selection</Label>
        
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-2 border-indigo-400 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-white">{selectedCoach.initials}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-xl">{selectedCoach.label}</span>
                  <Badge variant="secondary" className="bg-white bg-opacity-20 text-white border-white border-opacity-30">
                    Auto-selected
                  </Badge>
                </div>
                {packageName && (
                  <p className="text-white text-opacity-90 text-sm mt-1">
                    From package: {packageName}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {coaches.map((coach) => {
          const isSelected = value === coach.value || value === coach.label
          const isUnselected = value && value !== coach.value && value !== coach.label
          
          return (
            <Card
              key={coach.value}
              className={cn(
                "cursor-pointer transition-all duration-200 border-2 transform min-h-[100px]",
                isSelected 
                  ? `bg-gradient-to-br ${coach.gradient} text-white scale-102 shadow-lg ring-2 ring-white ring-opacity-60` 
                  : isUnselected
                    ? "opacity-40 grayscale-20 scale-95"
                    : `${coach.bgColor} ${coach.borderColor} hover:scale-101 hover:shadow-md`,
                "hover:cursor-pointer"
              )}
              onClick={() => onChange(coach.value)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center space-y-3 h-full">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
                    isSelected 
                      ? "bg-white bg-opacity-20 shadow-lg" 
                      : isUnselected
                        ? "bg-gray-200"
                        : "bg-white shadow-sm"
                  )}>
                    <span className={cn(
                      "text-lg font-bold transition-colors duration-200",
                      isSelected
                        ? "text-white"
                        : isUnselected
                          ? "text-gray-400"
                          : coach.value === 'Boss'
                            ? "text-blue-600"
                            : coach.value === 'Boss - Ratchavin'
                              ? "text-teal-600"
                              : coach.value === 'Noon'
                                ? "text-orange-600"
                                : "text-pink-600"
                    )}>
                      {coach.initials}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className={cn(
                      "font-semibold text-sm transition-colors duration-200",
                      isSelected 
                        ? "text-white" 
                        : isUnselected
                          ? "text-gray-400"
                          : "text-gray-800"
                    )}>
                      {coach.label}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Show note if coaches are limited by package */}
      {availableCoaches && availableCoaches.length < allCoaches.length && (
        <div className="text-xs text-gray-500 text-center bg-gray-50 p-2 rounded-lg">
          Only showing coaches available for your selected package
        </div>
      )}
      
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  )
}