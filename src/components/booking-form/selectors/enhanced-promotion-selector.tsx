'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Gift, Users, Percent } from "lucide-react"

interface EnhancedPromotionSelectorProps {
  value: string | null
  onChange: (value: string | null) => void
  error?: string
  isNewCustomer?: boolean
}

export function EnhancedPromotionSelector({
  value,
  onChange,
  error,
  isNewCustomer = false
}: EnhancedPromotionSelectorProps) {
  
  // Available promotions
  const promotions = [
    {
      value: 'Buy 1 Get 1',
      label: 'Buy 1 Get 1',
      icon: Gift,
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      newCustomerOnly: true
    },
    {
      value: 'Student 15%',
      label: 'Student 15%',
      icon: Percent,
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      newCustomerOnly: false
    }
  ]

  // Premium club options
  const premiumClubOptions = [
    {
      value: 'Premium Club Rental',
      label: 'Premium Club Rental',
      icon: Users,
      gradient: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      newCustomerOnly: false
    }
  ]

  // Filter promotions based on customer type
  const availablePromotions = promotions.filter(promo => 
    !promo.newCustomerOnly || isNewCustomer
  )

  const allOptions = [...availablePromotions, ...premiumClubOptions]

  const handleOptionSelect = (optionValue: string) => {
    // If clicking on already selected option, deselect it
    if (value === optionValue) {
      onChange(null)
    } else {
      onChange(optionValue)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {allOptions.map((option) => {
          const Icon = option.icon
          const isSelected = value === option.value
          
          return (
            <Badge
              key={option.value}
              variant={isSelected ? "default" : "secondary"}
              className={cn(
                "cursor-pointer transition-all duration-200 px-4 py-3 text-sm font-medium transform",
                isSelected 
                  ? `bg-gradient-to-r ${option.gradient} text-white scale-105 shadow-md border-0` 
                  : `${option.bgColor} ${option.borderColor} text-gray-700 hover:scale-102 hover:shadow-sm`,
                "hover:cursor-pointer"
              )}
              onClick={() => handleOptionSelect(option.value)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {option.label}
            </Badge>
          )
        })}
      </div>

      {/* Show note about new customer promotions if applicable */}
      {!isNewCustomer && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
          Note: Some promotions are only available for new customers
        </div>
      )}

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  )
}