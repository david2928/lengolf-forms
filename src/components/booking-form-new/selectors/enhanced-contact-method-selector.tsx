'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { 
  MessageCircle, 
  PersonStanding, 
  Phone, 
  MessageSquare, 
  Instagram,
  Globe,
  Dumbbell,
  PenSquare
} from "lucide-react"

interface EnhancedContactMethodSelectorProps {
  value: string | null
  onChange: (value: string) => void
  error?: string
}

export function EnhancedContactMethodSelector({
  value,
  onChange,
  error
}: EnhancedContactMethodSelectorProps) {
  // Primary contact methods (prioritized)
  const primaryMethods = [
    { value: 'LINE', label: 'LINE', icon: MessageCircle, gradient: 'from-green-500 to-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    { value: 'Walk-in', label: 'Walk-in', icon: PersonStanding, gradient: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { value: 'Phone', label: 'Phone', icon: Phone, gradient: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  ]

  // Secondary contact methods
  const secondaryMethods = [
    { value: 'Whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { value: 'Instagram/Facebook', label: 'Instagram/Facebook', icon: Instagram },
    { value: 'Website / ResOS', label: 'Website/ResOS', icon: Globe },
    { value: 'ClassPass', label: 'ClassPass', icon: Dumbbell },
  ]

  const handleMethodSelect = (methodValue: string) => {
    onChange(methodValue)
  }

  return (
    <div className="space-y-6">
      {/* Primary Methods - Large Cards */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {primaryMethods.map((method) => {
            const Icon = method.icon
            const isSelected = value === method.value
            const isUnselected = value && value !== method.value && !secondaryMethods.some(m => m.value === value)
            
            return (
              <Card
                key={method.value}
                className={cn(
                  "cursor-pointer transition-all duration-200 border-2 transform h-24",
                  isSelected 
                    ? `bg-gradient-to-br ${method.gradient} text-white scale-102 shadow-lg ring-2 ring-white ring-opacity-60` 
                    : isUnselected
                      ? "opacity-50 grayscale-20 scale-95"
                      : `${method.bgColor} ${method.borderColor} hover:scale-101 hover:shadow-md`,
                  "hover:cursor-pointer"
                )}
                onClick={() => handleMethodSelect(method.value)}
              >
                <CardContent className="p-4 h-full">
                  <div className="flex items-center space-x-4 h-full">
                    <div className={cn(
                      "p-3 rounded-full transition-all duration-200 flex-shrink-0",
                      isSelected 
                        ? "bg-white bg-opacity-20 shadow-lg" 
                        : isUnselected
                          ? "bg-gray-200"
                          : "bg-white shadow-sm"
                    )}>
                      <Icon className={cn(
                        "h-6 w-6 transition-colors duration-200",
                        isSelected 
                          ? "text-white" 
                          : isUnselected
                            ? "text-gray-400"
                            : "text-gray-600"
                      )} />
                    </div>
                    <div className="flex-1">
                      <span className={cn(
                        "font-semibold text-lg transition-colors duration-200",
                        isSelected 
                          ? "text-white" 
                          : isUnselected
                            ? "text-gray-400"
                            : "text-gray-800"
                      )}>
                        {method.label}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Secondary Methods - Small Badges */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {secondaryMethods.map((method) => {
            const Icon = method.icon
            const isSelected = value === method.value
            const isUnselected = value && value !== method.value && !primaryMethods.some(m => m.value === value)
            
            return (
              <Badge
                key={method.value}
                variant={isSelected ? "default" : "secondary"}
                className={cn(
                  "cursor-pointer transition-all duration-200 px-4 py-3 text-sm font-medium transform",
                  isSelected 
                    ? "bg-gray-800 text-white scale-105 shadow-md" 
                    : isUnselected
                      ? "opacity-50 grayscale-20 scale-95 bg-gray-100 text-gray-400"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102",
                  "hover:cursor-pointer"
                )}
                onClick={() => handleMethodSelect(method.value)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {method.label}
              </Badge>
            )
          })}
        </div>
      </div>


      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  )
}