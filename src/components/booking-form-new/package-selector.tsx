'use client'

import { Card, CardContent } from "@/components/ui/card"
import { useCustomerPackages } from "@/hooks/useCustomerPackages"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Package } from "lucide-react"

interface PackageSelectorProps {
  value: string
  customerName: string
  customerPhone?: string
  customerId?: string
  bookingType?: string | null
  onChange: (value: string | null, packageName: string) => void
  error?: string
  disabled?: boolean
  isBookingTypeAutoSelected?: boolean
}

export function PackageSelector({ 
  value,
  customerName,
  customerPhone,
  customerId,
  bookingType,
  onChange,
  error,
  disabled = false,
  isBookingTypeAutoSelected = false
}: PackageSelectorProps) {
  // Only apply filtering if booking type is manually selected, not auto-selected
  const shouldApplyBookingTypeFilter = Boolean(bookingType && !isBookingTypeAutoSelected)
  const isCoachingBooking = shouldApplyBookingTypeFilter && bookingType?.toLowerCase().includes('coaching') || false
  const isPackageBooking = shouldApplyBookingTypeFilter && bookingType === 'Package'
  
  // Include inactive packages for coaching and package bookings 
  // The database function now properly filters out only expired/used packages
  // but includes unactivated packages which can be activated on first use
  const shouldIncludeInactive = Boolean(isCoachingBooking || isPackageBooking)
  
  const { packages, isLoading, error: packagesError } = useCustomerPackages(
    customerName, 
    customerPhone,
    shouldIncludeInactive,
    customerId
  )

  if (!customerName) {
    return <div className="text-muted-foreground">Select a customer first</div>
  }

  if (isLoading) {
    return null;
  }

  if (packagesError) {
    return (
      <div className="p-4 bg-red-50 rounded">
        <div className="text-red-600">Failed to load packages:</div>
        <div className="text-sm text-red-500">{packagesError}</div>
      </div>
    )
  }

  const formatDate = (date: string) => {
    if (!date || date === 'No expiry') {
      return 'No expiry'
    }
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'No expiry'
    }
  }

  const handleValueChange = (selectedId: string) => {
    // Add undo functionality - if clicking on selected package, deselect it
    if (value === selectedId) {
      onChange(null, '') // Clear selection with null
      return
    }
    
    const selectedPackage = packages?.find(pkg => pkg.id === selectedId)
    if (selectedPackage) {
      onChange(selectedId, selectedPackage.details.packageTypeName)
    }
  }


  // Filter packages based on booking type and availability
  const filteredPackages = packages?.filter(pkg => {
    // Check if package is usable for booking
    const hasRemainingHours = pkg.details.remainingHours === null || pkg.details.remainingHours > 0
    const isUnactivated = pkg.details.firstUseDate === 'Not activated' // Can be activated on first use
    const isActivatedAndNotExpired = pkg.details.firstUseDate !== 'Not activated' && 
                                    (pkg.details.expirationDate === 'No expiry' || 
                                     new Date(pkg.details.expirationDate).getTime() >= new Date().setHours(0,0,0,0))
    
    // Package is available if it's either unactivated OR (activated + not expired + has hours)
    const isUsableForBooking = hasRemainingHours && (isUnactivated || isActivatedAndNotExpired)
    
    if (!isUsableForBooking) {
      return false
    }
    
    // Then filter by booking type
    if (isCoachingBooking) {
      // For coaching bookings, show coaching packages
      return pkg.details.packageTypeName.toLowerCase().includes('coaching')
    } else if (isPackageBooking) {
      // For package bookings, show non-coaching packages (Monthly, Unlimited)
      return !pkg.details.packageTypeName.toLowerCase().includes('coaching')
    }
    // For other booking types, show all usable packages
    return true
  }) || []

  // If no packages available, show message
  if (!filteredPackages || filteredPackages.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No available packages found for this customer.
        {error && (
          <div className="text-sm text-red-500 mt-2">
            {error}
          </div>
        )}
      </div>
    )
  }

  // If packages available, show enhanced card layout
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredPackages.map((pkg) => {
          const isSelected = value === pkg.id
          const isUnselected = value && value !== pkg.id // Add unselected logic
          const isUnactivated = pkg.details.firstUseDate === 'Not activated'
          const isCoaching = pkg.details.packageTypeName.toLowerCase().includes('coaching')
          
          return (
            <Card
              key={pkg.id}
              className={cn(
                "cursor-pointer transition-all duration-200 border-2 transform",
                disabled ? "opacity-50 cursor-not-allowed" : "",
                isSelected 
                  ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white scale-102 shadow-lg ring-2 ring-white ring-opacity-60" 
                  : isUnselected
                    ? "opacity-40 grayscale-20 scale-95" // Grey out non-selected packages
                    : isUnactivated
                      ? "border-orange-300 bg-orange-50 hover:bg-orange-100 hover:scale-101"
                      : isCoaching
                        ? "border-purple-200 bg-purple-50 hover:bg-purple-100 hover:scale-101"
                        : "border-gray-200 bg-gray-50 hover:bg-gray-100 hover:scale-101",
                !disabled && !isUnselected && "hover:shadow-md"
              )}
              onClick={() => !disabled && handleValueChange(pkg.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    "p-2 rounded-lg transition-all duration-200 flex-shrink-0 mt-1",
                    isSelected 
                      ? "bg-white bg-opacity-20 shadow-lg" 
                      : isUnselected
                        ? "bg-gray-200"
                        : isUnactivated
                          ? "bg-orange-200"
                          : isCoaching
                            ? "bg-purple-200"
                            : "bg-white shadow-sm"
                  )}>
                    <Package className={cn(
                      "h-5 w-5 transition-colors duration-200",
                      isSelected 
                        ? "text-white" 
                        : isUnselected
                          ? "text-gray-400"
                          : isUnactivated
                            ? "text-orange-600"
                            : isCoaching
                              ? "text-purple-600"
                              : "text-gray-600"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className={cn(
                        "font-semibold text-base transition-colors duration-200",
                        isSelected 
                          ? "text-white" 
                          : isUnselected
                            ? "text-gray-400"
                            : "text-gray-800"
                      )}>
                        {pkg.details.packageTypeName}
                      </h3>
                      {isUnactivated && (
                        <span className={cn(
                          "text-xs px-2 py-1 rounded font-medium",
                          isSelected
                            ? "bg-white bg-opacity-20 text-white"
                            : isUnselected
                              ? "bg-gray-200 text-gray-400"
                              : "bg-orange-100 text-orange-800"
                        )}>
                          Not Activated
                        </span>
                      )}
                    </div>
                    
                    <div className={cn(
                      "text-sm space-y-1 transition-colors duration-200",
                      isSelected 
                        ? "text-white text-opacity-90" 
                        : isUnselected
                          ? "text-gray-400"
                          : "text-gray-600"
                    )}>
                      <div>
                        <span className="font-medium">Remaining:</span>{' '}
                        {pkg.details.remainingHours ?? 'Unlimited'} hours
                      </div>
                      <div>
                        <span className="font-medium">Expires:</span>{' '}
                        {formatDate(pkg.details.expirationDate)}
                      </div>
                      {isUnactivated && (
                        <div className={cn(
                          "font-medium text-sm",
                          isSelected 
                            ? "text-white" 
                            : isUnselected
                              ? "text-gray-400"
                              : "text-orange-600"
                        )}>
                          Will be activated when used
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {error && (
        <div className="text-sm text-red-500 mt-1 text-center">
          {error}
        </div>
      )}
    </div>
  )
}